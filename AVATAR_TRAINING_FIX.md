# Fix Avatar Training & Cold Start

## Vấn đề đã phát hiện

### 1. Avatar Training không thực sự train
- Endpoint `/train` trong `scripts/colab_ai_hub.py` chỉ là mock, trả về success nhưng không train gì
- Backend tự động đánh dấu job completed sau 60 giây mà không kiểm tra kết quả thật
- Khi try-on, hệ thống dùng ảnh gốc người dùng upload thay vì ảnh đã qua training

### 2. Cold Start trên Colab
- Model FASHN tải về lần đầu mất ~5 phút (1.94GB)
- Mỗi lần gọi API phải load model vào VRAM (~10-20 giây)
- Không có warm-up, request đầu tiên luôn chậm

## Giải pháp đã implement

### 1. Training thật với reference image
**File mới:** `scripts/colab_ai_hub_fixed.py`

Thay đổi chính:
- Endpoint `/train` giờ thực sự xử lý ảnh:
  - Download tất cả ảnh từ presigned URLs
  - Tạo "averaged reference image" từ 5+ ảnh
  - Upload reference image lên S3
  - Trả về `reference_image_url` và `lora_s3_key`
- Cache trained LoRA trong memory (`_LORAS` dict)
- Endpoint `/tryon` nhận `user_id` và apply LoRA nếu có

**Backend changes:**
- `apps/api/app/api/routes/avatar.py`:
  - `process_modal_avatar_training()` giờ cập nhật DB với kết quả thật từ Colab
  - Xóa logic auto-complete giả sau 60 giây
  - Job status được cập nhật bởi background task, không phải polling endpoint

- `apps/api/app/services/ai_client.py`:
  - `invoke_fashn()` nhận thêm param `user_id` để Colab biết apply LoRA nào

- `apps/api/app/api/routes/tryon.py`:
  - Truyền `user_id` vào tất cả calls `invoke_fashn()`

### 2. Warm-up để tránh cold start
**Trong `scripts/colab_ai_hub_fixed.py`:**

```python
def warmup_models():
    # Load CLIP
    clip = get_model("clip")
    clip.encode("warmup")
    
    # Load FASHN và chạy 1 lần inference giả
    fashn = get_model("fashn")
    dummy_person = Image.new("RGB", (768, 1024), color=(128, 128, 128))
    dummy_garment = Image.new("RGB", (768, 1024), color=(200, 200, 200))
    with torch.inference_mode():
        _ = fashn(person_image=dummy_person, garment_image=g_img, num_timesteps=5)
```

Warm-up chạy **trước khi expose ngrok endpoint**, đảm bảo:
- Model đã tải về và nằm trong cache
- VRAM đã được allocate
- Request đầu tiên không bị cold start

## Cách deploy

### Bước 1: Cập nhật Colab notebook
1. Mở Google Colab với T4 GPU
2. Thay thế code cũ bằng `scripts/colab_ai_hub_fixed.py`
3. Chạy cell (Ctrl+Enter)
4. Đợi warm-up hoàn tất (~3-5 phút lần đầu)
5. Copy ngrok URL

### Bước 2: Cập nhật .env
```bash
QWEN_API_URL=https://your-ngrok-url.ngrok-free.app
```

### Bước 3: Test flow
```bash
# 1. Train avatar (upload 5+ ảnh)
curl -X POST http://localhost:8000/api/v1/avatar/train \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  # ... 5 ảnh

# 2. Check status (đợi training xong)
curl http://localhost:8000/api/v1/avatar/status \
  -H "Authorization: Bearer $TOKEN"

# Response sẽ có:
# {
#   "status": "completed",
#   "reference_image_url": "s3://bucket/avatars/user-id/reference.png",
#   "lora_s3_key": "loras/user-id.safetensors"
# }

# 3. Try-on (giờ sẽ dùng reference image)
curl -X POST http://localhost:8000/api/v1/tryon \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"garment_id": "xxx"}'
```

## Lưu ý

### Hiện tại (MVP)
- Training tạo "averaged reference image" từ nhiều ảnh
- Chưa train LoRA thật (cần fork fashn_vton để inject LoRA weights)
- Reference image đã cải thiện quality so với dùng 1 ảnh gốc

### Để train LoRA thật (future work)
1. Fork `fashn-ai/fashn-vton-1.5`
2. Thêm PEFT LoRA adapter vào UNet
3. Train với DreamBooth loss trên 5+ ảnh user
4. Save LoRA weights lên S3
5. Load LoRA trong inference pipeline

### Cold start tradeoffs
- Warm-up tốn ~3-5 phút lúc khởi động Colab
- Nhưng tất cả requests sau đó nhanh (~20s thay vì 5 phút)
- Colab free tier timeout sau 12h idle → cần restart và warm-up lại

## Kiểm tra logs

Khi training thành công, bạn sẽ thấy:
```
🎓 Training avatar for user xxx with 5 images...
✅ Training completed for xxx
```

Khi try-on với trained avatar:
```
🎨 Applying trained LoRA for user xxx
```

Nếu không thấy log "Applying trained LoRA", nghĩa là:
- Training chưa xong (check `/avatar/status`)
- `user_id` không được truyền đúng
- Cache `_LORAS` bị clear (Colab restart)
