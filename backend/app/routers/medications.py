import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Medication, Prescription, DoseLog, User
from app.schemas import MedicationOut, TakeDoseRequest
from app.services import schedule_service, calendar_service

router = APIRouter(prefix="/medications", tags=["medications"])


def _get_owned_medication(medication_id: int, user: User, db: Session) -> Medication:
    medication = (
        db.query(Medication)
        .join(Prescription)
        .filter(Medication.id == medication_id, Prescription.user_id == user.id)
        .first()
    )
    if medication is None:
        raise HTTPException(404, "Medicamento não encontrado")
    return medication


@router.get("", response_model=list[MedicationOut])
def list_medications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Medication)
        .join(Prescription)
        .filter(Prescription.user_id == user.id)
        .filter(Medication.first_dose_at.isnot(None))
        .order_by(Medication.first_dose_at.desc())
        .all()
    )


@router.post("/{medication_id}/take-dose", response_model=MedicationOut)
def take_dose(
    medication_id: int,
    payload: TakeDoseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Records a confirmed dose so stock tracking (and the refill reminder
    date) stays accurate even if the real intake times drift from the
    original schedule."""
    medication = _get_owned_medication(medication_id, user, db)

    taken_at = payload.taken_at or dt.datetime.utcnow()
    db.add(DoseLog(medication_id=medication.id, taken_at=taken_at))

    if medication.quantity_remaining is not None and medication.quantity_remaining > 0:
        medication.quantity_remaining -= 1

        stock_days = schedule_service.days_supply(medication)
        if stock_days is not None:
            new_end_date = (dt.date.today() + dt.timedelta(days=stock_days)).isoformat()
            medication.end_date = dt.date.fromisoformat(new_end_date)
            medication.refill_notified = False
            if user.auth_provider == "google":
                medication.refill_event_id = calendar_service.create_or_update_refill_event(
                    user, medication, existing_event_id=medication.refill_event_id
                )

    db.commit()
    db.refresh(medication)
    return medication


@router.delete("/{medication_id}")
def delete_medication(medication_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stops reminding about this medication. For Google accounts this also
    cancels the Calendar event series; for local accounts there's nothing
    else to cancel - the push scheduler only fires for rows that still
    exist, so deleting the row is enough to stop future notifications."""
    medication = _get_owned_medication(medication_id, user, db)

    if user.auth_provider == "google":
        if medication.calendar_event_ids:
            calendar_service.delete_events(user, medication.calendar_event_ids)
        if medication.refill_event_id:
            calendar_service.delete_events(user, [medication.refill_event_id])

    prescription_id = medication.prescription_id
    db.delete(medication)
    db.flush()
    # an empty prescription (all its medications removed) has nothing left
    # to show anywhere, so clean it up too - query fresh rather than trust
    # the in-memory relationship, which isn't guaranteed to reflect the
    # delete we just flushed
    remaining = db.query(Medication).filter(Medication.prescription_id == prescription_id).count()
    if remaining == 0:
        db.query(Prescription).filter(Prescription.id == prescription_id).delete()

    db.commit()
    return {"ok": True}
