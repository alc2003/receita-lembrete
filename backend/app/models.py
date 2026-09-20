import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    google_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    # OAuth refresh token used to create/update Calendar events without
    # asking the user to log in again. Treat this column as a secret.
    google_refresh_token = Column(Text, nullable=True)
    google_calendar_id = Column(String, default="primary")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    prescriptions = relationship("Prescription", back_populates="user")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String, nullable=True)
    raw_extraction = Column(JSON, nullable=True)  # structured data returned by the AI extractor
    status = Column(String, default="uploaded")  # uploaded -> reviewed -> scheduled
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    user = relationship("User", back_populates="prescriptions")
    medications = relationship("Medication", back_populates="prescription", cascade="all, delete-orphan")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)

    name = Column(String, nullable=False)
    dosage_text = Column(String, nullable=True)  # e.g. "1 comprimido", "10ml"

    frequency_hours = Column(Integer, nullable=False)  # e.g. 8 -> every 8h
    times_per_day = Column(Integer, nullable=False)

    duration_days = Column(Integer, nullable=True)  # null when continuous/depends on stock
    is_continuous = Column(Boolean, default=False)  # e.g. "uso contínuo" / monthly refill medication

    total_quantity = Column(Integer, nullable=True)  # units in the box/prescription (e.g. 30 comprimidos)
    quantity_remaining = Column(Integer, nullable=True)

    first_dose_at = Column(DateTime, nullable=True)
    end_date = Column(Date, nullable=True)  # computed: last day the medication is taken / stock lasts

    calendar_event_ids = Column(JSON, default=list)  # one recurring event id per time-of-day slot
    refill_event_id = Column(String, nullable=True)  # one-off "comprar/renovar" reminder

    created_at = Column(DateTime, default=dt.datetime.utcnow)

    prescription = relationship("Prescription", back_populates="medications")
    dose_logs = relationship("DoseLog", back_populates="medication", cascade="all, delete-orphan")


class DoseLog(Base):
    """Records a confirmed dose taken, used to keep quantity_remaining accurate."""
    __tablename__ = "dose_logs"

    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    taken_at = Column(DateTime, default=dt.datetime.utcnow)

    medication = relationship("Medication", back_populates="dose_logs")
