import datetime as dt
from typing import Optional

from pydantic import BaseModel, field_serializer


def _utc_iso(value: Optional[dt.datetime]) -> Optional[str]:
    """Every datetime this API stores is UTC, but some DB columns hold that
    as a naive value (no tzinfo). Serializing a naive datetime as plain
    ISO ("...T21:30:00") is what caused the timezone bug: JavaScript's
    `new Date(...)` treats a timezone-less string as LOCAL time, not UTC,
    so the browser silently re-interpreted the UTC clock reading as if it
    were already local time. Always emit an explicit "Z" so the frontend
    can never make that mistake, whether the value came back aware or not.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.isoformat() + "Z"
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


class MedicationExtracted(BaseModel):
    """Shape returned by the AI extractor for one medication found on the prescription."""
    name: str
    dosage_text: Optional[str] = None
    frequency_hours: int
    times_per_day: int
    duration_days: Optional[int] = None
    is_continuous: bool = False
    total_quantity: Optional[int] = None


class PrescriptionExtractionResult(BaseModel):
    medications: list[MedicationExtracted]
    warnings: list[str] = []


class MedicationOut(BaseModel):
    id: int
    name: str
    dosage_text: Optional[str]
    frequency_hours: int
    times_per_day: int
    duration_days: Optional[int]
    is_continuous: bool
    total_quantity: Optional[int]
    quantity_remaining: Optional[int]
    first_dose_at: Optional[dt.datetime]
    end_date: Optional[dt.date]

    class Config:
        from_attributes = True

    @field_serializer("first_dose_at")
    def _serialize_first_dose_at(self, value: Optional[dt.datetime]) -> Optional[str]:
        return _utc_iso(value)


class MedicationUpdate(BaseModel):
    """Fields the user can edit during the review step before scheduling."""
    name: Optional[str] = None
    dosage_text: Optional[str] = None
    frequency_hours: Optional[int] = None
    times_per_day: Optional[int] = None
    duration_days: Optional[int] = None
    is_continuous: Optional[bool] = None
    total_quantity: Optional[int] = None


class PrescriptionOut(BaseModel):
    id: int
    status: str
    original_filename: Optional[str]
    created_at: dt.datetime
    medications: list[MedicationOut]

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def _serialize_created_at(self, value: dt.datetime) -> str:
        return _utc_iso(value)


class ScheduleRequest(BaseModel):
    """First dose time per medication id, used as the anchor for all future reminders."""
    first_doses: dict[int, dt.datetime]


class TakeDoseRequest(BaseModel):
    taken_at: Optional[dt.datetime] = None


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
