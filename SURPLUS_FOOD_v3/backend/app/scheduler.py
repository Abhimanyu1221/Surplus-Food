"""
Background scheduler — auto-expires food listings using APScheduler.

The scheduler is started from main.py on the FastAPI startup event and
shut down cleanly on the shutdown event.  It runs expire_stale_listings()
every 5 minutes, which is well within the minimum expiry window of 30 min
(0.5 h), so no listing is missed by more than ~5 minutes.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

log = logging.getLogger("scheduler")

# Module-level scheduler instance so startup/shutdown can reference it.
_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


async def _run_expiry():
    """Thin async wrapper so we can import lazily and avoid circular imports."""
    from app.services.food_service import expire_stale_listings
    count = await expire_stale_listings()
    if count:
        log.info("Auto-expired %d food listing(s).", count)


def start_scheduler():
    scheduler = get_scheduler()
    scheduler.add_job(
        _run_expiry,
        trigger=IntervalTrigger(minutes=5),
        id="expire_food_listings",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    log.info("APScheduler started — food expiry job runs every 5 min.")


def stop_scheduler():
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("APScheduler stopped.")
