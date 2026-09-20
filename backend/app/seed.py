from sqlalchemy.orm import Session

from app.models import User
from app.services.password_service import hash_password


def seed_default_users(db: Session) -> None:
    """Idempotent: creates the demo local-auth account used for testing the
    push-notification flow, if it doesn't already exist."""
    exists = db.query(User).filter(User.username == "teofilo").first()
    if exists:
        return
    db.add(User(
        username="teofilo",
        name="teofilo",
        auth_provider="local",
        password_hash=hash_password("1234567"),
    ))
    db.commit()
