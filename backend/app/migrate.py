"""Minimal, additive auto-migration for the columns/tables introduced by the
local-auth + push-notification feature. There's no Alembic in this project
yet; this just brings an existing database up to date at startup so the app
doesn't 500 on missing columns after a deploy. Safe to run every startup -
every statement is guarded by an existence check.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def run_simple_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    is_postgres = engine.dialect.name == "postgresql"
    tables = inspector.get_table_names()

    with engine.begin() as conn:
        if "users" in tables:
            cols = {c["name"] for c in inspector.get_columns("users")}
            if "auth_provider" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'google'"))
            if "username" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR"))
            if "password_hash" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            # existing rows are all Google accounts with these already set;
            # loosen the constraint so local accounts (which have neither)
            # can be inserted. SQLite can't drop NOT NULL without a table
            # rebuild - local/dev is expected to start from a fresh DB.
            if is_postgres:
                conn.execute(text("ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))

        if "medications" in tables:
            med_cols = {c["name"]: c for c in inspector.get_columns("medications")}
            if "last_reminder_sent_at" not in med_cols:
                conn.execute(text("ALTER TABLE medications ADD COLUMN last_reminder_sent_at TIMESTAMP"))
            elif is_postgres and getattr(med_cols["last_reminder_sent_at"]["type"], "timezone", False):
                # an earlier version of this migration created the column as
                # TIMESTAMPTZ; the model now stores naive UTC everywhere
                # (see the comment on Medication.first_dose_at for why), so
                # align the column type to match
                conn.execute(text("ALTER TABLE medications ALTER COLUMN last_reminder_sent_at TYPE TIMESTAMP"))
            if "refill_notified" not in med_cols:
                conn.execute(text("ALTER TABLE medications ADD COLUMN refill_notified BOOLEAN DEFAULT FALSE"))
