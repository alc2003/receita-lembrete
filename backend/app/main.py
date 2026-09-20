import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.migrate import run_simple_migrations
from app.routers import auth, prescriptions, medications, push
from app.seed import seed_default_users
from app.services.notification_scheduler import run_scheduler

Base.metadata.create_all(bind=engine)
run_simple_migrations(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

    scheduler_task = asyncio.create_task(run_scheduler())
    yield
    scheduler_task.cancel()


app = FastAPI(title="Receita Lembrete API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(prescriptions.router)
app.include_router(medications.router)
app.include_router(push.router)


@app.get("/health")
def health():
    return {"status": "ok"}
