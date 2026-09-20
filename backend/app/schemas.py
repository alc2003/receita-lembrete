import datetime as dt
from typing import Optional

from pydantic import BaseModel


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


class ScheduleRequest(BaseModel):
    """First dose time per medication id, used as the anchor for all future reminders."""
    first_doses: dict[int, dt.datetime]


class TakeDoseRequest(BaseModel):
    taken_at: Optional[dt.datetime] = None
