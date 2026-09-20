from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, prescriptions, medications

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Receita Lembrete API")

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


@app.get("/health")
def health():
    return {"status": "ok"}
