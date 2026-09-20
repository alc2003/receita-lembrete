import os

from pydantic_settings import BaseSettings

# Google often returns the granted scopes in a different order (or grants a
# superset/subset due to consent-screen configuration) than what we asked
# for. oauthlib treats that mismatch as a hard error by default; this makes
# it a warning instead so login doesn't 500 on a harmless reordering. Actual
# missing scopes are still caught explicitly in the auth callback.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")


class Settings(BaseSettings):
    database_url: str = "sqlite:///./receita_lembrete.db"

    anthropic_api_key: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # session/jwt signing secret - override in production via env var
    secret_key: str = "change-me-in-production"

    # frontend origin allowed to call this API
    frontend_origin: str = "http://localhost:5173"

    # days before a medication runs out that a refill reminder is created
    refill_reminder_days_before: int = 4

    class Config:
        env_file = ".env"


settings = Settings()
