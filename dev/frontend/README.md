# Answly Frontend

Next.js 14 application with App Router, TypeScript, and TailwindCSS.

## Features Implemented

### Phase 1, Session 1 ✅
- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ TailwindCSS + ShadCN UI components
- ✅ Authentication pages (Login/Register)
- ✅ Auth state management (Zustand)
- ✅ API client with interceptors
- ✅ Protected routes
- ✅ Responsive design

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── login/           # Login page
│   ├── register/        # Register page
│   ├── dashboard/       # Protected dashboard
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/
│   ├── ui/              # ShadCN UI components
│   └── providers.tsx    # React Query provider
├── lib/
│   ├── api-client.ts    # Axios instance with auth
│   └── utils.ts         # Utility functions
└── store/
    └── auth-store.ts    # Auth state (Zustand)
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server on :3000

# Build
npm run build        # Production build
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: ShadCN UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **HTTP Client**: Axios

## Next Steps

Session 2 will add:
- Exam catalog pages
- Question browsing
- Search functionality
