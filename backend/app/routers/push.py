from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import PushSubscription, User
from app.schemas import PushSubscriptionIn

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key")
def vapid_public_key():
    return {"key": settings.vapid_public_key}


@router.post("/subscribe")
def subscribe(payload: PushSubscriptionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth_key = payload.keys.auth
    else:
        db.add(PushSubscription(
            user_id=user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth_key=payload.keys.auth,
        ))
    db.commit()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe(endpoint: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint, PushSubscription.user_id == user.id
    ).delete()
    db.commit()
    return {"ok": True}
