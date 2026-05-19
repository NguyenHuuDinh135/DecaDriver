from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
def health() -> Any:
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "db": db_status,
        "ai_worker": "configured" if settings.AI_WORKER_TOKEN else "not_configured",
        "storage": "s3" if settings.AI_S3_BUCKET else "not_configured",
    }
