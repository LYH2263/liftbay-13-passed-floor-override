from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.services.seed import seed_if_empty


def ensure_building_columns() -> None:
    """Backfill columns added after first release on existing databases."""
    inspector = inspect(engine)
    if "buildings" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("buildings")}
    if "allow_passed_pickup" not in columns:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE buildings ADD COLUMN allow_passed_pickup "
                    "BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_building_columns()
    if settings.seed_on_empty:
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    yield


app = FastAPI(title="LiftBay", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")
