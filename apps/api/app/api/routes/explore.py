from fastapi import APIRouter
from app.api.deps import SessionDep
from app.models import Garment
from sqlmodel import select

router = APIRouter()

@router.get("/trending")
def get_trending_items(session: SessionDep):
    """
    Lấy danh sách các trang phục đang hot.
    Hiện tại: Lấy 10 món đồ mới nhất từ database.
    """
    statement = select(Garment).limit(10)
    items = session.exec(statement).all()
    return items

@router.get("/search-visual")
def search_by_image(image_url: str, session: SessionDep):
    """
    Sử dụng model CLIP trên SageMaker để tìm trang phục qua ảnh.
    Đầu vào: URL ảnh người dùng tải lên.
    Đầu ra: Danh sách Garments có đặc điểm tương đồng.
    """
    # Logic: Gọi clip-service để lấy vector embedding, sau đó so sánh trong DB.
    return {"message": "Feature coming soon with SageMaker CLIP Integration"}