import uuid
from fastapi import APIRouter, HTTPException
from app.api.deps import SessionDep, CurrentUser
from app.models import Post, AffiliateClick, AffiliateDashboard
from sqlmodel import select, func

router = APIRouter(prefix="/affiliate", tags=["Affiliate"])

@router.post("/track-click")
def track_affiliate_click(
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID
):
    """
    Ghi nhận khi người dùng nhấn vào link mua hàng từ một bài đăng.
    Dùng để tính hoa hồng cho người sở hữu Post.
    """
    # 1. Kiểm tra bài post có tồn tại không
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Bài đăng không tồn tại")

    # 2. Không tính click nếu tự nhấn vào post của mình (tùy chính sách)
    if post.user_id == current_user.id:
        return {"message": "Self-click ignored"}

    # 3. Lưu bản ghi click
    new_click = AffiliateClick(
        post_id=post_id,
        referrer_id=post.user_id,
        buyer_id=current_user.id
    )
    session.add(new_click)
    session.commit()
    
    return {"message": "Click tracked successfully", "redirect_url": f"https://shopee.vn/product/{post.garment_id}"}

@router.get("/dashboard", response_model=AffiliateDashboard)
def get_affiliate_dashboard(
    session: SessionDep,
    current_user: CurrentUser
):
    """
    Thống kê hiệu quả tiếp thị liên kết của người dùng hiện tại.
    """
    # 1. Đếm tổng số click mà bài đăng của user này tạo ra
    statement = select(func.count()).where(AffiliateClick.referrer_id == current_user.id)
    total_clicks = session.exec(statement).one()

    # 2. Giả lập tỉ lệ chuyển đổi và doanh thu (Sau này sẽ dựa trên webhook từ Lazada/Shopee)
    conversion_rate = 0.05 # 5%
    commission_per_sale = 15000 # 15k VNĐ mỗi đơn thành công
    
    estimated_revenue = (total_clicks * conversion_rate) * commission_per_sale

    return AffiliateDashboard(
        total_clicks=total_clicks,
        conversion_rate=conversion_rate,
        estimated_revenue=estimated_revenue
    )