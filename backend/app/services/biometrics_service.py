from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.daily_metric import DailyMetric
from app.models.user import User
from app.schemas.analytics import (
    BiometricEntryCreate,
    BiometricDayResponse,
    BiometricsDashboardResponse,
)


class BiometricsService:
    """
    Scientific Autonomic Recovery & Readiness Engine.
    Computes daily readiness index from Heart Rate Variability (rMSSD ms),
    Resting Heart Rate (bpm), and Sleep Architecture metrics.
    """

    @staticmethod
    def compute_readiness_score(
        hrv_rmssd: Optional[float],
        hrv_baseline: float = 64.0,
        resting_hr: Optional[int] = None,
        rhr_baseline: int = 52,
        sleep_hours: Optional[float] = None,
        sleep_quality: Optional[int] = 85,
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Documented sports physiology composite readiness formula:
        - HRV Score (40%): Deviations from chronic 64ms baseline.
        - Resting HR Score (30%): Morning resting pulse deviations from baseline.
        - Sleep Score (30%): Sleep hours relative to 8h standard adjusted by quality.
        """
        if hrv_rmssd is None and resting_hr is None and sleep_hours is None:
            return None, None

        # 1. HRV Score: +15ms above baseline = 100%, -15ms below = 25%
        if hrv_rmssd is not None:
            hrv_diff = hrv_rmssd - hrv_baseline
            hrv_score = max(0.0, min(100.0, 50.0 + (hrv_diff / 15.0) * 25.0))
        else:
            hrv_score = 50.0

        # 2. Resting HR Score: -5bpm below baseline = 100%, +5bpm elevation = 25%
        if resting_hr is not None:
            rhr_diff = rhr_baseline - resting_hr
            rhr_score = max(0.0, min(100.0, 50.0 + (rhr_diff / 5.0) * 25.0))
        else:
            rhr_score = 50.0

        # 3. Sleep Score: 8h @ 100% quality = 100%
        if sleep_hours is not None:
            quality = float(sleep_quality if sleep_quality is not None else 80)
            sleep_score = max(0.0, min(100.0, (sleep_hours / 8.0) * quality))
        else:
            sleep_score = 50.0

        composite = round(0.40 * hrv_score + 0.30 * rhr_score + 0.30 * sleep_score)
        composite = max(1, min(100, composite))

        if composite >= 80:
            category = "Primed for High Load"
        elif composite >= 60:
            category = "Optimal Aerobic Base"
        else:
            category = "Parasympathetic Strain / Rest Mandated"

        return composite, category

    @classmethod
    async def get_user_biometrics(
        cls,
        db: AsyncSession,
        user_id: int,
        days: int = 7,
    ) -> BiometricsDashboardResponse:
        """
        Fetches genuine recorded biometric telemetry for the athlete over the last N days.
        If no data exists in the database, returns has_data=False and empty history.
        """
        # Fetch user baseline resting HR
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        rhr_baseline = user.resting_hr if user and user.resting_hr else 52
        hrv_baseline = 64.0  # Standard adult athletic baseline

        start_date = date.today() - timedelta(days=days - 1)
        query = (
            select(DailyMetric)
            .where(
                and_(
                    DailyMetric.user_id == user_id,
                    DailyMetric.metric_date >= start_date,
                    (
                        (DailyMetric.hrv_rmssd != None)
                        | (DailyMetric.resting_hr != None)
                        | (DailyMetric.sleep_hours != None)
                    ),
                )
            )
            .order_by(DailyMetric.metric_date.asc())
        )

        result = await db.execute(query)
        records = result.scalars().all()

        if not records:
            return BiometricsDashboardResponse(
                has_data=False,
                current_readiness_score=None,
                current_readiness_category=None,
                history=[],
            )

        history: List[BiometricDayResponse] = []
        for rec in records:
            day_str = rec.metric_date.strftime("%a")
            date_str = rec.metric_date.strftime("%b %d")
            history.append(
                BiometricDayResponse(
                    date=date_str,
                    day_name=day_str,
                    hrv_rmssd=rec.hrv_rmssd,
                    hrv_baseline=hrv_baseline,
                    resting_hr=rec.resting_hr,
                    rhr_baseline=rhr_baseline,
                    sleep_hours=rec.sleep_hours,
                    sleep_quality=rec.sleep_quality,
                    readiness_score=rec.readiness_score,
                    readiness_category=rec.readiness_category,
                    glycogen_restored=min(100, max(40, round((rec.readiness_score or 75) * 1.05))) if rec.readiness_score else None,
                )
            )

        # Most recent record represents current daily state
        latest = records[-1]

        return BiometricsDashboardResponse(
            has_data=True,
            current_readiness_score=latest.readiness_score,
            current_readiness_category=latest.readiness_category,
            current_hrv_rmssd=latest.hrv_rmssd,
            current_resting_hr=latest.resting_hr,
            current_sleep_hours=latest.sleep_hours,
            current_sleep_quality=latest.sleep_quality,
            history=history,
        )

    @classmethod
    async def log_biometrics(
        cls,
        db: AsyncSession,
        user_id: int,
        payload: BiometricEntryCreate,
    ) -> BiometricDayResponse:
        """
        Persists manual or wearable biometric entry into database and calculates readiness score.
        """
        entry_date = payload.metric_date or date.today()

        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        rhr_baseline = user.resting_hr if user and user.resting_hr else 52
        hrv_baseline = 64.0

        score, category = cls.compute_readiness_score(
            hrv_rmssd=payload.hrv_rmssd,
            hrv_baseline=hrv_baseline,
            resting_hr=payload.resting_hr,
            rhr_baseline=rhr_baseline,
            sleep_hours=payload.sleep_hours,
            sleep_quality=payload.sleep_quality,
        )

        # Upsert into DailyMetric
        query = select(DailyMetric).where(
            and_(
                DailyMetric.user_id == user_id,
                DailyMetric.metric_date == entry_date,
            )
        )
        res = await db.execute(query)
        metric = res.scalar_one_or_none()

        if not metric:
            metric = DailyMetric(
                user_id=user_id,
                metric_date=entry_date,
            )
            db.add(metric)

        metric.hrv_rmssd = payload.hrv_rmssd
        metric.resting_hr = payload.resting_hr
        metric.sleep_hours = payload.sleep_hours
        metric.sleep_quality = payload.sleep_quality
        metric.readiness_score = score
        metric.readiness_category = category

        await db.commit()
        await db.refresh(metric)

        return BiometricDayResponse(
            date=metric.metric_date.strftime("%b %d"),
            day_name=metric.metric_date.strftime("%a"),
            hrv_rmssd=metric.hrv_rmssd,
            hrv_baseline=hrv_baseline,
            resting_hr=metric.resting_hr,
            rhr_baseline=rhr_baseline,
            sleep_hours=metric.sleep_hours,
            sleep_quality=metric.sleep_quality,
            readiness_score=metric.readiness_score,
            readiness_category=metric.readiness_category,
            glycogen_restored=min(100, max(40, round((metric.readiness_score or 75) * 1.05))) if metric.readiness_score else None,
        )
