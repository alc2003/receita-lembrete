"""Google Calendar integration: OAuth2 login and creation of the recurring
dose-reminder events plus the one-off refill reminder.

Each medication produces one recurring event per time-of-day slot (Calendar's
RRULE is once-a-day, so "3x ao dia" becomes 3 separate daily series) and,
when the medication is continuous or stock-limited, one additional single
event warning the user before the box runs out.
"""
import datetime as dt

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings
from app.models import Medication, User
from app.services import schedule_service

SCOPES = ["https://www.googleapis.com/auth/calendar.events", "openid",
          "https://www.googleapis.com/auth/userinfo.email"]


def build_auth_flow(state: str | None = None) -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES, state=state)
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def credentials_for_user(user: User) -> Credentials:
    return Credentials(
        token=None,
        refresh_token=user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )


def _calendar(user: User):
    creds = credentials_for_user(user)
    return build("calendar", "v3", credentials=creds)


def _rrule_until(end_date: dt.date) -> str:
    # RFC5545 wants UTC "floating" date-time with a trailing Z
    until = dt.datetime.combine(end_date, dt.time(23, 59, 59))
    return until.strftime("%Y%m%dT%H%M%SZ")


def create_dose_events(user: User, medication: Medication) -> list[str]:
    service = _calendar(user)
    times = schedule_service.dose_times_of_day(
        medication.first_dose_at, medication.frequency_hours, medication.times_per_day
    )
    event_ids: list[str] = []
    first_day = medication.first_dose_at.date()

    for slot_time in times:
        start_dt = dt.datetime.combine(first_day, slot_time)
        end_dt = start_dt + dt.timedelta(minutes=15)

        recurrence = []
        if medication.end_date:
            recurrence = [f"RRULE:FREQ=DAILY;UNTIL={_rrule_until(medication.end_date)}"]
        else:
            recurrence = ["RRULE:FREQ=DAILY"]

        body = {
            "summary": f"💊 Tomar {medication.name}" + (f" ({medication.dosage_text})" if medication.dosage_text else ""),
            "description": "Lembrete criado automaticamente a partir da receita médica.",
            "start": {"dateTime": start_dt.isoformat(), "timeZone": "America/Sao_Paulo"},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": "America/Sao_Paulo"},
            "recurrence": recurrence,
            "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 0}]},
        }
        created = service.events().insert(calendarId=user.google_calendar_id, body=body).execute()
        event_ids.append(created["id"])

    return event_ids


def create_or_update_refill_event(user: User, medication: Medication, existing_event_id: str | None = None) -> str | None:
    reminder_date = schedule_service.refill_reminder_date(medication)
    if reminder_date is None:
        return None

    service = _calendar(user)
    body = {
        "summary": f"🔔 Comprar/renovar receita: {medication.name}",
        "description": "O estoque deste medicamento está próximo do fim.",
        "start": {"date": reminder_date.isoformat()},
        "end": {"date": (reminder_date + dt.timedelta(days=1)).isoformat()},
        "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 540}]},
    }

    if existing_event_id:
        updated = service.events().update(
            calendarId=user.google_calendar_id, eventId=existing_event_id, body=body
        ).execute()
        return updated["id"]

    created = service.events().insert(calendarId=user.google_calendar_id, body=body).execute()
    return created["id"]


def delete_events(user: User, event_ids: list[str]) -> None:
    service = _calendar(user)
    for event_id in event_ids:
        try:
            service.events().delete(calendarId=user.google_calendar_id, eventId=event_id).execute()
        except Exception:
            pass  # event may already be gone (deleted manually by the user) - safe to ignore
