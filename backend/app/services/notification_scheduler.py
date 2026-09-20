"""Background loop that replaces Google Calendar for auth_provider="local"
users: every tick, it checks each of their scheduled medications for a dose
slot that just became due and pushes a browser notification for it.

Runs only for as long as this process is alive - on a free-tier host that
spins down on inactivity, ticks are missed while asleep (see README).
"""
import asyncio
import datetime as dt
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Medication, Prescription, User
from app.services import schedule_service
from app.services.push_service import send_push

logger = logging.getLogger(__name__)

# how long after a dose slot's exact instant we still consider it "due" -
# must be >= the tick interval so no slot is skipped between ticks
GRACE_WINDOW = dt.timedelta(seconds=90)


def _due_medications(db: Session) -> list[Medication]:
    return (
        db.query(Medication)
        .join(Prescription)
        .join(User)
        .filter(User.auth_provider == "local")
        .filter(Medication.first_dose_at.isnot(None))
        .all()
    )


def _current_dose_slot(medication: Medication, now: dt.datetime) -> dt.datetime | None:
    elapsed = now - medication.first_dose_at
    if elapsed.total_seconds() < 0:
        return None
    period = dt.timedelta(hours=medication.frequency_hours)
    periods_elapsed = int(elapsed // period)
    slot = medication.first_dose_at + periods_elapsed * period
    if medication.end_date and slot.date() > medication.end_date:
        return None
    if slot <= now <= slot + GRACE_WINDOW:
        return slot
    return None


def _notify_user(db: Session, user: User, title: str, body: str) -> None:
    for sub in list(user.push_subscriptions):
        if not send_push(sub, title, body):
            db.delete(sub)
    db.commit()


def _tick(db: Session) -> None:
    now = dt.datetime.now(dt.timezone.utc)

    for medication in _due_medications(db):
        slot = _current_dose_slot(medication, now)
        if slot and medication.last_reminder_sent_at != slot:
            user = medication.prescription.user
            title = f"Hora de tomar {medication.name}"
            body = medication.dosage_text or "Não esqueça sua dose."
            _notify_user(db, user, title, body)
            medication.last_reminder_sent_at = slot
            db.commit()

        if (
            medication.is_continuous
            and not medication.refill_notified
            and medication.end_date is not None
        ):
            reminder_date = schedule_service.refill_reminder_date(medication)
            if reminder_date and reminder_date <= now.date():
                user = medication.prescription.user
                _notify_user(
                    db, user,
                    f"Estoque acabando: {medication.name}",
                    "Seu estoque está próximo do fim - hora de comprar/renovar a receita.",
                )
                medication.refill_notified = True
                db.commit()


async def run_scheduler() -> None:
    while True:
        try:
            db = SessionLocal()
            try:
                _tick(db)
            finally:
                db.close()
        except Exception:
            logger.exception("Push scheduler tick failed")
        await asyncio.sleep(settings.push_scheduler_interval_seconds)
