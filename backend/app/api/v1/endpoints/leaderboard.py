from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.models.activity import Activity
from app.schemas.analytics import LeaderboardEntry
from app.schemas.common import APIResponse
from app.services.gamification_service import GamificationService

router = APIRouter(prefix="/leaderboard", tags=["Faction Leaderboards & Seasons"])


@router.get("/season", response_model=APIResponse[dict])
async def get_active_season(db: AsyncSession = Depends(get_db)):
    """
    Returns active competitive season parameters, countdown timer, and reward XP.
    """
    season_info = await GamificationService.get_or_create_active_season(db)
    return APIResponse(
        success=True,
        message="Active season details retrieved",
        data=season_info,
    )


@router.get("/factions", response_model=APIResponse[List[dict]])
async def get_faction_standings(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns dynamic faction dominance breakdown aggregated from real user territories.
    """
    user_color = current_user.faction_color if current_user else None
    standings = await GamificationService.compute_faction_standings(db, current_user_color=user_color)
    return APIResponse(
        success=True,
        message="Faction standings retrieved",
        data=standings,
    )


@router.get("/territory", response_model=APIResponse[List[LeaderboardEntry]])
async def get_territory_leaderboard(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Ranks runners globally by captured territory in km^2, with dynamically computed levels and XP.
    """
    query = (
        select(User)
        .where(and_(User.is_active == True, User.is_deleted == False))
        .order_by(desc(User.total_territory_km2))
        .limit(limit)
    )
    result = await db.execute(query)
    users = result.scalars().all()

    leaderboard: List[LeaderboardEntry] = []
    for rank, u in enumerate(users, start=1):
        # Fetch activity count for XP formula
        act_res = await db.execute(select(func.count(Activity.id)).where(Activity.user_id == u.id))
        act_count = act_res.scalar() or 0

        computed_xp, computed_level = GamificationService.calculate_xp_and_level(
            total_distance_km=u.total_distance_km or 0.0,
            total_territory_km2=u.total_territory_km2 or 0.0,
            activities_count=act_count,
        )

        leaderboard.append(
            LeaderboardEntry(
                rank=rank,
                user_id=u.id,
                username=u.username,
                avatar_url=u.avatar_url,
                faction_color=u.faction_color or "#B8492E",
                total_territory_km2=round(u.total_territory_km2 or 0.0, 3),
                total_distance_km=round(u.total_distance_km or 0.0, 2),
                level=computed_level,
                xp=computed_xp,
            )
        )

    return APIResponse(
        success=True,
        message="Territory leaderboard retrieved",
        data=leaderboard,
    )


@router.get("/distance", response_model=APIResponse[List[LeaderboardEntry]])
async def get_distance_leaderboard(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Ranks runners globally by total distance run in km, with dynamically computed levels and XP.
    """
    query = (
        select(User)
        .where(and_(User.is_active == True, User.is_deleted == False))
        .order_by(desc(User.total_distance_km))
        .limit(limit)
    )
    result = await db.execute(query)
    users = result.scalars().all()

    leaderboard: List[LeaderboardEntry] = []
    for rank, u in enumerate(users, start=1):
        act_res = await db.execute(select(func.count(Activity.id)).where(Activity.user_id == u.id))
        act_count = act_res.scalar() or 0

        computed_xp, computed_level = GamificationService.calculate_xp_and_level(
            total_distance_km=u.total_distance_km or 0.0,
            total_territory_km2=u.total_territory_km2 or 0.0,
            activities_count=act_count,
        )

        leaderboard.append(
            LeaderboardEntry(
                rank=rank,
                user_id=u.id,
                username=u.username,
                avatar_url=u.avatar_url,
                faction_color=u.faction_color or "#B8492E",
                total_territory_km2=round(u.total_territory_km2 or 0.0, 3),
                total_distance_km=round(u.total_distance_km or 0.0, 2),
                level=computed_level,
                xp=computed_xp,
            )
        )

    return APIResponse(
        success=True,
        message="Distance leaderboard retrieved",
        data=leaderboard,
    )
