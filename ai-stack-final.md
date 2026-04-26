# Stack AI — Virtual Try-On App (Self-Host toàn bộ)
> Cập nhật: tháng 4/2026 · Không Mobile-VTON · Không Kling API · 100% self-host

---

## Tổng quan kiến trúc

```
[User] → [GPU Server thuê: Vast.ai / RunPod RTX 4090]
           ├── DreamBooth LoRA     (avatar, 1 lần/user)
           ├── FASHN v1.5          (core try-on image)
           ├── CatV2TON            (video try-on, thay Kling API)
           ├── Qwen2.5-VL-7B       (AI stylist, body analysis)
           ├── DWPose              (tích hợp trong FASHN)
           ├── PuLID               (tích hợp trong FASHN)
           └── CLIP ViT-L/14       (rec engine, similarity search)
```

---

## Model 1 — DreamBooth LoRA · Avatar Foundation

**Mục đích:** Tạo "bản số" cá nhân của user, dùng mãi mãi cho mọi try-on.

**Lý do chọn:** Không có model nào thay thế được việc này. InstantID và IP-Adapter
nhận dạng khuôn mặt nhanh nhưng không tạo identity token bền vĩnh để reuse.
DreamBooth LoRA là cách duy nhất để user có avatar nhất quán qua mọi outfit.

**Specs:**
- Base model: SDXL hoặc FLUX.1-dev
- Training: ~30 phút / user trên RTX 4090
- LoRA weights: ~50–150MB / user, lưu per-user trên server
- VRAM khi train: ~20GB (RTX 4090 đủ)
- Chi phí: ~$0.25–0.50 / user (1 lần duy nhất, dùng mãi)

**Luồng:**
```
User upload 5–10 ảnh selfie tại /onboarding
→ POST /api/avatar/train
→ DreamBooth job queue (async, ~30 phút)
→ LoRA weights lưu vào storage: avatars/{userId}/lora.safetensors
→ POST /api/avatar/webhook notify user: "Avatar sẵn sàng"
→ Mọi try-on sau load LoRA này trước khi inference
```

---

## Model 2 — FASHN VTON v1.5 · Core 2D Try-On

**Mục đích:** Render ảnh try-on full quality sau khi user confirm.

**Lý do chọn thay vì các model khác:**

| Model | Vấn đề | Tại sao loại |
|---|---|---|
| IDM-VTON (ECCV 2024) | Inference >60s, cần mask thủ công cho quần | Quá chậm cho consumer app |
| CatVTON (ICLR 2025) | Latent space → VAE blur, cần mask | Output không đủ sắc nét cho logo/pattern |
| CatVTON-FLUX | ~35s inference, NC license FLUX | Chậm, license hạn chế |
| OOTDiffusion | Latent space, generation artifacts | Chất lượng thấp hơn |

FASHN v1.5 là model duy nhất giải quyết được 2 vấn đề cốt lõi đồng thời:
1. Pixel-space (không qua VAE) → không blur logo, text, pattern phức tạp
2. Maskless inference → garment rủ tự nhiên, không bị ràng buộc hình dạng mask

Thêm nữa: Apache-2.0 license → commercial use hoàn toàn tự do, self-hostable,
không vendor lock-in.

**Specs:**
- Architecture: MMDiT (Multimodal Diffusion Transformer)
- Parameters: 972M
- Output resolution: 576×864
- Inference time: ~5–7s trên H100, ~10–15s trên RTX 4090
- VRAM: ~8GB (bf16 trên Ampere+)
- License: Apache-2.0
- DWPose + PuLID đã tích hợp sẵn trong pipeline → không cần setup riêng

**Điểm yếu cần biết:**
- Output 576×864 thấp hơn CatVTON-FLUX (1024×768)
- Body shape preservation chưa hoàn hảo với synthetic triplet training
- Garment transition từ bulky sang slim có thể để lại trace

**Luồng:**
```
User bấm "Try On" sau khi xem garment
→ POST /api/tryon { userId, garmentId, category }
→ Load LoRA avatar: avatars/{userId}/lora.safetensors
→ Load person image + garment image
→ DWPose extract 133 keypoints (trong pipeline)
→ FASHN v1.5 pixel-space inference (~10–15s trên 4090)
→ PuLID face lock inline
→ Return ảnh 576×864
→ Push về app, hiển thị kết quả
```

---

## Model 3 — CatV2TON · Video Try-On

**Mục đích:** Tạo video outfit animation 5–10 giây với fabric physics, thay Kling API.

**Lý do upgrade từ Kling API sang self-host CatV2TON:**
- Kling API: $0.08–0.15/video, vendor lock-in, không control quality
- CatV2TON: self-host, $0/video sau khi có GPU, CVPR 2025 Workshop SOTA

CatV2TON là DiT-based model đầu tiên handle được cả image lẫn video try-on
trong một model duy nhất. Dùng temporal concatenation của garment và person
conditions — chỉ train 20% parameters của backbone, phần còn lại frozen.
Overlapping Clip-Based Inference + AdaCN đảm bảo temporal consistency
cho long video mà không tốn thêm VRAM.

**Specs:**
- Architecture: DiT-based (Video Diffusion Transformer)
- Backbone: pre-trained video generation model (CogVideoX-based)
- Trainable params: <20% của backbone
- Output: image 256/512px hoặc video (số frames configurable)
- VRAM: ~20–24GB cho video generation
- License: CC BY-NC-SA 4.0 (phi thương mại) → cần verify trước production

**Lưu ý license:** CatV2TON hiện là CC BY-NC-SA (non-commercial). Nếu cần
commercial license thì giữ Kling API cho video hoặc liên hệ tác giả.

**Luồng (video opt-in):**
```
User bấm "Tạo video" trên màn hình kết quả
→ POST /api/video { userId, tryOnImageId, garmentId }
→ Load LoRA avatar
→ CatV2TON nhận: person video/image + garment image + pose mask
→ Temporal concatenation inference
→ AdaCN normalize across clips
→ Render video MP4 ~10–30s generation time
→ Return MP4 về app
→ User có thể share lên feed, TikTok, Reels
```

---

## Model 4 — Qwen2.5-VL-7B · AI Stylist

**Mục đích:** Phân tích vóc dáng, tư vấn phối đồ, tạo style profile lúc onboarding.

**Lý do upgrade từ Qwen2-VL sang Qwen2.5-VL:**
Qwen2.5-VL cải thiện spatial understanding và fine-grained visual recognition
so với Qwen2-VL — quan trọng cho việc nhận diện body proportions, color tone,
và fashion-specific attributes.

**Lý do chọn 7B thay vì 72B:**
72B cần 36GB VRAM (4-bit) hoặc 144GB (bf16) — quá nặng để chạy chung
với FASHN v1.5 trên 1 GPU. 7B cần ~17GB FP16 hoặc ~8GB 4-bit AWQ,
chạy được trên cùng RTX 4090 bằng cách schedule xen kẽ với FASHN.
Chất lượng 7B đủ cho fashion styling advice — không cần 72B.

**Specs:**
- Model: Qwen/Qwen2.5-VL-7B-Instruct
- VRAM: ~17GB FP16 / ~8GB 4-bit AWQ
- Inference: ~2–5s / request
- Framework: vLLM hoặc HuggingFace Transformers
- License: Apache-2.0

**Luồng (onboarding):**
```
User upload ảnh toàn thân tại /onboarding
→ POST /api/stylist/analyze { userId, imageUrl }
→ Qwen2.5-VL-7B nhận ảnh + prompt phân tích:
   "Phân tích body type, height-weight ratio, color tone,
    và đề xuất style phù hợp. Output JSON."
→ Return style profile: {
    bodyType: "hourglass|rectangle|pear|...",
    colorTone: "warm|cool|neutral",
    heightEstimate: "tall|medium|petite",
    recommendedStyles: [...],
    avoidStyles: [...]
  }
→ Lưu vào DB: users/{userId}/styleProfile
→ Rec engine dùng profile này để filter garment suggestions
```

**Luồng (real-time advice):**
```
User đang xem garment detail
→ Qwen2.5-VL nhận: ảnh garment + style profile
→ Return: "Phù hợp với body type của bạn. Nên phối với..."
→ Hiển thị inline trong garment bottom sheet
```

---

## Model 5 — DWPose · Pose Extraction

**Mục đích:** Trích xuất 133 keypoints toàn thân làm điều kiện cho FASHN v1.5.

**Lý do giữ DWPose:** Đã tích hợp sẵn trong FASHN v1.5 pipeline
(onnxruntime-gpu, tự download weights khi first use). Không cần setup riêng,
không gọi riêng, không tốn VRAM thêm đáng kể.

Wholebody AP 66.5 — đủ chính xác cho consumer VTON.
RTMW-x AP 70.2 tốt hơn nhưng 6x nặng hơn và không tích hợp sẵn.

**Luồng:** Tự động trong FASHN inference pipeline. Transparent với developer.

---

## Model 6 — PuLID · Identity Preservation

**Mục đích:** Lock 100% khuôn mặt user xuyên suốt try-on.

**Lý do giữ:** Tích hợp sẵn trong FASHN v1.5 inference, không cần layer riêng.
Kết hợp với LoRA avatar từ DreamBooth → double layer identity lock:
LoRA đảm bảo toàn bộ appearance, PuLID đảm bảo face fidelity cụ thể.

**Luồng:** Tự động trong FASHN inference pipeline. Transparent với developer.

---

## Model 7 — CLIP ViT-L/14 · Recommendation Engine

**Mục đích:** Gợi ý garment phù hợp với style profile và lịch sử user.

**Lý do chọn:** CLIP embed garment images thành vector space. Cosine similarity
giữa garment embeddings và style profile vector → rank garments phù hợp.
Không cần train model riêng, không cần dataset thời trang đặc biệt.
Chạy trên cùng GPU server, VRAM thêm chỉ ~1–2GB.

**Specs:**
- Model: openai/clip-vit-large-patch14
- VRAM: ~1.7GB
- Embedding dim: 768
- Vector DB: pgvector (PostgreSQL) hoặc Qdrant

**Luồng:**
```
INDEXING (background job):
  Mỗi khi thêm garment mới vào catalog
  → CLIP encode garment image → vector 768 dims
  → Lưu vào vector DB

RETRIEVAL (real-time):
  User mở feed
  → Load style profile vector của user
  → Cosine similarity search trong vector DB
  → Boost score theo: lịch sử like, save, try-on
  → Return top-N garments cho feed
```

---

## Luồng hoạt động đầy đủ

### Onboarding (1 lần)
```
1. User đăng ký → /onboarding
2. Upload 5–10 ảnh selfie
   → DreamBooth LoRA train ~30 phút (async)
   → /api/avatar/webhook notify khi xong
3. Upload ảnh toàn thân
   → Qwen2.5-VL-7B phân tích body + tạo style profile JSON
4. Chọn brand yêu thích → /onboarding/brands
   → Lưu brand preferences vào DB
5. Avatar + style profile sẵn sàng → vào app
```

### Browse & Discover
```
1. User mở /feed
2. CLIP similarity search: style profile + behavior history
   → Return garment list ranked by relevance
3. User lướt reel (snap scroll, không cần VTON)
4. User tap garment → @modal bottom sheet
5. Qwen2.5-VL trả về style advice inline:
   "Phù hợp với bạn vì..."
```

### Try-On Flow
```
1. User bấm "Try On" trong garment sheet
2. POST /api/tryon { userId, garmentId, category }
3. Server:
   → Load LoRA: avatars/{userId}/lora.safetensors
   → Load person image + garment image
   → FASHN v1.5 inference:
      a. DWPose extract 133 keypoints (auto)
      b. Pixel-space MMDiT forward pass
      c. PuLID face lock (auto)
   → Return ảnh 576×864 (~10–15s)
4. App hiển thị kết quả
5. User có thể: Save / Share image / Tạo video
```

### Video Flow (opt-in)
```
1. User bấm "Tạo video" trên màn hình kết quả
2. POST /api/video { userId, tryOnImageId, garmentId }
3. Server:
   → CatV2TON nhận FASHN output + garment + pose
   → Temporal concatenation inference
   → Overlapping clip generation với AdaCN
   → Return MP4 (~20–40s generation)
4. User nhận video → share lên feed / TikTok / Reels
```

### Monetization Flow
```
1. User post look lên feed → /create/post
   → Caption + hashtag + affiliate product link
2. Người khác xem feed → click sản phẩm
   → GET /api/affiliate?ref={userId}&product={productId}
   → Log click + attribution vào DB
3. User vào /profile/affiliate
   → Dashboard: số click, conversion rate, hoa hồng tích lũy
```

---

## Hạ tầng GPU Server

**Recommend: Vast.ai hoặc RunPod — thuê theo giờ, không cam kết dài hạn**

| GPU | VRAM | Phù hợp | Giá ước tính |
|---|---|---|---|
| RTX 4090 | 24GB | MVP + production nhỏ | ~$0.50/hr |
| A10G | 24GB | Production stable | ~$0.75/hr |
| A100 40GB | 40GB | Scale up | ~$1.50/hr |
| H100 80GB | 80GB | Full throughput | ~$3.00/hr |

**VRAM allocation trên RTX 4090 (24GB):**

```
FASHN v1.5 inference:    ~8GB  (bf16)
Qwen2.5-VL-7B AWQ:      ~8GB  (4-bit)
CLIP ViT-L/14:           ~2GB
DWPose (onnx):           ~1GB
Buffer + OS:             ~5GB
─────────────────────────────
Total:                   ~24GB  ← vừa đủ RTX 4090
```

FASHN và Qwen2.5-VL không chạy đồng thời → schedule xen kẽ để share VRAM.
DreamBooth training job: chạy ban đêm hoặc queue riêng để không conflict.
CatV2TON video: ~20–24GB → cần unload model khác khi generate video,
hoặc upgrade lên A100 nếu video demand cao.

---

## Chi phí ước tính

**Server 24/7 RTX 4090 trên Vast.ai: ~$12–15/ngày (~$360–450/tháng)**

Với 1,000 users active/ngày:
- Avatar training: chỉ user mới → không phải mỗi ngày
- Image try-on: $0/request (self-host)
- Video generation: $0/request (self-host CatV2TON)
- Stylist advice: $0/request (self-host)

**Total: ~$12–15/ngày cố định, không scale theo số request**

So với stack cũ gọi API mọi thứ: ~$180/ngày
→ **Tiết kiệm ~85–90%**

---

## Tóm tắt stack cuối cùng

| Model | Vai trò | Self-host | VRAM | License |
|---|---|---|---|---|
| DreamBooth LoRA | Avatar cá nhân | ✅ Vast.ai | ~20GB (train) | Apache-2.0 |
| FASHN v1.5 | Core 2D try-on | ✅ Vast.ai | ~8GB | Apache-2.0 |
| CatV2TON | Video try-on | ✅ Vast.ai | ~20–24GB | CC BY-NC-SA* |
| Qwen2.5-VL-7B | AI Stylist | ✅ Vast.ai | ~8GB (AWQ) | Apache-2.0 |
| DWPose | Pose extraction | ✅ Trong FASHN | ~1GB | Apache-2.0 |
| PuLID | Face lock | ✅ Trong FASHN | ~0 thêm | Apache-2.0 |
| CLIP ViT-L/14 | Rec engine | ✅ Vast.ai | ~2GB | MIT |

*CatV2TON: cần verify commercial license với tác giả trước production.
 Nếu không được → giữ Kling API cho video (~$0.10/video, opt-in).
