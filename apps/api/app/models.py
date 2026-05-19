import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pgvector.sqlalchemy import Vector
from pydantic import EmailStr
from sqlalchemy import JSON, DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    # items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    affiliate_posts: list["AffiliatePost"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ── AI Models ──────────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Garment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    brand: str | None = Field(default=None, max_length=255)
    image_url: str
    clip_embedding: list[float] | None = Field(default=None, sa_type=Vector(768))  # type: ignore[assignment]
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    tryon_jobs: list["TryOnJob"] = Relationship(back_populates="garment")


class GarmentPublic(SQLModel):
    id: uuid.UUID
    title: str
    brand: str | None
    image_url: str
    created_at: datetime | None


class GarmentCreate(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=255)


class GarmentUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=255)


class GarmentsPublic(SQLModel):
    data: list[GarmentPublic]
    count: int


class TryOnJob(SQLModel, table=True):
    __tablename__ = "tryon_job"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    garment_id: uuid.UUID = Field(foreign_key="garment.id", nullable=False, ondelete="CASCADE")
    status: JobStatus = Field(default=JobStatus.pending)
    result_url: str | None = Field(default=None)
    sagemaker_output_s3: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    garment: Garment | None = Relationship(back_populates="tryon_jobs")


class TryOnJobPublic(SQLModel):
    id: uuid.UUID
    garment_id: uuid.UUID
    status: JobStatus
    result_url: str | None
    created_at: datetime | None


class VideoTryOnJob(SQLModel, table=True):
    __tablename__ = "video_tryon_job"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    tryon_job_id: uuid.UUID = Field(foreign_key="tryon_job.id", nullable=False, ondelete="CASCADE")
    status: JobStatus = Field(default=JobStatus.pending)
    result_url: str | None = Field(default=None)
    sagemaker_output_s3: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class VideoTryOnJobPublic(SQLModel):
    id: uuid.UUID
    tryon_job_id: uuid.UUID
    status: JobStatus
    result_url: str | None
    created_at: datetime | None


class StyleProfile(SQLModel, table=True):
    __tablename__ = "style_profile"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, unique=True, ondelete="CASCADE")
    body_type: str | None = Field(default=None, max_length=50)
    color_tone: str | None = Field(default=None, max_length=50)
    height_estimate: str | None = Field(default=None, max_length=50)
    recommended_styles: Any | None = Field(default=None, sa_type=JSON)
    avoid_styles: Any | None = Field(default=None, sa_type=JSON)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class StyleProfilePublic(SQLModel):
    body_type: str | None
    color_tone: str | None
    height_estimate: str | None
    recommended_styles: Any | None
    avoid_styles: Any | None


class AvatarJob(SQLModel, table=True):
    __tablename__ = "avatar_job"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    status: JobStatus = Field(default=JobStatus.pending)
    lora_s3_key: str | None = Field(default=None)
    reference_image_url: str | None = Field(default=None)
    sagemaker_job_name: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class AvatarJobPublic(SQLModel):
    id: uuid.UUID
    status: JobStatus
    lora_s3_key: str | None
    reference_image_url: str | None
    created_at: datetime | None


# ── Affiliate Models ──────────────────────────────────────────────────────────

class AffiliatePost(SQLModel, table=True):
    __tablename__ = "affiliate_post"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    tiki_link: str
    product_image_url: str | None = Field(default=None)
    ai_image_url: str | None = Field(default=None)
    title: str | None = Field(default=None, max_length=255)
    price: str | None = Field(default=None, max_length=50)
    status: JobStatus = Field(default=JobStatus.pending)
    sagemaker_output_s3: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner: User | None = Relationship(back_populates="affiliate_posts")


class AffiliatePostCreate(SQLModel):
    tiki_link: str
    title: str | None = None
    price: str | None = None
    product_image_url: str | None = None


class AffiliatePostPublic(SQLModel):
    id: uuid.UUID
    tiki_link: str | None
    product_image_url: str | None
    ai_image_url: str | None
    title: str | None
    price: str | None
    status: JobStatus
    created_at: datetime


class AffiliateClick(SQLModel, table=True):
    __tablename__ = "affiliate_click"  # type: ignore[assignment]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    post_id: uuid.UUID = Field(foreign_key="affiliate_post.id", nullable=False, ondelete="CASCADE")
    visitor_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    ip_address: str | None = Field(default=None, max_length=50)
    user_agent: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class AffiliateStats(SQLModel):
    total_clicks: int
    total_conversions: int
    total_revenue: float
    total_commission: float
