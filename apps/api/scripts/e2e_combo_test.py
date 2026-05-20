import io
import uuid
import os
import time
from sqlmodel import Session, select
from fastapi.testclient import TestClient
from app.main import app
from app.core.db import engine
from app.core.config import settings
from app.models import User, Garment, UserCreate
from app import crud
from app.services.ai_client import ai_client

client = TestClient(app)

def setup_test_data():
    with Session(engine) as session:
        # Create a test user
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user_in = UserCreate(email=email, password="password", full_name="Test User")
        user = crud.create_user(session=session, user_create=user_in)
        
        # Upload images to S3 and create Garment records
        print("📸 Uploading test garments to S3...")
        
        asset_dir = "../../test_assets"
        
        with open(f"{asset_dir}/top_shirt.jpg", "rb") as f:
            top_bytes = f.read()
        top_uri = ai_client.upload_bytes_to_s3(settings.AI_S3_BUCKET, f"test_assets/top_{uuid.uuid4().hex}.jpg", top_bytes, "image/jpeg")
        
        with open(f"{asset_dir}/bottom_jeans.jpg", "rb") as f:
            bottom_bytes = f.read()
        bottom_uri = ai_client.upload_bytes_to_s3(settings.AI_S3_BUCKET, f"test_assets/bottom_{uuid.uuid4().hex}.jpg", bottom_bytes, "image/jpeg")
        
        top_url = ai_client.generate_presigned_url(top_uri)
        bottom_url = ai_client.generate_presigned_url(bottom_uri)

        top_garment = Garment(title="Test Top", image_url=top_url)
        bottom_garment = Garment(title="Test Bottom", image_url=bottom_url)
        
        session.add(top_garment)
        session.add(bottom_garment)
        session.commit()
        session.refresh(top_garment)
        session.refresh(bottom_garment)
        
        # Capture data before session closes to avoid DetachedInstanceError
        user_email = user.email
        top_id = top_garment.id
        bottom_id = bottom_garment.id
        
        return user_email, top_id, bottom_id, user_in.password

def run_e2e_test():
    print("🚀 Bắt đầu kịch bản E2E Test: Avatar Training & Combo Try-on")
    
    # 1. Setup Test Data
    user_email, top_id, bottom_id, password = setup_test_data()
    print(f"✅ Đã tạo Test User: {user_email}")
    print(f"✅ Đã tạo Top Garment: {top_id}")
    print(f"✅ Đã tạo Bottom Garment: {bottom_id}")
    
    # 2. Login
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": user_email, "password": password}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Đã đăng nhập thành công")
    
    # 3. Avatar Training
    print("🧬 Gửi yêu cầu huấn luyện Avatar...")
    files = []
    asset_dir = "../../test_assets"
    for i in range(1, 6):
        files.append(("images", (f"face_{i}.jpg", open(f"{asset_dir}/face_{i}.jpg", "rb"), "image/jpeg")))
    
    response = client.post(
        f"{settings.API_V1_STR}/avatar/train",
        headers=headers,
        files=files
    )
    
    # Close files
    for _, file_tuple in files:
        file_tuple[1].close()
        
    if response.status_code != 200:
        print(f"❌ Lỗi Train Avatar: {response.text}")
        return
        
    print("✅ Đã gửi lệnh Train Avatar. Chờ 65s (Mock trainer)...")
    
    time.sleep(65) # Wait for the mock 60s rule in get_avatar_status to trigger
    
    response = client.get(f"{settings.API_V1_STR}/avatar/status", headers=headers)
    assert response.status_code == 200
    if response.json()["status"] != "completed":
        print(f"⚠️ Cảnh báo: Avatar chưa completed (Status: {response.json()['status']})")
        # Retry once
        time.sleep(5)
        response = client.get(f"{settings.API_V1_STR}/avatar/status", headers=headers)

    assert response.json()["status"] == "completed"
    print("✅ Đã có Avatar hoàn chỉnh!")
    
    # 3.5 Wait a bit before next big task
    print("⏳ Nghỉ 10s trước khi bắt đầu Try-on...")
    time.sleep(10)
    
    # 4. Combo Try-on
    print("👗 Bắt đầu luồng thử bộ (Top + Bottom)...")
    payload = {
        "top_garment_id": str(top_id),
        "bottom_garment_id": str(bottom_id)
    }
    response = client.post(
        f"{settings.API_V1_STR}/tryon/combo",
        headers=headers,
        json=payload
    )
    if response.status_code != 200:
        print(f"❌ Lỗi Combo Try-on: {response.text}")
        return
        
    job_id = response.json()["id"]
    print(f"✅ Đã tạo Job Combo Try-on: {job_id}")
    print("⏳ Vui lòng chờ Background Task gọi sang Modal (có thể mất 1-2 phút cho lần đầu)...")
    
    # Polling for result
    print("⏳ Bắt đầu đợi kết quả từ AI Hub (Tối đa 5 phút)...")
    for i in range(30):
        time.sleep(10)
        response = client.get(f"{settings.API_V1_STR}/tryon/combo/{job_id}", headers=headers)
        if response.status_code == 200:
            status = response.json()["status"]
            print(f"   [{i*10}s] Trạng thái: {status}")
            if status == "completed":
                print("🎉 THÀNH CÔNG! Đã có kết quả Mặc Cả Bộ.")
                print(f"🔗 Link xem ảnh S3: {response.json()['result_url']}")
                return
            elif status == "failed":
                print("❌ Job thất bại.")
                return
        else:
            print(f"   ⚠️ Lỗi khi check status: {response.text}")
    
    print("⚠️ Timeout: AI xử lý quá lâu. Hãy kiểm tra tab Colab để xem tiến độ thực tế.")

if __name__ == "__main__":
    run_e2e_test()
