from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic.networks import EmailStr
import uuid
from io import BytesIO
import requests
from PIL import Image, ImageDraw
from app.utils import generate_test_email, send_email
from datetime import datetime, timezone

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import Message, Garment, GarmentPublic, GarmentsPublic, Post
from sqlmodel import select, func, desc

router = APIRouter(prefix="/utils", tags=["utils"])


# ==================== UTILITIES CHUNG ====================

@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test gửi email (chỉ dành cho Superuser).
    
    Dùng để kiểm tra xem hệ thống có gửi email được không.
    """
    try:
        email_data = generate_test_email(email_to=email_to)
        
        send_email(
            email_to=email_to,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
        
        return Message(message=f"Test email sent successfully to {email_to}")
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to send test email: {str(e)}"
        )


@router.get("/health-check/")
async def health_check() -> dict:
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==================== SOCIAL & MEDIA ====================
@router.get("/og-image/{post_id}")
async def generate_og_image(post_id: uuid.UUID, session: SessionDep):
    """Tạo ảnh Open Graph cho bài đăng"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post không tồn tại")
    
    try:
        # Thêm timeout để tránh treo server
        response = requests.get(post.image_url, timeout=5) 
        response.raise_for_status()
        # ... tiếp tục code PIL của bạn
    except Exception as e:
        raise HTTPException(status_code=500, detail="Không thể tải ảnh gốc")


# ==================== SEARCH ====================
@router.get("/search", response_model=GarmentsPublic)
async def search_garments(
    session: SessionDep,              # 1. Không có mặc định -> Phải đứng đầu
    q: str = Query(..., min_length=2), # 2. Có mặc định (= Query)
    brand: str | None = None,         # 3. Có mặc định (= None)
    skip: int = 0,                    # 4. Có mặc định (= 0)
    limit: int = 20,                  # 5. Có mặc định (= 20)
):
    """Tìm kiếm Garment"""
    statement = select(Garment).where(
        (Garment.title.ilike(f"%{q}%")) |
        (Garment.description.ilike(f"%{q}%"))
    )

    if brand:
        statement = statement.where(Garment.brand == brand)

    # Count
    count_stmt = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_stmt).one()

    # Get data
    statement = statement.order_by(desc(Garment.created_at)).offset(skip).limit(limit)
    results = session.exec(statement).all()

    return GarmentsPublic(data=results, count=total)