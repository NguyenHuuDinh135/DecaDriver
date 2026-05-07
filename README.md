# DecaDriver

AI-powered virtual try-on fashion platform. Users create personalized AI avatars, browse garments, and generate photorealistic try-on images using self-hosted open-source models.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15 (App Router, Turbopack, React 19, Tailwind CSS v4) |
| Mobile | Expo 55, React Native 0.83, NativeWind, expo-router |
| Backend | FastAPI, SQLModel, Alembic, SageMaker |
| Database | PostgreSQL 15 + pgvector |
| AI Models | FASHN v1.5, CLIP ViT-L/14, Qwen2.5-VL-7B, DreamBooth LoRA |
| Infra | AWS (ECS Fargate, RDS, SageMaker, S3, CloudFront), Terraform |
| CI/CD | GitHub Actions |
| Package Manager | Bun |

## Monorepo Structure

```
apps/
  web/         Next.js web application
  mobile/      Expo React Native app
  api/         FastAPI backend
packages/
  ui/          Shared shadcn/ui components (@workspace/ui)
  eslint-config/
  typescript-config/
infra/         Terraform (AWS)
```

## Features

- **Virtual Try-On** — FASHN v1.5 generates photorealistic try-on images (576x864)
- **AI Avatar** — DreamBooth LoRA training per user for consistent identity
- **AI Stylist** — Qwen2.5-VL-7B analyzes body type, color tone, style recommendations
- **Smart Recommendations** — CLIP embeddings + pgvector similarity search
- **Community Feed** — Browse and share outfits
- **Cross-platform** — Web + iOS + Android from one codebase

## Prerequisites

- Node.js >= 20
- [Bun](https://bun.sh) >= 1.3
- Python 3.10+ with [uv](https://docs.astral.sh/uv/)
- Docker & Docker Compose
- AWS CLI configured (for deployment)

## Quick Start

### Install dependencies

```bash
bun install
```

### Run all apps in dev mode

```bash
bun run dev
```

### Backend only (with Docker)

```bash
cd apps/api
docker compose watch
```

### Web only

```bash
cd apps/web
bun run dev
```

### Mobile only

```bash
cd apps/mobile
bun run dev
```

## Commands

### Root (Turborepo)

```bash
bun run dev          # Start all apps
bun run build        # Build all
bun run lint         # Lint all
bun run typecheck    # TypeScript check all
bun run format       # Prettier format all
```

### Backend (apps/api)

```bash
uv sync                              # Install Python deps
docker compose watch                 # Dev with hot reload
bash ./scripts/test.sh               # Tests with coverage
uv run ruff check .                  # Lint
uv run ruff format .                 # Format
uv run mypy .                        # Type check
docker compose exec backend alembic revision --autogenerate -m "msg"
docker compose exec backend alembic upgrade head
```

### Adding UI components

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Components go to `packages/ui/src/components/` and import as `@workspace/ui/components/<name>`.

## Infrastructure

All infrastructure is managed with Terraform and deployed to AWS.

### Deploy (local)

```bash
bash infra/deploy.sh
```

This script handles both phases automatically:
1. **Phase 1** — Creates base infra (VPC, RDS, ECR, ECS, S3, CLIP endpoint)
2. **Phase 2** — Builds/pushes AI images, then creates FASHN + Qwen endpoints

### Manual Terraform

```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

### CI/CD Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | PR to main | Lint, typecheck, build |
| `deploy-web.yml` | Push to main (apps/web) | Build → S3 + CloudFront |
| `deploy-api.yml` | Push to main (apps/api) | Docker → ECR → ECS Fargate |
| `deploy-ai.yml` | Push to main (sagemaker_handlers) | FASHN image + Qwen model → S3 |

## AI Models

| Model | Purpose | Endpoint Type | Instance |
|-------|---------|--------------|----------|
| CLIP ViT-L/14 | Garment embeddings & similarity | Real-time | ml.g4dn.xlarge |
| FASHN v1.5 | Virtual try-on generation | Async | ml.g5.2xlarge |
| Qwen2.5-VL-7B | Style analysis & recommendations | Async | ml.g5.2xlarge |
| DreamBooth LoRA | Per-user avatar training | Training job | ml.g5.xlarge |

## API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/v1/demo/tryon` | Anonymous try-on demo |
| `POST /api/v1/tryon` | Create try-on job |
| `GET /api/v1/tryon/{job_id}` | Poll try-on result |
| `POST /api/v1/avatar/train` | Start avatar training |
| `GET /api/v1/avatar/{job_id}` | Poll training status |
| `POST /api/v1/stylist/analyze` | AI style analysis |
| `GET /api/v1/recommend` | Personalized recommendations |
| `GET /api/v1/garments` | Browse garment catalog |
| `GET /api/v1/health` | Service health check |

## Environment Variables

Backend requires (set via SSM in production, `.env` locally):

```
POSTGRES_SERVER, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
SECRET_KEY
AWS_REGION
AI_S3_BUCKET
SAGEMAKER_FASHN_ENDPOINT, SAGEMAKER_QWEN_ENDPOINT, SAGEMAKER_CLIP_ENDPOINT
SAGEMAKER_ROLE_ARN
FIRST_SUPERUSER, FIRST_SUPERUSER_PASSWORD
```

## License

Private — All rights reserved.
