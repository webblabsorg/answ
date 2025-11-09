# Answly Development Setup Guide

## Prerequisites

Make sure you have the following installed:
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/))
- Redis 7+ ([Download](https://redis.io/download))
- Docker Desktop (recommended) ([Download](https://www.docker.com/products/docker-desktop))

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# 1. Navigate to dev directory
cd dev

# 2. Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# 3. Backend will be available at http://localhost:4000
# 4. Frontend will be available at http://localhost:3000
```

**Note:** First time setup may take 5-10 minutes to download images and install dependencies.

## Manual Setup (Without Docker)

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Backend Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and configure:
# - DATABASE_URL (PostgreSQL connection string)
# - REDIS_URL (Redis connection string)
# - JWT_SECRET (generate a secure random string)
```

### Step 3: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npm run prisma:seed
```

### Step 4: Start Backend Server

```bash
npm run start:dev
```

Backend API will be running at http://localhost:4000
API Documentation at http://localhost:4000/api

### Step 5: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 6: Configure Frontend Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and set:
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Step 7: Start Frontend Server

```bash
npm run dev
```

Frontend will be running at http://localhost:3000

## Verifying the Setup

### Test Backend API

```bash
# Health check
curl http://localhost:4000

# Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "name": "Test User"
  }'
```

### Test Frontend

1. Open browser to http://localhost:3000
2. Click "Get Started" or "Login"
3. Register a new account
4. You should be redirected to the dashboard

## Development Workflow

### Backend Development

```bash
cd backend

# Run in watch mode (auto-restart on changes)
npm run start:dev

# Run tests
npm test

# View database in Prisma Studio
npx prisma studio  # Opens at http://localhost:5555
```

### Frontend Development

```bash
cd frontend

# Run development server
npm run dev

# Type checking
npm run type-check

# Lint code
npm run lint
```

## Database Management

### View Database

```bash
cd backend
npx prisma studio
```

This opens Prisma Studio at http://localhost:5555 where you can view and edit database records.

### Reset Database

```bash
cd backend
npx prisma migrate reset  # Caution: Deletes all data!
```

### Create New Migration

```bash
cd backend
npx prisma migrate dev --name <migration-name>
```

## Troubleshooting

### Backend won't start

**Error: Cannot connect to database**
- Make sure PostgreSQL is running: `pg_isready` (Mac/Linux) or check Services (Windows)
- Verify DATABASE_URL in .env is correct
- Try connecting manually: `psql <DATABASE_URL>`

**Error: Cannot connect to Redis**
- Make sure Redis is running: `redis-cli ping` should return `PONG`
- Verify REDIS_URL in .env is correct

### Frontend won't start

**Error: Cannot connect to API**
- Make sure backend is running at http://localhost:4000
- Verify NEXT_PUBLIC_API_URL in .env.local

**Error: Module not found**
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Docker issues

**Container won't start**
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

## Next Steps

Now that you have the development environment running:

1. ✅ Authentication is complete (Phase 1, Session 1)
2. 📋 Next: Implement Exam Catalog (Phase 1, Session 2)

See [Phase 1 Implementation Guide](../notes/implementation/01-phase1-foundation.md) for detailed session breakdown.

## Additional Resources

- [API Documentation](http://localhost:4000/api) (when backend is running)
- [Prisma Studio](http://localhost:5555) (for database management)
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)

## Getting Help

- Check the [troubleshooting section](#troubleshooting) above
- Review logs: `docker-compose logs` or check terminal output
- Consult the detailed [implementation guides](../notes/implementation/)
