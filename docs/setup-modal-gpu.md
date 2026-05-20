# Setup Modal GPU Worker (PRO Version)

## PRO Features Enabled

- **Weights Caching:** Uses `modal.Volume` to store 2GB weights, eliminating download time after first run.
- **Fast Cold Start:** `keep_warm=1` keeps a container ready for instant inference.
- **Optimized Image:** Pre-installed dependencies and system libraries for FASHN v1.5.
- **Improved Reliability:** Robust polling and job claim logic.

## Steps

### 1. Install Modal CLI

```bash
pip install modal
# or
uv tool install modal
```

### 2. Create Modal Account & Setup

```bash
modal setup
```

### 3. Create Modal Secret

```bash
# Get your local IP first
ip addr show | grep "inet " | grep -v 127.0.0.1

# Create secret
modal secret create decadriver-backend \
  BACKEND_URL=http://YOUR_LOCAL_IP:8000 \
  AI_WORKER_TOKEN=<your-token-from-apps/.env>
```

### 4. Deploy Modal Worker

The optimized worker code is located at `apps/api/modal_worker.py`.

```bash
cd apps/api
modal deploy modal_worker.py
```

### 5. Monitor & Manage

```bash
# View live logs
modal app logs decadriver-tryon

# Stop/Start
modal app stop decadriver-tryon
modal deploy modal_worker.py
```

## Performance & Cost Optimization

### Cold Start vs. Keep Warm
- **Default:** `keep_warm=1` is active in `modal_worker.py`. This means 1 GPU container is always running, ready to process jobs in **< 1 second**.
- **Saving Credits:** If you want to save credits, change `keep_warm=1` to `keep_warm=0` in `modal_worker.py`. Cold starts will then take ~15-30 seconds.

### GPU Selection
- **T4 (16GB):** Cheapest ($0.60/hr), great for standard try-on.
- **A10G (24GB):** Faster ($1.10/hr), recommended for high-resolution or video.

## Persistence (Volume)
We use a `modal.Volume` named `decadriver-weights`. You can manage it via CLI:

```bash
# List files in volume
modal volume ls decadriver-weights

# Clear volume (force re-download)
modal volume rm decadriver-weights -r
```

## Troubleshooting

### Connection Refused
Ensure your local backend is reachable from the internet or your local network. If you are behind a strict NAT, consider using `ngrok` for the `BACKEND_URL`:

```bash
# Start ngrok
ngrok http 8000

# Update Modal secret with ngrok URL
modal secret create decadriver-backend \
  BACKEND_URL=https://your-id.ngrok-free.app \
  AI_WORKER_TOKEN=...
```

### Weights Download Error
If the first run fails during download, try running it locally once to trigger the Volume initialization:
```bash
modal run modal_worker.py
```
