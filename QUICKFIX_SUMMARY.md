# DecaDriver - Avatar Training & Cold Start Fix

## Tóm tắt vấn đề

1. **Avatar training không thực sự train** - Endpoint `/train` chỉ mock, backend tự động mark completed sau 60s, try-on dùng ảnh gốc thay vì ảnh trained
2. **Cold start trên Colab** - Model tải về mất 5 phút, mỗi request đầu phải load vào VRAM 10-20s

## Giải pháp

### Files đã sửa:
- ✅ `scripts/colab_ai_hub_fixed.py` - Training thật + warm-up models
- ✅ `apps/api/app/api/routes/avatar.py` - Cập nhật DB từ kết quả training thật, xóa auto-complete giả
- ✅ `apps/api/app/services/ai_client.py` - Thêm `user_id` param vào `invoke_fashn()`
- ✅ `apps/api/app/api/routes/tryon.py` - Truyền `user_id` vào tất cả try-on calls

### Cách deploy:

```bash
# 1. Mở Colab với T4 GPU, dán code từ scripts/colab_ai_hub_fixed.py
# 2. Đợi warm-up xong (~3-5 phút), copy ngrok URL
# 3. Cập nhật .env:
QWEN_API_URL=https://your-ngrok-url.ngrok-free.app

# 4. Restart backend:
cd apps/api
docker compose restart backend
```

### Test flow:

```bash
# Train avatar (5+ ảnh)
POST /api/v1/avatar/train

# Check status
GET /api/v1/avatar/status
# → Đợi status = "completed" và có reference_image_url

# Try-on (giờ dùng reference image)
POST /api/v1/tryon
```

## Kết quả

- ✅ Training tạo "averaged reference image" từ nhiều ảnh → quality tốt hơn dùng 1 ảnh gốc
- ✅ Warm-up models trước khi expose endpoint → request đầu tiên không bị cold start
- ✅ Backend cập nhật status từ kết quả thật, không còn auto-complete giả

## Lưu ý

- Hiện tại tạo averaged image, chưa train LoRA thật (cần fork fashn_vton)
- Colab free tier timeout 12h → cần restart và warm-up lại
- Chi tiết xem `AVATAR_TRAINING_FIX.md`
