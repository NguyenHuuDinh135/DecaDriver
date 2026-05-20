# DecaDriver Local-First Setup Guide

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ LOCAL (Your Machine) - FREE                              │
├──────────────────────────────────────────────────────────┤
│ Backend:    FastAPI (localhost:8000)                     │
│ Database:   PostgreSQL + pgvector (localhost:5432)       │
│ Frontend:   Next.js (localhost:3000)                     │
└──────────────────────────────────────────────────────────┘
                    ↓ HTTPS outbound only
┌──────────────────────────────────────────────────────────┐
│ CLOUD (Only 2 services) - FREE TIER                      │
├──────────────────────────────────────────────────────────┤
│ Storage:    AWS S3 (5GB free tier + Standard egress)     │
│ GPU:        Modal serverless ($30 credits = 50 GPU hours)│
└──────────────────────────────────────────────────────────┘
```

## Why This Setup?

✅ **Local backend = Full control, no hosting cost**  
✅ **Local DB = Fast, no cold start, no network latency**  
✅ **Cloud S3 = Persistent storage, accessible from anywhere**  
✅ **Cloud GPU = Serverless, stable, better than Colab**  
✅ **Total cost: ~$0/month** (within free tiers)

## Quick Start (30 minutes)

### Prerequisites

```bash
# Check you have these
docker --version          # For PostgreSQL
node --version           # >= 20
python --version         # >= 3.10
bun --version            # For frontend
```

### Step 1: Local PostgreSQL with pgvector (5 min)

```bash
cd /home/dinh/DecaDriver

# Start PostgreSQL with pgvector
docker compose up -d db

# Verify
docker compose exec db psql -U postgres -d decadriver -c "SELECT version();"
```

### Step 2: Setup AWS S3 (10 min)

Follow: `docs/setup-aws-s3.md`

Quick steps:
1. Sign in to AWS Console: https://console.aws.amazon.com/
2. Create S3 bucket: `decadriver-assets-<your-id>`
3. Create IAM user with `AmazonS3FullAccess` (or scoped Put/Get policy)
4. Update `apps/.env`:
   ```bash
   AI_S3_BUCKET=decadriver-assets-<your-id>
   AWS_REGION=us-west-2
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   # No AWS_ENDPOINT_URL needed for standard S3
   ```

### Step 3: Setup Modal GPU Worker (15 min)

Follow: `docs/setup-modal-gpu.md`

Quick steps:
1. Install Modal: `pip install modal`
2. Setup account: `modal setup`
3. Create secret:
   ```bash
   # Get your local IP first
   ip addr show | grep "inet " | grep -v 127.0.0.1
   
   # Create secret with your local IP
   modal secret create decadriver-backend \
     BACKEND_URL=http://192.168.1.XXX:8000 \
     AI_WORKER_TOKEN=$(grep '^AI_WORKER_TOKEN=' apps/.env | cut -d= -f2-)
   ```
4. Deploy worker: `modal deploy apps/api/modal_worker.py`

### Step 4: Start Everything

```bash
# Terminal 1: Backend
cd apps/api
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd apps/web
bun run dev

# Terminal 3: Monitor Modal worker
modal app logs decadriver-tryon
```

### Step 5: Test End-to-End

1. Open http://localhost:3000
2. Register/login
3. Upload avatar photos
4. Select garment
5. Click "Try On"
6. Watch Modal logs for job processing
7. See result in app

## Current vs New Setup

### Before (All Local + Colab)

```
❌ Backend: Local (OK)
❌ Database: Local (OK)
❌ Storage: AWS S3 (costs money)
❌ GPU: Colab (unreliable, needs tunnel)
❌ Frontend: Local (OK)

Problems:
- Colab disconnects randomly
- Tunnel (localtunnel) unstable
- AWS S3 egress costs $$$
```

### After (Local + AWS S3 + Modal)

```
✅ Backend: Local (same)
✅ Database: Local (same)
✅ Storage: AWS S3 (Persistent, Industry standard)
✅ GPU: Modal (stable, serverless)
✅ Frontend: Local (same)

Benefits:
- No more Colab disconnects
- No tunnel needed
- Stable and scalable storage
- Modal more stable than Colab
- Low cost (Free tier covers initial use)
```

## File Structure

```
DecaDriver/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   └── api/routes/ai_worker.py  # Multi-worker protocol
│   │   ├── modal_worker.py              # NEW: Modal GPU worker
│   │   └── .env                         # AWS + Modal config
│   └── web/
│       └── ...
├── docs/
│   ├── setup-aws-s3.md                 # NEW: AWS S3 setup guide
│   └── setup-modal-gpu.md              # NEW: Modal setup guide
└── scripts/
    ├── colab_fashn_worker.py           # OLD: Colab worker (backup)
    └── colab_fashn_worker_ready.py     # OLD: Ready version
```

## Environment Variables

Update `apps/.env`:

```bash
# Database (Local)
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changethis
POSTGRES_DB=decadriver

# Storage (AWS S3)
AI_S3_BUCKET=decadriver-assets-<your-id>
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Worker (Modal)
AI_WORKER_TOKEN=<generate-random-token>

# Backend
SECRET_KEY=<generate-random-key>
FIRST_SUPERUSER=admin@decadriver.local
FIRST_SUPERUSER_PASSWORD=changethis
BACKEND_CORS_ORIGINS=http://localhost:3000
```

## Cost Breakdown

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Backend (Local) | Unlimited | 24/7 | $0 |
| PostgreSQL (Local) | Unlimited | 24/7 | $0 |
| AWS S3 | 5GB + Standard tier | 2-5GB | ~$0.1-0.5 |
| Modal GPU | $30 credits | 50 GPU hours | $0 |
| Frontend (Local) | Unlimited | Dev only | $0 |
| **Total** | | | **~$1/month** |

## When to Upgrade

**Stay local if:**
- Only you use the app
- Testing/development
- < 100 try-on jobs/month

**Upgrade to cloud backend ($5-10/month) when:**
- Need to share with others
- Want 24/7 uptime
- > 100 try-on jobs/month
- Need mobile app access

## Troubleshooting

### Backend can't connect to S3

```bash
# Test S3 connection
cd apps/api
uv run python - << 'PY'
from app.services.ai_client import ai_client
from app.core.config import settings
import os
print(f"Bucket: {settings.AI_S3_BUCKET}")
# Try upload
uri = ai_client.upload_bytes_to_s3(settings.AI_S3_BUCKET, "test.txt", b"hello", "text/plain")
print(f"Success: {uri}")
PY
```

### Modal worker not claiming jobs

```bash
# Check Modal logs
modal app logs decadriver-tryon

# Test backend reachable from Modal
# (Modal needs to reach your local IP, not localhost)

# Check firewall
sudo ufw status
sudo ufw allow 8000/tcp  # If using ufw

# Test from another machine on same network
curl http://YOUR_LOCAL_IP:8000/api/v1/health/
```

### PostgreSQL connection refused

```bash
# Check Docker
docker compose ps

# Restart
docker compose restart db

# Check logs
docker compose logs db
```

## Next Steps

After setup works:

1. **Seed garments:**
   ```bash
   cd apps/api
   uv run python scripts/seed_garments.py
   ```

2. **Create test user + avatar:**
   - Open http://localhost:3000
   - Register account
   - Upload 5+ photos for avatar

3. **Test try-on:**
   - Select garment
   - Click "Try On"
   - Watch Modal logs
   - See result

4. **Monitor costs:**
   - AWS S3: https://console.aws.amazon.com/s3/
   - Modal: https://modal.com/usage

## Support

- S3 issues: `docs/setup-aws-s3.md`
- Modal issues: `docs/setup-modal-gpu.md`
- Backend issues: Check `docker compose logs`
- Frontend issues: Check browser console
