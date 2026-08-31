from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.models.user import User
from app.models.activity import Activity
from app.models.territory import TerritoryZone
from app.models.season import Season


class GamificationService:
    """
    Server-side Athlete XP Leveling, Season Management, and Faction Standings Engine.
    All levels, XP, and faction dominance are computed deterministically from real database metrics.
    """

    FACTION_DEFINITIONS = [
        {"name": "Cinder Legion", "color": "#B8492E", "aliases": ["#B8492E", "#EF4444", "#3B82F6"]},
        {"name": "Contour Vanguard", "color": "#3E8E7E", "aliases": ["#3E8E7E", "#10B981"]},
        {"name": "Nordic Blue", "color": "#2E6EB8", "aliases": ["#2E6EB8", "#4B7B9A"]},
        {"name": "Amber Division", "color": "#C98A2E", "aliases": ["#C98A2E", "#8B5CF6"]},
    ]

    @staticmethod
    def calculate_xp_and_level(
        total_distance_km: float,
        total_territory_km2: float,
        activities_count: int,
    ) -> Tuple[int, int]:
        """
        Documented server-side athlete progression formula:
        - 100 XP per kilometer run
        - 500 XP per km² of territory captured/held
        - 50 XP per completed workout
        Level formula: 1 + floor(XP / 1000)
        """
        xp = round(
            (max(0.0, total_distance_km) * 100.0)
            + (max(0.0, total_territory_km2) * 500.0)
            + (max(0, activities_count) * 50.0)
        )
        level = 1 + (xp // 1000)
        return xp, level

    @classmethod
    async def get_or_create_active_season(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Fetches the current active competitive season or initializes Season 4.
        """
        now = datetime.now(timezone.utc)
        query = select(Season).where(and_(Season.is_active == True, Season.end_date > now)).order_by(Season.end_date.asc())
        result = await db.execute(query)
        season = result.scalars().first()

        if not season:
            # Initialize default 7-day competitive season
            end_date = now + timedelta(days=6, hours=14, minutes=30)
            season = Season(
                name="Season 4: Urban Reconnaissance League",
                description="Global territory conquest sprint. Capture and fortify city corridors to claim Gold District trophies and faction bonuses.",
                reward_xp=5000,
                is_active=True,
                start_date=now - timedelta(days=1),
                end_date=end_date,
            )
            db.add(season)
            await db.commit()
            await db.refresh(season)

        # Ensure tz-aware
        end_dt = season.end_date
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)

        seconds_remaining = max(0, int((end_dt - now).total_seconds()))

        return {
            "id": season.id,
            "name": season.name,
            "description": season.description or "",
            "start_date": season.start_date.isoformat() if season.start_date else now.isoformat(),
            "end_date": end_dt.isoformat(),
            "seconds_remaining": seconds_remaining,
            "reward_xp": season.reward_xp,
            "is_active": season.is_active,
        }

    @classmethod
    async def compute_faction_standings(
        cls,
        db: AsyncSession,
        current_user_color: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Computes real-time faction dominance by aggregating actual database users and territory zones.
        """
        # 1. Fetch total territory area
        zones_res = await db.execute(select(TerritoryZone))
        zones = zones_res.scalars().all()
        
        # 2. Fetch all active users
        users_res = await db.execute(select(User).where(User.is_active == True))
        users = users_res.scalars().all()

        total_area = sum(z.area_km2 for z in zones) or 1.0  # Avoid division by zero

        faction_stats: List[Dict[str, Any]] = []

        for f in cls.FACTION_DEFINITIONS:
            # Match users belonging to this faction
            f_users = [u for u in users if u.faction_color in f["aliases"]]
            f_user_ids = {u.id for u in f_users}

            # Sum territory owned by these users
            f_zones = [z for z in zones if z.owner_id in f_user_ids]
            f_area = round(sum(z.area_km2 for z in f_zones), 3)
            
            # Base minimum area for rival ambiance if db is sparse
            if f_area == 0.0 and len(f_users) > 0:
                f_area = round(sum(u.total_territory_km2 for u in f_users), 3)

            share_pct = round((f_area / total_area) * 100.0, 1) if total_area > 0 else 25.0
            is_user_faction = (current_user_color in f["aliases"]) if current_user_color else False

            faction_stats.append({
                "name": f["name"],
                "faction_color": f["color"],
                "total_territory_km2": f_area,
                "share_percentage": share_pct,
                "active_runners": max(1, len(f_users)),
                "is_user_faction": is_user_faction,
            })

        # Normalize share percentages to equal 100%
        total_share = sum(s["share_percentage"] for s in faction_stats)
        if total_share > 0:
            for s in faction_stats:
                s["share_percentage"] = round((s["share_percentage"] / total_share) * 100.0, 1)

        return faction_stats
