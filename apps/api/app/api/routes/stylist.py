import asyncio
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import StyleProfile, StyleProfilePublic
from app.services.ai_client import ai_client


class AnalyzeStyleRequest(BaseModel):
    image_url: str

router = APIRouter(prefix="/stylist", tags=["stylist"])

ANALYZE_PROMPT = (
    "Analyze this person's body type, color tone, and height estimate. "
    "Return JSON with keys: bodyType, colorTone, heightEstimate, recommendedStyles (list), avoidStyles (list)."
)


@router.post("/analyze", response_model=StyleProfilePublic)
async def analyze_style(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    body: AnalyzeStyleRequest,
) -> Any:
    # Call Qwen via Colab/ngrok (non-blocking await)
    try:
        result = await ai_client.invoke_qwen(
            prompt=ANALYZE_PROMPT,
            image_url=body.image_url
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stylist service error: {str(e)}")

    if not result:
        raise HTTPException(status_code=504, detail="Stylist analysis failed")

    # Upsert StyleProfile
    existing = session.exec(
        select(StyleProfile).where(StyleProfile.user_id == current_user.id)
    ).first()

    profile = existing or StyleProfile(user_id=current_user.id)
    profile.body_type = result.get("bodyType")
    profile.color_tone = result.get("colorTone")
    profile.height_estimate = result.get("heightEstimate")
    profile.recommended_styles = result.get("recommendedStyles")
    profile.avoid_styles = result.get("avoidStyles")
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@router.get("/profile", response_model=StyleProfilePublic)
def get_style_profile(*, session: SessionDep, current_user: CurrentUser) -> Any:
    profile = session.exec(
        select(StyleProfile).where(StyleProfile.user_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Style profile not found")
    return profile
