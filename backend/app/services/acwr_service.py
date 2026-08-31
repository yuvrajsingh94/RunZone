from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.activity import Activity
from app.models.daily_metric import DailyMetric
from app.schemas.analytics import ACWRDashboardSummary, ACWRMetricPoint


class ACWRService:
    @staticmethod
    def calculate_activity_workload(
        duration_seconds: int,
        rpe_score: int,
        avg_heart_rate: int = None,
        resting_hr: int = 60,
        max_hr: int = 190,
    ) -> float:
        """
        Calculate training load / workload for an activity.
        Uses TRIMP (Training Impulse) when HR is present, or Foster Session-RPE otherwise.
        """
        duration_minutes = duration_seconds / 60.0
        
        if avg_heart_rate and avg_heart_rate > resting_hr and max_hr > resting_hr:
            # HR reserve fraction
            hr_ratio = (avg_heart_rate - resting_hr) / (max_hr - resting_hr)
            hr_ratio = max(0.1, min(1.0, hr_ratio))
            # Banister's TRIMP formula: duration * HRr * 0.64 * e^(1.92 * HRr)
            import math
            trimp = duration_minutes * hr_ratio * 0.64 * math.exp(1.92 * hr_ratio)
            return round(trimp, 2)
        else:
            # Session-RPE: Duration (min) * RPE (1-10)
            return round(duration_minutes * (rpe_score or 5), 2)

    @classmethod
    def classify_injury_risk(cls, acwr: float) -> Tuple[str, int, str]:
        """
        Classify ACWR index according to Tim Gabbett's sports science model:
        Returns: (risk_category, injury_risk_percentage, recommendation_badge)
        """
        if acwr < 0.8:
            return (
                "Under-training",
                25,
                "Safe to build volume (gradually increase weekly mileage)"
            )
        elif 0.8 <= acwr <= 1.3:
            return (
                "Optimal (Sweet Spot)",
                12,
                "Optimal Training Zone (minimal injury risk, peak fitness gain)"
            )
        elif 1.3 < acwr <= 1.5:
            return (
                "High Alert (Overreaching)",
                55,
                "Caution: Workload spike detected. Prioritize sleep & recovery runs"
            )
        else:  # acwr > 1.5
            return (
                "Danger Zone (Injury Risk Spike)",
                88,
                "Warning: 2-4x higher risk of soft-tissue injury. Schedule active rest day"
            )

    @classmethod
    async def compute_user_acwr(cls, db: AsyncSession, user_id: int) -> ACWRDashboardSummary:
        """
        Computes the complete 7-day Acute vs 28-day Chronic Workload matrix and weekly history.
        """
        today = datetime.now(timezone.utc).date()
        start_28d = today - timedelta(days=28)

        # Query all activities in the last 28 days
        query = select(Activity).where(
            and_(
                Activity.user_id == user_id,
                Activity.started_at >= datetime.combine(start_28d, datetime.min.time(), tzinfo=timezone.utc),
            )
        ).order_by(Activity.started_at.asc())
        
        result = await db.execute(query)
        activities = result.scalars().all()

        # Aggregate daily workloads and distances
        daily_loads: Dict[date, float] = {start_28d + timedelta(days=i): 0.0 for i in range(29)}
        daily_distances: Dict[date, float] = {start_28d + timedelta(days=i): 0.0 for i in range(29)}

        for act in activities:
            act_date = act.started_at.date()
            if act_date in daily_loads:
                daily_loads[act_date] += (act.workload_score or (act.duration_seconds / 60.0 * act.rpe_score))
                daily_distances[act_date] += (act.distance_meters / 1000.0)

        # 7-day Acute Load = sum of past 7 days (today - 6 to today)
        past_7_days = [today - timedelta(days=i) for i in range(7)]
        acute_load_7d = sum(daily_loads.get(d, 0.0) for d in past_7_days)
        total_dist_7d = sum(daily_distances.get(d, 0.0) for d in past_7_days)

        # 28-day Chronic Load = average 7-day equivalent over 28 days (sum of 28 days / 4)
        past_28_days = [today - timedelta(days=i) for i in range(28)]
        total_load_28d = sum(daily_loads.get(d, 0.0) for d in past_28_days)
        total_dist_28d = sum(daily_distances.get(d, 0.0) for d in past_28_days)
        chronic_load_28d = max(10.0, total_load_28d / 4.0)  # avoid division by zero

        # ACWR Ratio
        acwr_ratio = round(acute_load_7d / chronic_load_28d, 2) if chronic_load_28d > 0 else 1.0
        risk_cat, risk_pct, badge = cls.classify_injury_risk(acwr_ratio)

        # Generate 14-day trailing timeline for Recharts visual
        history_points: List[ACWRMetricPoint] = []
        for i in range(13, -1, -1):
            day = today - timedelta(days=i)
            # 7-day acute ending on this day
            day_7 = [day - timedelta(days=j) for j in range(7)]
            day_acute = sum(daily_loads.get(d, 0.0) for d in day_7)
            # 28-day chronic ending on this day
            day_28 = [day - timedelta(days=j) for j in range(28)]
            day_chronic = max(10.0, sum(daily_loads.get(d, 0.0) for d in day_28) / 4.0)
            day_acwr = round(day_acute / day_chronic, 2)
            day_risk, _, _ = cls.classify_injury_risk(day_acwr)

            history_points.append(
                ACWRMetricPoint(
                    date=day,
                    acute_load=round(day_acute, 1),
                    chronic_load=round(day_chronic, 1),
                    acwr_ratio=day_acwr,
                    distance_km=round(daily_distances.get(day, 0.0), 2),
                    risk_category=day_risk,
                )
            )

        return ACWRDashboardSummary(
            current_acwr=acwr_ratio,
            current_risk_category=risk_cat,
            acute_workload_7d=round(acute_load_7d, 1),
            chronic_workload_28d=round(chronic_load_28d, 1),
            total_distance_7d_km=round(total_dist_7d, 2),
            total_distance_28d_km=round(total_dist_28d, 2),
            injury_risk_percentage=risk_pct,
            recommendation_badge=badge,
            weekly_history=history_points,
        )
