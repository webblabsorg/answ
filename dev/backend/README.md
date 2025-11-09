# Answly Backend

NestJS API with PostgreSQL, Prisma ORM, and JWT authentication.

## Features Implemented

### Phase 1, Session 1 ✅
- ✅ NestJS 10 with TypeScript
- ✅ PostgreSQL + Prisma ORM
- ✅ JWT Authentication
- ✅ User registration & login
- ✅ Password hashing (bcrypt)
- ✅ Auth guards & strategies
- ✅ Swagger API documentation
- ✅ Global validation pipes
- ✅ CORS configuration

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data transfer objects
│   ├── guards/          # Auth guards
│   ├── strategies/      # Passport strategies
│   ├── auth.service.ts  # Auth business logic
│   └── auth.controller.ts
├── users/               # Users module
│   ├── users.service.ts
│   └── users.controller.ts
├── prisma/              # Database module
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts        # Root module
└── main.ts              # Entry point

prisma/
└── schema.prisma        # Database schema
```

## Database Schema

Current models:
- ✅ User (authentication)
- ✅ Exam (exam catalog)
- ✅ ExamSection
- ✅ Question (question bank)
- ✅ TestSession (test attempts)
- ✅ Attempt (answer tracking)
- ✅ Bookmark (saved questions)
- ✅ QuestionNote (user notes)

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user (protected)

### Users
- `GET /users/:id` - Get user by ID (protected)

### API Documentation
- `GET /api` - Swagger UI (when server is running)

## Available Scripts

```bash
# Development
npm run start:dev        # Start with hot-reload

# Build
npm run build            # Production build
npm run start:prod       # Start production server

# Database
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open Prisma Studio
npx prisma db seed       # Seed database

# Testing
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Test coverage
```

## Environment Variables

Create `.env`:

```env
DATABASE_URL="postgresql://answly:password@localhost:5432/answly_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRATION="7d"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT (Passport.js)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Next Steps

Session 2 will add:
- Exam CRUD endpoints
- Question management
- Question search & filtering
- CSV/JSON import service
