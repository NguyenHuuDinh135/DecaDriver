import uuid
from typing import Any

from fastapi import APIRouter, Form, HTTPException, UploadFile
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import (
    Garment,
    GarmentPublic,
    GarmentsPublic,
    GarmentUpdate,
    Message,
)
from app.services.ai_client import ai_client

router = APIRouter(prefix="/garments", tags=["garments"])


@router.get("/", response_model=GarmentsPublic)
def read_garments(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve garments.
    """
    count_statement = select(func.count()).select_from(Garment)
    count = session.exec(count_statement).one()
    statement = (
        select(Garment)
        .order_by(col(Garment.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    garments = session.exec(statement).all()

    return GarmentsPublic(data=garments, count=count)


@router.get("/{id}", response_model=GarmentPublic)
def read_garment(session: SessionDep, id: uuid.UUID) -> Any:
    """
    Get garment by ID.
    """
    garment = session.get(Garment, id)
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")
    return garment


@router.post("/", response_model=GarmentPublic)
async def create_garment(
    *,
    session: SessionDep,
    _current_user: CurrentUser,
    title: str = Form(...),
    brand: str | None = Form(None),
    image: UploadFile,
) -> Any:
    """
    Create new garment with image upload and CLIP embedding generation.
    Requires authentication.
    """
    if not image.filename:
        raise HTTPException(status_code=400, detail="Image file is required")

    # Upload image to S3
    data = await image.read()
    image_key = f"garments/{uuid.uuid4().hex}_{image.filename}"
    ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        image_key,
        data,
        image.content_type or "image/jpeg",
    )
    image_url = f"https://{settings.AI_S3_BUCKET}.s3.amazonaws.com/{image_key}"

    # Get CLIP embedding
    # We combine title and brand to get a better embedding
    style_text = title
    if brand:
        style_text = f"{brand} {title}"

    embedding = await ai_client.invoke_clip(text=style_text)

    if not embedding:
        raise HTTPException(status_code=502, detail="Failed to generate embedding")

    garment = Garment(
        title=title,
        brand=brand,
        image_url=image_url,
        clip_embedding=embedding,
    )
    session.add(garment)
    session.commit()
    session.refresh(garment)
    return garment


@router.put("/{id}", response_model=GarmentPublic)
def update_garment(
    *,
    session: SessionDep,
    _current_user: CurrentUser,
    id: uuid.UUID,
    garment_in: GarmentUpdate,
) -> Any:
    """
    Update a garment (title and brand only).
    """
    garment = session.get(Garment, id)
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    update_dict = garment_in.model_dump(exclude_unset=True)
    garment.sqlmodel_update(update_dict)
    session.add(garment)
    session.commit()
    session.refresh(garment)
    return garment


@router.delete("/{id}")
def delete_garment(
    session: SessionDep, _current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a garment.
    """
    garment = session.get(Garment, id)
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    session.delete(garment)
    session.commit()
    return Message(message="Garment deleted successfully")
