from typing import Any

import boto3
from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine

router = APIRouter(prefix="/health", tags=["health"])


def _check_endpoint(sm_client, name: str) -> str:
    if not name:
        return "not_configured"
    try:
        resp = sm_client.describe_endpoint(EndpointName=name)
        return resp["EndpointStatus"]
    except Exception:
        return "error"


@router.get("/")
def health() -> Any:
    # DB check
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    # SageMaker endpoints check
    sm = boto3.client("sagemaker", region_name=settings.AWS_REGION)
    return {
        "db": db_status,
        "clip": _check_endpoint(sm, settings.SAGEMAKER_CLIP_ENDPOINT),
        "fashn": _check_endpoint(sm, settings.SAGEMAKER_FASHN_ENDPOINT),
        "qwen": _check_endpoint(sm, settings.SAGEMAKER_QWEN_ENDPOINT),
    }
