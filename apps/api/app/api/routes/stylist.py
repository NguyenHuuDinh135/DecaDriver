import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import StyleProfile, StyleProfilePublic
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/stylist", tags=["stylist"])

ANALYZE_PROMPT = (
    "Analyze this person's body type, color tone, and height estimate. "
    "Return JSON with keys: bodyType, colorTone, heightEstimate, recommendedStyles (list), avoidStyles (list)."
)


@router.post("/analyze", response_model=StyleProfilePublic)
def analyze_style(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    image_url: str,
) -> Any:
    # Upload input to S3 then call Qwen async endpoint
    input_key = f"inputs/stylist/{current_user.id}/{uuid.uuid4()}.json"
    input_s3_uri = sagemaker_client.upload_json_to_s3(
        settings.AI_S3_BUCKET,
        input_key,
        {"image_url": image_url, "prompt": ANALYZE_PROMPT},
    )

    output_s3_uri = sagemaker_client.invoke_async_endpoint(
        settings.SAGEMAKER_QWEN_ENDPOINT, input_s3_uri
    )

    # Poll synchronously (acceptable for onboarding flow, ~2-5s)
    import time
    for _ in range(30):
        result = sagemaker_client.get_async_result(output_s3_uri)
        if result:
            break
        time.sleep(1)
    else:
        raise HTTPException(status_code=504, detail="Stylist analysis timed out")

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
