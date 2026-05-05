import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func, desc

from app.api.deps import SessionDep, CurrentUser
from app.models import (
    Post, 
    PostPublic, 
    PostBase,
    Like,
    PostsPublic
)

router = APIRouter(prefix="/social", tags=["Social"])


@router.post("/", response_model=PostPublic)
def create_social_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_in: PostBase
):
    """Chia sẻ kết quả thử đồ lên bảng tin cộng đồng."""
    db_post = Post.model_validate(
        post_in, 
        update={"user_id": current_user.id}
    )
    session.add(db_post)
    session.commit()
    session.refresh(db_post)
    return db_post


@router.get("/feed", response_model=PostsPublic)
def get_main_feed(
    session: SessionDep,
    skip: int = 0,
    limit: int = 20
):
    """Lấy danh sách bài đăng mới nhất cho trang khám phá (Feed)."""
    # Count total
    count_statement = select(func.count()).select_from(Post)
    total = session.exec(count_statement).one()

    # Get posts
    statement = (
        select(Post)
        .order_by(desc(Post.created_at))
        .offset(skip)
        .limit(limit)
    )
    posts = session.exec(statement).all()

    return PostsPublic(data=posts, count=total)


@router.get("/me", response_model=PostsPublic)
def get_my_posts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 20
):
    """Lấy danh sách bài đăng của chính mình."""
    count_statement = select(func.count()).where(Post.user_id == current_user.id)
    total = session.exec(count_statement).one()

    statement = (
        select(Post)
        .where(Post.user_id == current_user.id)
        .order_by(desc(Post.created_at))
        .offset(skip)
        .limit(limit)
    )
    posts = session.exec(statement).all()

    return PostsPublic(data=posts, count=total)


@router.post("/{post_id}/like")
def like_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID
):
    """Like một bài post."""
    # Kiểm tra post tồn tại
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Kiểm tra đã like chưa
    existing_like = session.exec(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.post_id == post_id
        )
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")

    like = Like(user_id=current_user.id, post_id=post_id)
    session.add(like)
    session.commit()
    
    return {"message": "Liked successfully"}


@router.delete("/{post_id}/like")
def unlike_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID
):
    """Bỏ like bài post."""
    like = session.exec(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.post_id == post_id
        )
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    session.delete(like)
    session.commit()
    
    return {"message": "Unliked successfully"}


@router.delete("/{post_id}")
def delete_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID
):
    """Xóa bài đăng của chính mình."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(post)
    session.commit()
    return {"message": "Post deleted successfully"}