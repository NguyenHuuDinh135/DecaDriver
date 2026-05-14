from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import Garment, GarmentPublic, StyleProfile
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.get("/", response_model=list[GarmentPublic])
def get_recommendations(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 20,
) -> Any:
    profile = session.exec(
        select(StyleProfile).where(StyleProfile.user_id == current_user.id)
    ).first()

    if not profile or not profile.recommended_styles:
        # Fallback: return latest garments
        return session.exec(select(Garment).limit(limit)).all()

    # Get style embedding from CLIP real-time endpoint
    style_text = " ".join(profile.recommended_styles or [])
    clip_resp = sagemaker_client.invoke_realtime_endpoint(
        settings.SAGEMAKER_CLIP_ENDPOINT,
        {"text": style_text},
    )
    embedding: list[float] = clip_resp.get("embedding", [])

    if not embedding:
        raise HTTPException(status_code=502, detail="CLIP endpoint returned no embedding")

    # pgvector cosine similarity search
    rows = session.exec(
        text(
            "SELECT id FROM garment "
            "WHERE clip_embedding IS NOT NULL "
            "ORDER BY clip_embedding <=> CAST(:emb AS vector) "
            "LIMIT :limit"
        ).bindparams(emb=str(embedding), limit=limit)
    ).all()

    if not rows:
        return session.exec(select(Garment).limit(limit)).all()

    ids = [r[0] for r in rows]
    garments = session.exec(select(Garment).where(Garment.id.in_(ids))).all()  # type: ignore[attr-defined]
    # Preserve similarity order
    garment_map = {g.id: g for g in garments}
    return [garment_map[i] for i in ids if i in garment_map]
