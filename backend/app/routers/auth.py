from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from app.auth import create_session_token, get_current_user
from app.config import settings
from app.database import get_db
from app.models import User
from app.services.calendar_service import build_auth_flow, SCOPES

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login():
    flow = build_auth_flow()
    auth_url, _state = flow.authorization_url(
        access_type="offline",  # required to receive a refresh_token
        prompt="consent",       # forces Google to re-issue the refresh_token every login
        include_granted_scopes="true",
    )
    return RedirectResponse(auth_url)


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    flow = build_auth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    granted = set(creds.scopes or [])
    if "https://www.googleapis.com/auth/calendar.events" not in granted:
        # Happens when the Calendar scope isn't registered under "Data access"
        # on the Google Auth Platform consent screen - Google silently drops
        # any requested scope it doesn't recognize for the app instead of
        # erroring, so login "succeeds" without Calendar permission.
        return RedirectResponse(
            f"{settings.frontend_origin}/auth/callback?"
            "error=missing_calendar_scope"
        )

    oauth2_service = build("oauth2", "v2", credentials=creds)
    info = oauth2_service.userinfo().get().execute()

    user = db.query(User).filter(User.google_id == info["id"]).first()
    if user is None:
        user = User(google_id=info["id"], email=info["email"], name=info.get("name"))
        db.add(user)

    user.email = info["email"]
    user.name = info.get("name")
    if creds.refresh_token:  # only sent on first consent, so don't overwrite with None on re-login
        user.google_refresh_token = creds.refresh_token
    db.commit()
    db.refresh(user)

    session_token = create_session_token(user)
    return RedirectResponse(f"{settings.frontend_origin}/auth/callback?token={session_token}")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name}
