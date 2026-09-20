"""Turns "took the first dose at X" + the prescription's frequency/quantity
into concrete dose times, an end date, and (when the medication is stock-
limited or continuous) a refill reminder date.
"""
import datetime as dt

from app.config import settings
from app.models import Medication


def dose_times_of_day(first_dose_at: dt.datetime, frequency_hours: int, times_per_day: int) -> list[dt.time]:
    """The times of day doses fall on, e.g. first dose at 08:00 every 8h -> [08:00, 16:00, 00:00]."""
    times = []
    for i in range(times_per_day):
        slot = first_dose_at + dt.timedelta(hours=frequency_hours * i)
        times.append(slot.time())
    return times


def days_supply(medication: Medication) -> int | None:
    """How many days the current stock lasts, if quantity is known."""
    if medication.quantity_remaining is None or medication.times_per_day == 0:
        return None
    return medication.quantity_remaining // medication.times_per_day


def compute_schedule(medication: Medication, first_dose_at: dt.datetime) -> None:
    """Fills in first_dose_at, end_date and quantity_remaining on the medication
    (caller is responsible for committing to the DB)."""
    if first_dose_at.tzinfo is not None:
        # normalize to naive UTC before it ever touches the DB - see the
        # comment on Medication.first_dose_at for why this matters
        first_dose_at = first_dose_at.astimezone(dt.timezone.utc).replace(tzinfo=None)
    medication.first_dose_at = first_dose_at
    medication.quantity_remaining = medication.total_quantity

    stock_days = days_supply(medication)

    if medication.duration_days:
        # explicit course length (e.g. antibiotic "por 7 dias") wins even if
        # the box happens to contain more than needed
        end_date = (first_dose_at + dt.timedelta(days=medication.duration_days - 1)).date()
        if stock_days is not None:
            stock_end = (first_dose_at + dt.timedelta(days=stock_days - 1)).date()
            end_date = min(end_date, stock_end)
        medication.end_date = end_date
    elif stock_days is not None:
        medication.end_date = (first_dose_at + dt.timedelta(days=stock_days - 1)).date()
    else:
        medication.end_date = None  # continuous with unknown quantity - no end in sight


def refill_reminder_date(medication: Medication) -> dt.date | None:
    """Date to nudge the user to buy/renew, N days before the stock runs out.
    Only for continuous/mensal medications - a fixed-length course (e.g. an
    antibiotic "por 7 dias") simply ends, it doesn't need a refill."""
    if not medication.is_continuous or medication.end_date is None:
        return None
    reminder = medication.end_date - dt.timedelta(days=settings.refill_reminder_days_before)
    today = dt.date.today()
    return max(reminder, today)
