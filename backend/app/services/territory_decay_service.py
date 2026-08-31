from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.territory import TerritoryZone
from app.core.websockets import ws_manager
from app.core.database import AsyncSessionLocal


class TerritoryDecayService:
    """
    Automated Sector Decay Engine.
    Sectors unrun for >7 days lose 15 defense points per day.
    When defense points reach 0, the sector loses its owner and becomes neutral/contestable.
    """

    DECAY_GRACE_PERIOD_DAYS = 7
    DECAY_RATE_PER_DAY = 15

    @classmethod
    def calculate_decay(
        cls,
        updated_at: datetime,
        current_defense: int = 100,
        now: Optional[datetime] = None,
    ) -> Tuple[int, bool]:
        """
        Pure mathematical decay calculator:
        - <= 7 days: 0 decay.
        - > 7 days: 15 points deducted per full day elapsed past the 7-day grace threshold.
        Returns (new_defense_points, has_decayed).
        """
        current_time = now or datetime.now(timezone.utc)
        
        # Ensure timezone-aware comparison
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        elapsed_seconds = (current_time - updated_at).total_seconds()
        elapsed_days = elapsed_seconds / 86400.0

        if elapsed_days < cls.DECAY_GRACE_PERIOD_DAYS:
            return current_defense, False

        days_past_grace = int(elapsed_days - cls.DECAY_GRACE_PERIOD_DAYS) + 1
        decay_amount = days_past_grace * cls.DECAY_RATE_PER_DAY
        new_defense = max(0, current_defense - decay_amount)

        has_changed = new_defense != current_defense
        return new_defense, has_changed

    @classmethod
    async def process_all_territories_decay(
        cls,
        db: AsyncSession,
        now: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes daily decay sweep across all claimed territories.
        Emits real-time WebSocket events for all modified or neutral sectors.
        """
        current_time = now or datetime.now(timezone.utc)
        query = select(TerritoryZone).options(selectinload(TerritoryZone.owner))
        result = await db.execute(query)
        zones = result.scalars().all()

        decay_events: List[Dict[str, Any]] = []

        for zone in zones:
            # If zone is already neutral, skip
            if zone.owner_id is None and zone.defense_points == 0:
                continue

            ref_date = zone.updated_at or zone.captured_at or current_time
            new_defense, has_decayed = cls.calculate_decay(
                updated_at=ref_date,
                current_defense=zone.defense_points,
                now=current_time,
            )

            if has_decayed:
                old_defense = zone.defense_points
                zone.defense_points = new_defense

                became_neutral = False
                if new_defense <= 0:
                    zone.defense_points = 0
                    zone.owner_id = None  # Released to neutral/unclaimed state
                    became_neutral = True

                event_data = {
                    "event": "territory_decay",
                    "zone_id": zone.id,
                    "zone_name": zone.zone_name,
                    "old_defense": old_defense,
                    "new_defense": new_defense,
                    "is_neutral": became_neutral,
                    "timestamp": current_time.isoformat(),
                }
                decay_events.append(event_data)

                # Broadcast live decay event over WebSocket to all active runners
                try:
                    await ws_manager.broadcast(event_data)
                except Exception:
                    pass

        if decay_events:
            await db.commit()

        return decay_events


async def run_scheduled_territory_decay(now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """
    Automated Scheduled Job: Runs once every 24 hours via APScheduler.
    Opens its own AsyncSessionLocal database session, handles exceptions,
    and logs progress cleanly without crashing the background runner.
    """
    try:
        async with AsyncSessionLocal() as db:
            events = await TerritoryDecayService.process_all_territories_decay(db=db, now=now)
            decayed_count = len(events)
            neutral_count = sum(1 for e in events if e.get("is_neutral"))
            print(f"[Decay Scheduler] Daily sweep completed: {decayed_count} territories decayed, {neutral_count} released to neutral.")
            return events
    except Exception as e:
        print(f"[Decay Scheduler Error] Failed to execute territory decay sweep: {e}")
        return []
