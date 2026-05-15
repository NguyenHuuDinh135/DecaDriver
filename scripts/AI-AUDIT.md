# DecaDriver AI Stack Audit

> Generated: 2026-05-15
> Scope: All 5 AI flows traced end-to-end (route → client → handler → infra → frontend)

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | Must fix before production use |
| HIGH | 8 | Will cause failures under normal usage |
| MEDIUM | 9 | Fragile code, potential silent failures |
| LOW | 5 | Minor issues, tech debt |

---

## CRITICAL Issues

### C1. `video_tryon.py` — Lazy load crash on `parent_job.garment`

**File:** `apps/api/app/api/routes/video_tryon.py:37-39`

```python
"garment_image_url": parent_job.garment.image_url
    if parent_job.garment
    else "",
```

**Problem:** `TryOnJob.garment` is a lazy-loaded relationship. Accessing it outside the original query context raises `DetachedInstanceError` or `MissingGreenlet` in async FastAPI. Every video try-on creation request will 500.

**Fix:** Add `selectinload(TryOnJob.garment)` to the query that fetches `parent_job`, or do a separate `session.get(Garment, parent_job.garment_id)`.

---

### C2. Avatar webhook is unauthenticated

**File:** `apps/api/app/api/routes/avatar.py:86-101`

```python
@router.post("/webhook")
def avatar_webhook(*, session: SessionDep, job_name: str, status: str) -> Any:
```

**Problem:** Any external caller can POST to `/api/v1/avatar/webhook?job_name=xxx&status=Completed` and mark any avatar job as completed or failed. No authentication, no signature verification, no IP allowlist.

**Fix:** Either:
- Add a shared secret header (`X-Webhook-Secret`) verified against an env var
- Remove the endpoint and rely solely on polling via `get_avatar_status`
- Use EventBridge → SNS → API with signature verification

---

### C3. CLIP endpoint returns wrong format → `recommend.py` always 502

**File:** `infra/environments/prod/sagemaker.tf:7-35`, `apps/api/app/api/routes/recommend.py:30-35`

**Problem:** CLIP model uses the HuggingFace managed container with `HF_TASK = "feature-extraction"`. This container:
- Does NOT load `inference_clip.py` (no `SAGEMAKER_PROGRAM` set)
- Returns nested list format: `[[0.1, 0.2, ...]]`

But `recommend.py` expects: `{"embedding": [0.1, 0.2, ...]}`

```python
clip_resp = sagemaker_client.invoke_realtime_endpoint(...)
embedding = clip_resp.get("embedding", [])  # Always [] with managed container
if not embedding:
    raise HTTPException(status_code=502, detail="CLIP returned empty embedding")
```

**Fix options:**
1. Add `SAGEMAKER_PROGRAM = "inference_clip.py"` to CLIP model env + upload the script as `model_data_url`
2. OR change `recommend.py` to parse the HuggingFace format: `embedding = clip_resp[0] if isinstance(clip_resp, list) else clip_resp.get("embedding", [])`

---

### C4. AWS Region inconsistency

**Files:**
- `apps/api/app/core/config.py:98` → `AWS_REGION: str = "us-west-2"`
- `infra/environments/prod/variables.tf:3` → `default = "us-west-2"`
- `.github/workflows/deploy-ai.yml:11` → `AWS_REGION: us-west-2`
- Git history: commits titled "fix: update AWS region from us-west-2 to us-east-1"

**Problem:** Commit messages say region was changed to us-east-1, but all config files still say us-west-2. If the actual infrastructure is in us-east-1, all SageMaker and ECR calls from the API will fail cross-region.

**Fix:** Verify actual deployed region with `aws ecs describe-clusters --cluster decadriver --region us-west-2` and `us-east-1`. Standardize all files to the correct region.

**Current status:** Verified — actual deployment is in us-west-2 (health check responds, ECS tasks running). The commit messages were a false alarm (later reverted). No action needed.

---

### C5. Qwen handler cannot load S3 images

**File:** `apps/api/app/services/sagemaker_handlers/inference_qwen.py:34`

```python
inputs = processor(text=[text], images=[image_url], return_tensors="pt")
```

**Problem:** `image_url` can be an `s3://` URI (e.g., from avatar's `reference_image_url`). The HuggingFace `AutoProcessor` does not understand S3 URIs — it expects HTTP URLs or local file paths. This will crash with an exception.

FASHN and CatV2TON handlers correctly implement `_load_image()` to handle both HTTPS and S3 URIs.

**Fix:** Add the same `_load_image()` helper to `inference_qwen.py`:
```python
def _load_image(url: str) -> Image.Image:
    if url.startswith("s3://"):
        bucket, key = url.replace("s3://", "").split("/", 1)
        obj = _s3.get_object(Bucket=bucket, Key=key)
        return Image.open(io.BytesIO(obj["Body"].read()))
    resp = requests.get(url, timeout=30)
    return Image.open(io.BytesIO(resp.content))
```

---

## HIGH Issues

### H1. SageMakerClient crashes on import without AWS credentials

**File:** `apps/api/app/services/sagemaker_client.py:99`

```python
sagemaker_client = SageMakerClient()  # Module-level instantiation
```

**Problem:** `__init__` calls `boto3.client(...)` at import time. If the container starts without IAM credentials attached (brief window during ECS task startup), the entire FastAPI app fails to import → health check fails → container restarts in a loop.

**Fix:** Use lazy initialization:
```python
_client: SageMakerClient | None = None

def get_sagemaker_client() -> SageMakerClient:
    global _client
    if _client is None:
        _client = SageMakerClient()
    return _client
```

---

### H2. `tryon.py` mutates ORM objects with presigned URLs

**File:** `apps/api/app/api/routes/tryon.py:87-92, 103-105`

**Problem:** The GET route overwrites `job.result_url` with a presigned HTTPS URL:
```python
job.result_url = sagemaker_client.generate_presigned_url(result_s3)
```

This mutates the ORM object. If `session.commit()` is called (explicitly or via auto-flush), the presigned URL (expires in 1h) gets written permanently to the database. Future reads will return an expired URL.

**Fix:** Store `s3://` URI permanently in DB. Generate presigned URL only at serialization time:
```python
response_url = sagemaker_client.generate_presigned_url(job.result_url) \
    if job.result_url and job.result_url.startswith("s3://") else job.result_url
```

---

### H3. Video try-on uses expired presigned URL as input

**File:** `apps/api/app/api/routes/video_tryon.py:36`

```python
"person_image_url": parent_job.result_url,  # Could be expired presigned URL
```

**Problem:** Due to H2, `parent_job.result_url` may contain a presigned HTTPS URL that expired after 1 hour. When the CatV2TON handler tries to download it, it gets a 403 Forbidden.

**Fix:** Depends on fixing H2 first. If `result_url` stores `s3://`, the handler's `_load_image()` will fetch it directly from S3 (no expiry).

---

### H4. Stylist route blocks the event loop for 30 seconds

**File:** `apps/api/app/api/routes/stylist.py:26-52`

```python
async def analyze_style(...):
    ...
    for _ in range(30):
        await asyncio.sleep(1)
        result = sagemaker_client.get_async_result(output_s3_uri)  # BLOCKING
```

**Problem:** `sagemaker_client.get_async_result()` is a synchronous boto3 S3 call. Inside an `async def` route, this blocks the entire asyncio event loop for up to 30 seconds per request, starving all other concurrent requests.

**Fix:** Either:
1. Use `await asyncio.to_thread(sagemaker_client.get_async_result, ...)` for each blocking call
2. Or adopt the same pattern as FASHN/CatV2TON: create job, return immediately, poll via GET endpoint

---

### H5. `inference_clip.py` is never deployed anywhere

**File:** `apps/api/app/services/sagemaker_handlers/inference_clip.py`

**Problem:** The file exists with custom logic (normalize embeddings, return `{"embedding": [...]}`), but:
- `deploy-ai.yml` never builds/uploads it
- No ECR repo `decadriver-clip` exists
- `sagemaker.tf` uses HuggingFace managed container without `SAGEMAKER_PROGRAM`

The custom handler is dead code. Production CLIP uses the managed container's default behavior.

**Fix:** Either deploy the custom handler (create ECR repo, Dockerfile, CI step) or delete the file and fix `recommend.py` to parse the managed container format.

---

### H6. Avatar `reference_image_url` is arbitrary training photo

**File:** `apps/api/app/api/routes/avatar.py:36-37`

```python
if i == 0:
    reference_image_url = s3_uri  # First uploaded photo, could be anything
```

**Problem:** FASHN try-on uses this as `person_image_url`. If the user uploads face closeups for DreamBooth training, the first image becomes the "person image" for try-on — which requires a full-body shot. Result: garbled AI output.

**Fix:** Either:
- Require the first upload to be a full-body shot (add validation/guidance in frontend)
- Store `reference_image_url` separately from training data (explicit "reference photo" upload step)
- Generate a reference image from the trained LoRA (neutral pose rendering) after training completes

---

### H7. Qwen container needs internet access to download 7B model weights

**File:** `.github/workflows/deploy-ai.yml:57-59`, `infra/environments/prod/sagemaker.tf:82-96`

**Problem:** `model_data_url` tar only contains `inference_qwen.py` (3KB). The container relies on `HF_MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"` to download ~14GB of weights from HuggingFace Hub at cold start. SageMaker instances in a VPC don't have internet access unless NAT gateway or VPC endpoints are configured.

**Impact:** If no internet → model fails to load → endpoint goes to `Failed` state. If internet available → cold start takes 10-15 minutes downloading 14GB.

**Fix:** Pre-download weights, pack into `model_data_url` tar on S3 (similar to FASHN approach). Or ensure VPC has NAT gateway (currently configured for ECS, need to verify SageMaker subnets).

---

### H8. Missing `db_password` SSM parameter in Terraform

**File:** `infra/environments/prod/ecs.tf:119`

```hcl
{ name = "POSTGRES_PASSWORD", valueFrom = aws_ssm_parameter.db_password.arn }
```

**Problem:** `aws_ssm_parameter.db_password` is referenced but not defined in `ssm.tf`. This makes `terraform plan` fail.

**Current status:** The parameter likely exists manually in AWS (since the app is running). But Terraform state is inconsistent.

**Fix:** Add to `ssm.tf`:
```hcl
resource "aws_ssm_parameter" "db_password" {
  name  = "/decadriver/prod/db_password"
  type  = "SecureString"
  value = var.db_password  # Or reference from RDS module
}
```

---

## MEDIUM Issues

### M1. Frontend polls `"processing"` status that backend never sets

**Files:** `apps/web/lib/hooks/use-tryon.ts`, backend `JobStatus` enum

Backend only transitions: `pending` → `completed` / `failed`. The `processing` state exists in the enum but is never written. Frontend polls both `pending` and `processing`, which is harmless but dead logic.

---

### M2. `video_tryon.py` has no list endpoint

**File:** `apps/api/app/api/routes/video_tryon.py`

Unlike `tryon.py` (which has `GET /` to list all jobs), video try-on has no list endpoint. After a page reload, the frontend cannot recover a pending video job unless it stored the `job_id` in localStorage.

---

### M3. pgvector query in `recommend.py` uses fragile string cast

**File:** `apps/api/app/api/routes/recommend.py:42-49`

```python
emb=str(embedding)  # Python list repr: [0.1, 0.2, ...]
# vs pgvector expected: [0.1,0.2,...] (no spaces)
```

Depends on PostgreSQL/pgvector version whether this parses correctly.

---

### M4. `Dockerfile.catvton` clones CatVTON without pinning commit

**File:** `apps/api/app/services/sagemaker_handlers/Dockerfile.catvton:5`

```dockerfile
RUN git clone --depth 1 https://github.com/Zheng-Chong/CatVTON.git /opt/catvton
```

If upstream repo renames `CatVTONVideoPipeline` class, build succeeds but runtime fails.

---

### M5. `deploy-ai.yml` hardcodes S3 bucket name

**File:** `.github/workflows/deploy-ai.yml:59`

```bash
aws s3 cp /tmp/qwen.tar.gz s3://decadriver-ai-assets-246859065778/models/qwen/source.tar.gz
```

Should use `${{ secrets.AI_BUCKET }}` or derive from account ID.

---

### M6. `use-stylist.ts` fires recommendations too eagerly

**File:** `apps/web/lib/hooks/use-stylist.ts`

`useRecommendations` is `enabled: !!profile` — fires even when profile has all null fields. Should check `profile.recommended_styles?.length > 0`.

---

### M7. `Dockerfile.fashn` — not found (possibly inline in deploy script)

FASHN Dockerfile should exist at `apps/api/app/services/sagemaker_handlers/Dockerfile.fashn` but was not found during audit. If it doesn't exist, `deploy.sh ai` step will fail for FASHN builds.

---

### M8. `inference_catvton.py` imports `CatVTONVideoPipeline` which may not exist

**File:** `apps/api/app/services/sagemaker_handlers/inference_catvton.py`

The import `from catvton import CatVTONVideoPipeline` assumes this class exists in the cloned repo. The actual CatVTON repo may use a different class name or module structure. No pinned commit/tag means this can break any time upstream changes.

---

### M9. Demo endpoint rate limiter not shared across workers

**File:** `apps/api/app/api/routes/demo.py`

`_rate` dict is in-memory per-worker. With 4 workers, effective rate limit is 20 req/h per IP (5 per worker × 4 workers), not 5. Job store was fixed to file-based, but rate limiter wasn't.

---

## LOW Issues

### L1. `config.py` — `AWS_REGION` default should match deployment

Default `"us-west-2"` is correct for current deployment but confusing given commit history.

---

### L2. Presigned URL expiry (1h) causes stale images in history

**File:** `apps/api/app/services/sagemaker_client.py:74`

Once result is `completed` and user views it after 1h, the URL is expired. Should re-generate on each request (related to H2 fix).

---

### L3. `avatar.py` hardcodes `lora.safetensors` path

**File:** `apps/api/app/api/routes/avatar.py:81, 105`

```python
job.lora_s3_key = f"avatars/{current_user.id}/lora.safetensors"
```

SageMaker training output is `<output_path>/<job-name>/output/model.tar.gz`. The hardcoded path won't match unless the DreamBooth script specifically outputs to that filename.

---

### L4. `use-video-tryon.ts` invalidates all video results on create

Invalidates `["videoTryOnResult"]` without jobId → clears all cached video results unnecessarily.

---

### L5. `use-avatar.ts` — `useHasAvatar()` returns false during loading

No way for callers to distinguish "loading", "no avatar", and "error" states. May flash wrong UI state.

---

## Fix Priority Matrix

| Priority | Issues | Effort | Impact |
|----------|--------|--------|--------|
| P0 (Now) | C1, H2, H3 | 1-2h | Fixes video try-on crash + presigned URL corruption |
| P1 (This week) | C3, C5, H4 | 3-4h | Makes CLIP recommendations + Qwen stylist work |
| P2 (Next week) | C2, H1, H5, H6 | 4-6h | Security + reliability + avatar flow |
| P3 (Backlog) | H7, H8, M1-M9, L1-L5 | 8-12h | Infrastructure + polish |

---

## Verification Commands

```bash
# After fixing C1 (video_tryon lazy load):
cd apps/api
uv run pytest tests/api/routes/test_video_tryon.py -v

# After fixing C3 (CLIP format):
curl -H "Authorization: Bearer $TOKEN" \
  http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/recommend/

# After fixing H2 (presigned URL storage):
# Create a try-on job, wait for completion, then check DB:
uv run python -c "
from app.core.db import engine
from sqlmodel import Session, select
from app.models import TryOnJob
with Session(engine) as s:
    job = s.exec(select(TryOnJob).limit(1)).first()
    print(f'result_url starts with s3://: {job.result_url.startswith(\"s3://\") if job and job.result_url else \"N/A\"}')
"
```
