from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Prescription, Medication, User
from app.schemas import PrescriptionOut, MedicationUpdate, MedicationOut, ScheduleRequest
from app.services import extraction_service, schedule_service, calendar_service

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def _get_owned_prescription(prescription_id: int, user: User, db: Session) -> Prescription:
    prescription = db.get(Prescription, prescription_id)
    if prescription is None or prescription.user_id != user.id:
        raise HTTPException(404, "Receita não encontrada")
    return prescription


@router.post("/upload", response_model=PrescriptionOut)
async def upload_prescription(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    result = extraction_service.extract_medications(file_bytes, file.filename)

    prescription = Prescription(
        user_id=user.id,
        original_filename=file.filename,
        raw_extraction=result.model_dump(),
        status="uploaded",
    )
    db.add(prescription)
    db.flush()  # get prescription.id before creating children

    for med in result.medications:
        db.add(Medication(
            prescription_id=prescription.id,
            name=med.name,
            dosage_text=med.dosage_text,
            frequency_hours=med.frequency_hours,
            times_per_day=med.times_per_day,
            duration_days=med.duration_days,
            is_continuous=med.is_continuous,
            total_quantity=med.total_quantity,
        ))

    db.commit()
    db.refresh(prescription)
    return prescription


@router.get("", response_model=list[PrescriptionOut])
def list_prescriptions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Prescription).filter(Prescription.user_id == user.id).order_by(Prescription.created_at.desc()).all()


@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_owned_prescription(prescription_id, user, db)


@router.patch("/{prescription_id}/medications/{medication_id}", response_model=MedicationOut)
def update_medication(
    prescription_id: int,
    medication_id: int,
    payload: MedicationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prescription = _get_owned_prescription(prescription_id, user, db)
    medication = next((m for m in prescription.medications if m.id == medication_id), None)
    if medication is None:
        raise HTTPException(404, "Medicamento não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(medication, field, value)

    db.commit()
    db.refresh(medication)
    return medication


@router.post("/{prescription_id}/schedule", response_model=PrescriptionOut)
def schedule_prescription(
    prescription_id: int,
    payload: ScheduleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prescription = _get_owned_prescription(prescription_id, user, db)
    if not user.google_refresh_token:
        raise HTTPException(400, "Conecte sua conta Google antes de agendar (faça login novamente)")

    for medication in prescription.medications:
        first_dose_at = payload.first_doses.get(medication.id)
        if first_dose_at is None:
            continue  # medication removed/skipped by the user during review

        schedule_service.compute_schedule(medication, first_dose_at)

        if medication.calendar_event_ids:
            calendar_service.delete_events(user, medication.calendar_event_ids)
        medication.calendar_event_ids = calendar_service.create_dose_events(user, medication)
        medication.refill_event_id = calendar_service.create_or_update_refill_event(
            user, medication, existing_event_id=medication.refill_event_id
        )

    prescription.status = "scheduled"
    db.commit()
    db.refresh(prescription)
    return prescription


@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prescription = _get_owned_prescription(prescription_id, user, db)
    for medication in prescription.medications:
        if medication.calendar_event_ids:
            calendar_service.delete_events(user, medication.calendar_event_ids)
        if medication.refill_event_id:
            calendar_service.delete_events(user, [medication.refill_event_id])
    db.delete(prescription)
    db.commit()
    return {"ok": True}
