import uuid
import random
from faker import Faker
from sqlmodel import Session, select
from app.core.db import engine
from app.models import User, StyleProfile, Garment, JobStatus, TryOnJob, Post, AffiliateClick
from app.core.security import get_password_hash
from sqlmodel import SQLModel

fake = Faker()

def seed_db():

    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. TÀI KHOẢN CỐ ĐỊNH
        test_user = User(
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Tester",
            is_active=True,
            is_superuser=True
        )
        session.add(test_user)
        session.flush() # Lấy ID cho user test

        # Profile cho user test để tránh lỗi API /recommend
        test_profile = StyleProfile(
            user_id=test_user.id,
            body_type="rectangle",
            color_tone="neutral",
            recommended_styles=["minimalist"]
        )
        session.add(test_profile)

        # 2. CÁC TÀI KHOẢN NGẪU NHIÊN
        for _ in range(10):
            user = User(
                email=fake.email(),
                hashed_password=get_password_hash("password123"),
                full_name=fake.name()
            )
            session.add(user)
            session.flush() # Lấy ID để tạo profile ngay bên dưới

            profile = StyleProfile(
                user_id=user.id,
                body_type=random.choice(["hourglass", "rectangle", "pear"]),
                color_tone=random.choice(["warm", "cool", "neutral"]),
                recommended_styles=["vintage", "minimalist", "streetwear"]
            )
            session.add(profile)

        # 3. TẠO GARMENT
        for _ in range(10):
            garment = Garment(
                title=fake.word().capitalize() + " Shirt",
                brand=fake.company(),
                image_url=f"https://picsum.photos/seed/{uuid.uuid4()}/576/864",
                clip_embedding=[random.uniform(-1, 1) for _ in range(768)]
            )
            session.add(garment)
        # 4. TẠO DỮ LIỆU GIẢ CHO POST (Để không bị lỗi 500 nữa)
        all_garments = session.exec(select(Garment)).all() # Lấy danh sách từ DB

        for _ in range(10):
            new_post = Post(
                content=fake.sentence(),
                image_url=fake.image_url(),
                user_id=test_user.id,
                garment_id=random.choice(all_garments).id # Sử dụng đúng tên biến đã khai báo
            )
            session.add(new_post)
        
        # 5. TẠO DỮ LIỆU CLICK GIẢ (Cho Affiliate)
        all_posts = session.exec(select(Post)).all()
        for _ in range(20):
            target_post = random.choice(all_posts)
            # Giả lập người dùng khác nhấn vào post của test_user
            click = AffiliateClick(
                post_id=target_post.id,
                referrer_id=test_user.id,
                buyer_id=random.choice([u.id for u in session.exec(select(User)).all() if u.id != test_user.id])
            )
            session.add(click)


        session.commit() # Chỉ commit 1 lần duy nhất để tối ưu tốc độ
        print("Đã tạo dữ liệu giả thành công!")

if __name__ == "__main__":
    seed_db()