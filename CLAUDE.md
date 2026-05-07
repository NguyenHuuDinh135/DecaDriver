# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DecaDriver is a virtual try-on fashion platform. Users create AI avatars (DreamBooth LoRA), browse garments, and generate try-on images via FASHN v1.5 inference. The system includes AI styling (Qwen2.5-VL-7B), CLIP-based recommendations, and video try-on (CatV2TON).

## Monorepo Structure

- **apps/web** — Next.js 16 (App Router, Turbopack, React 19, Tailwind CSS v4)
- **apps/mobile** — Expo 55 / React Native 0.83 (NativeWind, expo-router)
- **apps/api** — Python FastAPI (SQLModel, Alembic, SageMaker integration)
- **packages/ui** — Shared shadcn/ui components (imported as `@workspace/ui`)
- **packages/eslint-config** — Shared ESLint config
- **packages/typescript-config** — Shared tsconfig
- **infra/** — Terraform (AWS: ECS Fargate, RDS PostgreSQL+pgvector, SageMaker, S3+CloudFront)

## Commands

### Root (Bun + Turborepo)

```bash
bun install              # Install all workspace deps
bun run dev              # Start all apps in dev mode
bun run build            # Build all (web outputs to apps/web/out)
bun run lint             # Lint all workspaces
bun run typecheck        # TypeScript check all workspaces
bun run format           # Prettier format all
```

### Backend — apps/api (Python, managed with `uv`)

```bash
cd apps/api
uv sync                  # Install Python deps
bash ./scripts/test.sh   # Run tests with coverage
docker compose watch     # Local dev with hot reload

# Single test
uv run pytest tests/path_to_test.py -v

# Linting
uv run ruff check .
uv run ruff format .
uv run mypy .

# Migrations
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

### Web — apps/web

```bash
cd apps/web
bun run dev              # Next.js dev with Turbopack
bun run build            # Production build
bun run typecheck        # Type check
```

### Mobile — apps/mobile

```bash
cd apps/mobile
bun run dev              # Expo start (clears cache)
bun run android          # Start on Android
bun run ios              # Start on iOS
```

### Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Components land in `packages/ui/src/components/` and are imported as `@workspace/ui/components/<name>`.

## Architecture

### Backend (apps/api)

```
app/
├── main.py              # FastAPI app, CORS, Sentry
├── models.py            # All SQLModel models (User, Garment, TryOnJob, StyleProfile, AvatarJob)
├── crud.py              # Generic CRUD operations
├── api/
│   ├── main.py          # Router registration (all routes under /api/v1)
│   ├── deps.py          # DI: SessionDep, CurrentUser (JWT-based)
│   └── routes/          # Route modules: tryon, avatar, stylist, recommend, health, demo...
├── core/
│   ├── config.py        # Pydantic Settings (env-driven)
│   ├── db.py            # SQLModel engine
│   └── security.py      # JWT + password hashing
└── services/
    ├── sagemaker_client.py          # Singleton: async/realtime endpoints, training jobs, S3 upload
    └── sagemaker_handlers/          # Deployed to SageMaker as inference code
        ├── inference_fashn.py       # FASHN v1.5 try-on (person_image_url + garment_image_url)
        ├── inference_clip.py        # CLIP embeddings for garment similarity
        └── inference_qwen.py        # Qwen2.5-VL style analysis
```

Key patterns:
- Routes use `SessionDep` and `CurrentUser` type aliases from `deps.py`
- AI inference is async via SageMaker: submit job → poll S3 for result
- Models use SQLModel (SQLAlchemy + Pydantic unified): table models have `table=True`, response schemas are plain SQLModel classes

### Web (apps/web)

Uses Next.js App Router with route groups:
- `(auth)/` — Login, onboarding (fullscreen, no nav)
- `(app)/` — Main app with bottom nav: feed, try-on, create, wardrobe, profile

### Infrastructure

AWS us-east-1, deployed via GitHub Actions:
- `deploy-web.yml` → S3 + CloudFront (static export)
- `deploy-api.yml` → ECR + ECS Fargate
- `deploy-ai.yml` → S3 model artifacts for SageMaker
- `terraform.yml` → Infrastructure changes

SageMaker endpoints:
- CLIP — real-time (ml.g4dn.xlarge)
- FASHN + Qwen — async with scale-to-zero (ml.g5.2xlarge)

## Key Config

- **Package manager**: Bun (lockfile: `bun.lock`)
- **Prettier**: no semi, double quotes, trailing comma es5, tabWidth 2, tailwind plugin
- **Python linting**: ruff (select E/W/F/I/B/C4/UP/ARG001/T201), mypy strict
- **Python testing**: pytest with coverage
- **CI**: On PR to main — bun install → lint → typecheck → build (web only)
