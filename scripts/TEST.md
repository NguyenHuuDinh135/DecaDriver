# DecaDriver Test Guide

## Local Testing

### Prerequisites

```bash
# Start local services
./scripts/dev.sh mock    # No AWS needed
# OR
./scripts/dev.sh         # Real AWS (requires apps/.env)
```

### Run Tests

```bash
# Backend
cd apps/api
bash ./scripts/test.sh           # Full test suite + coverage
uv run pytest tests/ -v          # Verbose output
uv run pytest tests/api/routes/test_video_tryon.py -v  # Single file

# Frontend unit tests
cd apps/web
bun run test                     # Vitest (single run)
bun run test:watch               # Watch mode

# Frontend E2E
cd apps/web
bun run test:e2e                 # Playwright (auto-starts dev server)
```

---

## Test on Production (ALB)

URL: `http://decadriver-api-789464392.us-west-2.elb.amazonaws.com`

### 1. Health Check

```bash
curl http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/health/
# Expected: {"status":"ok"}
```

### 2. Register + Login

```bash
# Register
curl -X POST http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","full_name":"Test User"}'

# Login
curl -X POST http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/login/access-token \
  -d "username=test@example.com&password=TestPass123!"
# Returns: {"access_token":"eyJ...","token_type":"bearer"}
```

### 3. Image Try-On (FASHN)

```bash
TOKEN="eyJ..."  # from login

# Upload garment
curl -X POST http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/garments/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=White T-Shirt" \
  -F "image=@garment.jpg"

# Create try-on job
curl -X POST "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/tryon/?garment_id=<garment-uuid>" \
  -H "Authorization: Bearer $TOKEN" \
  -F "person_image=@person.jpg"
# Returns: {"id":"<job-uuid>","status":"pending",...}

# Poll result (wait ~30-60s for cold start, then ~10s)
curl "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/tryon/<job-uuid>" \
  -H "Authorization: Bearer $TOKEN"
# When done: {"status":"completed","result_url":"https://...presigned-s3-url..."}
```

### 4. Video Try-On (CatV2TON)

```bash
# Create video from completed try-on job
curl -X POST "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/video-tryon/?tryon_job_id=<job-uuid>" \
  -H "Authorization: Bearer $TOKEN"
# Returns: {"id":"<video-job-uuid>","status":"pending",...}

# Poll result (video takes longer ~2-5 min)
curl "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/video-tryon/<video-job-uuid>" \
  -H "Authorization: Bearer $TOKEN"
# When done: {"status":"completed","result_url":"https://...presigned-mp4-url..."}
```

### 5. AI Stylist (Qwen)

```bash
# Analyze style from photo
curl -X POST "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/stylist/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@fullbody.jpg"
# Returns: {"body_type":"athletic","color_tone":"warm","recommended_styles":[...],...}
```

### 6. Recommendations (CLIP)

```bash
# Get similar garments
curl "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/recommend/" \
  -H "Authorization: Bearer $TOKEN"
# Returns: [{"id":"...","title":"...","similarity":0.92,...},...]
```

### 7. Free Demo (No login needed)

```bash
curl -X POST http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/demo/tryon \
  -F "person_image=@person.jpg" \
  -F "garment_image=@garment.jpg"
# Returns: {"job_id":"<uuid>","status":"processing"}

# Poll (wait 3-5s for mock, 30-60s for real AI)
curl "http://decadriver-api-789464392.us-west-2.elb.amazonaws.com/api/v1/demo/tryon/<job_id>"
# Returns: {"status":"completed","result_url":"https://..."}
```

Auto-fallback: if FASHN endpoint is unhealthy, returns a placeholder image after 3s (mock mode).
Rate limit: 5 requests per hour per IP.

---

## Frontend Testing (Browser)

1. Go to: http://decadriver-api-789464392.us-west-2.elb.amazonaws.com
2. Click **"Get Started"** → Register
3. Complete onboarding (upload photo, select brands)
4. Go to **Try-On** tab → select garment → upload person photo → Generate
5. Wait for result → Click **"Generate Video"** → wait for MP4
6. Go to **Wardrobe** → see history
7. Go to **Profile** → check style analysis

---

## SageMaker Endpoint Status

```bash
# Check all endpoints
aws sagemaker list-endpoints --name-contains decadriver --region us-west-2 \
  --query 'Endpoints[].{Name:EndpointName,Status:EndpointStatus}' --output table

# Individual endpoint
aws sagemaker describe-endpoint --endpoint-name decadriver-catvton-prod --region us-west-2 \
  --query '{Status:EndpointStatus,Creation:CreationTime}'
```

Expected statuses:
- `InService` — ready to serve
- `Creating` — still spinning up (~5-10 min)
- `Updating` — deploying new model version
- `Failed` — check CloudWatch logs

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| CORS error in browser | `BACKEND_CORS_ORIGINS` not set | Redeploy API with correct origin |
| Try-on stuck "pending" | SageMaker cold start | Wait 3-5 min, endpoint scales from zero |
| 401 on all requests | Token expired | Re-login to get new token |
| 502 from ALB | Container crashed | Check `aws logs tail /ecs/decadriver-api` |
| Video "failed" | CatV2TON OOM on g5.xlarge | Use larger garment/person images |

---

## Cost Monitoring

```bash
# Current SageMaker costs (GPU instances)
aws ce get-cost-and-usage \
  --time-period Start=2026-05-01,End=2026-05-15 \
  --granularity DAILY \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon SageMaker"]}}' \
  --metrics BlendedCost \
  --region us-east-1 \
  --output table
```
