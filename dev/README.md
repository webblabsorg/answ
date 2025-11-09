# Answly Development

This directory contains the source code for the Answly platform.

## Project Structure

```
dev/
├── frontend/          # Next.js 14 application
├── backend/           # NestJS API
├── shared/            # Shared types and utilities
└── docker-compose.yml # Local development environment
```

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (recommended for local development)

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Wait for services to start (first time: 5-10 minutes)

# Seed the database (after backend is ready)
docker exec answly-backend npx prisma db seed

# Access the application:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:4000
# - API Docs: http://localhost:4000/api
```

### Manual Setup

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, JWT_SECRET, etc. in .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed          # Load 3 exams with sample questions
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Configure NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

## Development

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Testing

```bash
# Backend tests
cd backend
npm test
npm run test:e2e

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

## Documentation

See `/notes` directory for complete technical specifications and implementation guides.

## Current Phase

**Phase 1: Foundation** - Session 4: Test-Taking UI Part 2 ✅

### Completed Sessions
- ✅ **Session 1:** Infrastructure & Auth ([Details](../notes/SESSION-1-COMPLETE.md))
- ✅ **Session 2:** Exam Catalog & Data Models ([Details](../notes/SESSION-2-COMPLETE.md))
- ✅ **Session 3:** Test-Taking UI - Part 1 ([Details](../notes/SESSION-3-COMPLETE.md))
- ✅ **Session 4:** Test-Taking UI - Part 2 ([Details](../notes/SESSION-4-COMPLETE.md))

### What's Working Now
- User authentication (register, login, JWT)
- Exam catalog with 3 exams (GRE, SAT, GMAT)
- **Full test-taking interface with timer**
- **6 question types supported (MCQ, Multiple Select, Numeric, Text, Essay, True/False)**
- **Auto-grading system (5 question types)**
- **Complete results dashboard with analytics**
- **Section breakdown and topic performance**
- **Question-by-question review with explanations**
- Real-time answer auto-save
- Question navigation with visual status
- WebSocket integration
- Question bank with 11+ sample questions
- Search and filtering
- RESTful API with Swagger docs (29 endpoints)

### Next Up
- **Session 5:** Admin Panel (Weeks 9-10)
- Focus: Content management, bulk import, user management, essay review queue

See [Phase 1 Implementation Guide](../notes/implementation/01-phase1-foundation.md) for full roadmap.
