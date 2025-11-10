# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope
- Full‑stack JavaScript/TypeScript monorepo under dev/:
  - Backend: NestJS API with Prisma/PostgreSQL, Redis, JWT, Swagger.
  - Frontend: Next.js 14 (App Router) with Tailwind, shadcn/ui, React Query, Zustand, PWA.
  - Local infra via docker-compose (Postgres, Redis, backend, frontend).
- Comprehensive product and architectural docs live in notes/.

Common commands
- Start full stack with Docker (recommended for local dev)
  - docker compose -f dev/docker-compose.yml up -d
  - docker compose -f dev/docker-compose.yml down
  - Seed DB after first boot: docker exec answly-backend npx prisma db seed

Backend (dev/backend)
- Install and env
  - npm install
  - Copy env: cp .env.example .env (configure DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
- Run
  - Dev: npm run start:dev
  - Prod build: npm run build && npm run start:prod
- Database (Prisma)
  - Generate client: npx prisma generate or npm run prisma:generate
  - Migrate (dev): npx prisma migrate dev or npm run prisma:migrate
  - Seed: npx prisma db seed or npm run prisma:seed
  - Studio: npx prisma studio or npm run prisma:studio
- Lint/format
  - Lint: npm run lint
  - Format: npm run format
- Tests (Jest)
  - All unit tests: npm test
  - Watch: npm run test:watch
  - Coverage: npm run test:cov
  - E2E: npm run test:e2e
  - Run a single unit test: npm test -- src/<path>/<file>.spec.ts
  - Run a single E2E test: npm run test:e2e -- <file>.e2e-spec.ts
  - Examples:
    - npm test -- src/auth/auth.service.spec.ts
    - npm run test:e2e -- auth.e2e-spec.ts

Frontend (dev/frontend)
- Install and env
  - npm install
  - Copy env: cp .env.example .env.local (configure NEXT_PUBLIC_API_URL)
- Run
  - Dev: npm run dev (default port 3000)
  - Prod build/start: npm run build && npm start
- Code quality
  - Lint: npm run lint
  - Type-check: npm run type-check
- PWA
  - Enabled via next-pwa; disabled in development. Runtime caching configured in next.config.mjs

Environment and ports
- Frontend: http://localhost:3000
- Backend API & Swagger: http://localhost:4000 and http://localhost:4000/api
- PostgreSQL: localhost:5432 (dev user/pass/db set in dev/docker-compose.yml)
- Redis: localhost:6379
- Example backend .env keys (see dev/backend/.env.example)
  - DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRATION, PORT, CORS_ORIGIN, OPENAI_API_KEY, ANTHROPIC_API_KEY
- Example frontend .env keys (see dev/frontend/.env.example)
  - NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL

High-level architecture
- Frontend (Next.js 14)
  - App Router in src/app/: route segments for auth (login/register), dashboard, layout.tsx, global styles.
  - State and data: Zustand for auth state (src/store/auth-store.ts); Axios client with interceptors (src/lib/api-client.ts); React Query provider (src/components/providers.tsx).
  - UI: TailwindCSS + shadcn/ui components; accessibility linting via eslint-plugin-jsx-a11y.
  - PWA: next-pwa wraps Next config; caching for fonts, images, JS/CSS, JSON; offline fallback.
- Backend (NestJS)
  - Modules: auth (DTOs, guards, strategies, service, controller), users, prisma (service/module), root app.module.ts.
  - Persistence: PostgreSQL via Prisma (prisma/schema.prisma). JWT auth with Passport strategies and guards. Global validation pipes and CORS.
  - Realtime/async: Socket.IO gateways prepared; Redis + BullMQ for queues (configured via @nestjs/bullmq).
  - API docs: Swagger UI at /api when server is running.
- Infrastructure (local)
  - docker-compose defines postgres, redis, backend, frontend. Volumes for DB persistence and live‑reload mounts for dev containers.
- Data flow
  - Frontend reads NEXT_PUBLIC_API_URL (default http://localhost:4000) and calls REST endpoints. Auth uses JWT (login/register → store token → include on requests). WebSocket endpoints are available via Socket.IO where used.

Testing strategy
- Backend
  - Unit tests with Jest (ts-jest). Test files match *.spec.ts under src/.
  - E2E tests via Jest with separate config (dev/backend/test). See dev/backend/test/README.md for patterns and examples, including load testing with Artillery.
- Frontend
  - Linting and type checks are configured. No test scripts are defined in dev/frontend/package.json as of now.

Key docs to consult
- Root README.md: product features, quick start, tech stack, performance/cost notes.
- dev/README.md: local dev workflow (Docker vs. manual), verified endpoints, current phase status.
- notes/README.md and notes/phases/: full technical specification and phased implementation roadmap.

Conventions and notes specific to this repo
- Prefer running the stack via Docker for consistent Postgres/Redis versions and to avoid local setup drift.
- After first backend start in dev, run a DB seed (see commands above) to load sample exams/questions.
- Swagger at /api is the source of truth for available endpoints during development.
