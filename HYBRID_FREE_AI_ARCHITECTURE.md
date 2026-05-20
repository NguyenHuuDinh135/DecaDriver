# Hybrid Free AI Architecture for DecaDriver Try-On

## Goal

Giữ Try-On chạy trên Colab miễn phí, nhưng làm hệ thống ổn định hơn, ít phụ thuộc ngrok URL, ít cold start, và output có format catalog: người đứng thẳng + nền trắng/sạch.

## Key Insight

Colab không ổn định khi dùng như public API server:
- Ngrok URL đổi mỗi lần restart.
- Colab idle/disconnect bất kỳ lúc nào.
- GPU T4 14.5GB dễ OOM nếu load quá nhiều model cùng lúc.
- Inbound API qua ngrok dễ lỗi, timeout, URL chết.

Giải pháp ổn hơn: biến Colab thành GPU worker, không phải API server chính.

Backend/API chính luôn chạy ổn định. Colab chỉ pull job từ backend, xử lý GPU, upload result.

---

## Recommended Architecture

```
Mobile/Web
  -> FastAPI backend stable
     -> DB job queue: tryon_job pending
     -> S3 input/output storage

Colab GPU Worker
  -> Poll backend: GET /api/v1/ai-worker/jobs/next
  -> Download person + garment images
  -> Run FASHN
  -> Optional background cleanup
  -> Upload result to S3
  -> POST /api/v1/ai-worker/jobs/{id}/complete

Web/Mobile
  -> Poll normal job status endpoint
  -> Display result_url
```

## Why this is better than ngrok inbound API

### Current design

Backend calls:

```
POST https://random-ngrok-url/tryon
```

Problems:
- Backend must know live Colab URL.
- If Colab restarts, URL breaks.
- If request times out, job may be lost.
- Colab must be online exactly when user clicks.

### Hybrid worker design

Colab calls backend:

```
GET /worker/jobs/next
POST /worker/jobs/{id}/complete
```

Benefits:
- Backend URL stable.
- No need ngrok for GPU worker.
- Colab can reconnect anytime and continue pending jobs.
- If Colab dies, jobs stay pending/failed in DB.
- Can run multiple workers later: Colab + Kaggle + Lightning.

---

## Free/Low-Cost Worker Options

### Tier 1: Colab Worker

Use Colab as the main GPU worker.

Best for:
- Free GPU experiments.
- Demo/MVP.
- Manual operation.

Use worker-poll pattern, not ngrok API.

### Tier 2: Kaggle Notebook Worker

Kaggle notebooks can be used similarly: run a long polling worker that pulls jobs from backend.

Best for:
- Extra free GPU time.
- Backup worker when Colab quota is exhausted.

Limits:
- Manual start still needed.
- Session duration/quota constraints.

### Tier 3: Lightning AI Studio / Free credits worker

Can run the same worker script.

Best for:
- More stable than Colab when free credits exist.
- Same pull-worker architecture.

### Avoid for free stable production

- Public ngrok-only API as the main architecture.
- Always-on free GPU endpoint: practically not reliable/free.
- Loading CLIP + FASHN + segmentation + extra SD models all in one T4 runtime.

---

## Output Quality Strategy

For output like Doji catalog image, do not rely on arbitrary user photo pose.

Use two separate concepts:

1. User identity/body data from uploaded photos.
2. Canonical catalog person image used as FASHN input.

### Recommended MVP

During onboarding:

1. User uploads 2 full-body photos.
2. Backend/worker validates:
   - one person only
   - full body visible
   - no bag/phone/pet/friend
   - sufficient resolution
3. Worker picks best photo.
4. Worker preprocesses it:
   - background remove
   - crop person
   - center on 768x1024 canvas
   - white background
5. Save as `avatar_job.reference_image_url`.

Try-On always uses this canonical reference image, not the raw original photo.

This gives more consistent output without training a real avatar model.

### Better version

Generate a canonical standing avatar from uploaded photos:

- Use pose-controlled generation with a fixed standing pose.
- Then use this generated standing avatar as FASHN person input.

Possible GPU models:
- Stable Diffusion + ControlNet OpenPose + IP-Adapter/InstantID/PhotoMaker.

But this is heavier and may not fit well together with FASHN on T4. If used, run it in a separate Colab worker mode, not in the same process as FASHN.

---

## Memory/OOM Strategy for T4

Do not load all models at once.

### Bad

```
CLIP loaded
FASHN loaded
rembg loaded
warm-up FASHN inference
extra avatar model loaded
```

This causes CUDA OOM on T4.

### Good

Load model by task type:

- `clip` task: load CLIP, run, unload CLIP.
- `tryon` task: load FASHN only, run, keep FASHN if memory OK.
- `preprocess` task: run rembg on CPU or separate lightweight session.
- `avatar-generate` task: use separate worker/session, not same as FASHN.

### Recommended code policy

- No FASHN warm-up inference at 768x1024.
- Pre-download weights only.
- Load FASHN on first try-on request.
- Use `torch.cuda.empty_cache()` after each job.
- If OOM, restart worker runtime and job remains pending/retryable.

---

## Backend Changes Needed

### 1. Add worker token config

Env:

```
AI_WORKER_TOKEN=long-random-token
```

### 2. Add worker routes

Create:

```
apps/api/app/api/routes/ai_worker.py
```

Routes:

```
GET /api/v1/ai-worker/jobs/next
POST /api/v1/ai-worker/jobs/{job_id}/complete
POST /api/v1/ai-worker/jobs/{job_id}/fail
POST /api/v1/ai-worker/heartbeat
```

### 3. Job lifecycle

Use existing `TryOnJob`:

- `pending`: waiting for worker
- `processing`: claimed by worker
- `completed`: result uploaded
- `failed`: worker failed too many times

Add optional fields later:

- `worker_id`
- `claimed_at`
- `error_message`
- `attempt_count`

For MVP, can use current fields and keep claims simple.

### 4. Try-On creation changes

Current backend immediately calls Colab URL in background task.

Change to:

- Create `TryOnJob(status=pending, sagemaker_output_s3=output_s3_uri)`
- Do not call Colab directly.
- Worker will pick up job.

---

## Colab Worker Flow

Worker loop:

```python
while True:
    job = requests.get(BACKEND_URL + "/api/v1/ai-worker/jobs/next", headers=auth).json()
    if not job:
        time.sleep(5)
        continue

    try:
        result_s3 = run_tryon(job)
        requests.post(BACKEND_URL + f"/api/v1/ai-worker/jobs/{job['id']}/complete", json={"result_url": result_s3}, headers=auth)
    except Exception as e:
        requests.post(BACKEND_URL + f"/api/v1/ai-worker/jobs/{job['id']}/fail", json={"error": str(e)}, headers=auth)
```

No ngrok needed.

---

## Recommended Implementation Order

1. Remove direct Colab call from `create_tryon_job`.
2. Add worker routes with token auth.
3. Write simple Colab worker loop.
4. Run worker manually in Colab.
5. Verify job queue end-to-end.
6. Add preprocessing/postprocessing after the queue works.
7. Add retry/timeout logic.
8. Add optional second worker type for avatar canonicalization.

---

## Final Recommendation

For DecaDriver MVP, use this stack:

- Backend/API: existing FastAPI + DB + S3.
- GPU Try-On: Colab worker polling backend.
- Backup GPU: Kaggle/Lightning worker using same script.
- Image preprocessing: CPU/rembg on worker or backend.
- Output consistency: canonical avatar reference image, not raw user photo.
- No ngrok dependency for production-like flow.

This is the most stable free/hybrid architecture while keeping expensive FASHN inference on free GPU.
