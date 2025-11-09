# Answly Technical Specification - Part 2
# UX Wireframes & System Architecture

---

## 4. UX Wireframes & Layout Specifications

### 4.1 Homepage Layout

**Desktop (1920x1080) - Three-Column Layout:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Answly Logo         [Search]        [Notifications] [User] [Settings]│
├──────────┬────────────────────────────────────────────┬──────────────┤
│          │                                             │              │
│ SIDEBAR  │          MAIN CONTENT                      │  RIGHT PANEL │
│ (280px)  │           (flex-grow)                      │   (320px)    │
│          │                                             │              │
│ Search   │  Welcome Message                           │  Quick Stats │
│ [____]   │  ┌────────────────────────────┐           │  Tests: 12   │
│          │  │ 🤖 Ask AI Tutor           │           │  Score: 87%  │
│ Exams ▾  │  │ [Type question...]  [Send] │           │  Streak: 7🔥 │
│ • GRE    │  └────────────────────────────┘           │              │
│ • SAT    │                                             │  Actions     │
│ • GMAT   │  Resume: GRE Test #3 [Continue→]          │  • Start     │
│          │                                             │  • Resume    │
│ Recent   │  Recent Tests:                             │  • Review    │
│ • Item 1 │  • GRE Full: 320/340 (85th %) [View→]    │              │
│ • Item 2 │  • SAT Math: 780/800 (92nd %) [View→]    │  Recommend.  │
│          │                                             │  • GRE Verb  │
│ Saved    │  Recommendations:                          │  • SAT Read  │
│ ⭐ (23)  │  • Focus: GRE Reading - Practice [Start]  │              │
│          │                                             │              │
│ [Grow]   │  Quick Start: [GRE] [SAT] [GMAT]          │  Leaderboard │
│ Upgrade  │                                             │  1. User A   │
└──────────┴─────────────────────────────────────────────┴──────────────┘
```

**Key Features:**
- Left sidebar: Collapsible exam categories, search, recent items
- Main area: AI chatbox, resume banner, recent tests, recommendations
- Right panel: Stats, quick actions, recommendations, leaderboard

**Responsive (Mobile < 768px):**
- Bottom tab navigation (Home, Browse, AI, Progress, Profile)
- Hamburger menu for sidebar
- Right panel becomes modal/drawer
- AI chatbox fullscreen when active

### 4.2 Test-Taking Interface

```
┌──────────────────────────────────────────────────────────────────────┐
│ Answly | GRE Test #5     Section: Verbal     [⏱️ 35:24] [⏸️] [Review]│
├──────────────────────────────────────────┬───────────────────────────┤
│ QUESTION (65%)                           │ NAVIGATION (35%)          │
│                                           │                           │
│ Question 12 of 20                        │ Grid:                     │
│ ━━━━━━━━━━━━━━━━━━━━ 60%               │ [1✓][2✓][3✓][4✓][5✓]     │
│                                           │ [6✓][7✓][8🚩][9✓][10✓]   │
│ Select TWO answers that complete:        │ [11✓][[12]][13][14][15]  │
│                                           │ [16][17][18][19][20]      │
│ The lecture was so _____ that            │                           │
│ students struggled to follow.            │ Legend:                   │
│                                           │ ✓ Answered                │
│ Blank (i)         Blank (ii)             │ [N] Current               │
│ ☐ A) lucid       ☐ D) attentive         │ 🚩 Flagged                │
│ ☑ B) abstruse    ☐ E) somnolent         │                           │
│ ☐ C) pedantic    ☑ F) diligent          │ [🚩 Flag]                 │
│                                           │ [✓ Mark & Next]           │
│ [Show Definitions] [Eliminate]           │                           │
│ [Clear] [Flag]                           │ [← Prev] [Next →]        │
│                                           │                           │
│                                           │ [🧮 Calculator]           │
│                                           │ (if applicable)           │
└──────────────────────────────────────────┴───────────────────────────┘
│ [♿ Accessibility] [🐛 Report] [❓ Help]                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Specialized UIs:**

**Essay Interface:**
```
┌──────────────────────────────────────────────────────┐
│ Analytical Writing | Issue Essay | ⏱️ 30:00         │
├──────────────────────────────────────────────────────┤
│ Prompt (30% height):                                 │
│ "Scandals are useful because..."                     │
│ [Full prompt text scrollable]                        │
├──────────────────────────────────────────────────────┤
│ Editor (70% height):                                 │
│ [B][I][U] [Undo][Redo]  Words: 234  Chars: 1456    │
│ ┌──────────────────────────────────────────────┐    │
│ │ [Essay content with basic formatting...]     │    │
│ │                                               │    │
│ └──────────────────────────────────────────────┘    │
│ [Save Draft Auto: 30s]                              │
└──────────────────────────────────────────────────────┘
```

**Math with Calculator:**
```
┌──────────────────────────────────────────────────────┐
│ Split: Question (50%) | Calculator (50%)             │
├──────────────────────┬───────────────────────────────┤
│ Q: If f(x) = 3x²-5x+2│  Calculator                   │
│ what is f(4)?        │  ┌──────────────────────┐    │
│                      │  │ Display: 0           │    │
│ ○ A) 26              │  │ [7][8][9][÷][AC]    │    │
│ ○ B) 30              │  │ [4][5][6][×][C]     │    │
│ ○ C) 34              │  │ [1][2][3][-][(]     │    │
│ ○ D) 38              │  │ [0][.][=][+][)]     │    │
│                      │  │ [√][x²][π][sin]     │    │
│ [Clear] [Flag]       │  └──────────────────────┘    │
└──────────────────────┴───────────────────────────────┘
```

**Listening Comprehension:**
```
┌──────────────────────────────────────────────────────┐
│ TOEFL Listening - Lecture | Q 3 of 6 | ⏱️ 27:15    │
├──────────────────────────────────────────────────────┤
│ Audio Player:                                        │
│ ▶️ [====================    ] 2:15 / 3:45          │
│ Vol: [=====>   ] Speed: 1.0x  [🔁 Replay: 1 left] │
│                                                      │
│ [Image: Professor at whiteboard]                    │
│                                                      │
│ ⚠️  Audio plays once. Take notes below:             │
│ ┌────────────────────────────────────────────────┐ │
│ │ [Your notes...]                                 │ │
│ │ - chlorophyll                                   │ │
│ │ - light reactions                               │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ After audio: Question appears                       │
│ ○ A) Types of plants                                │
│ ○ B) Process of photosynthesis                      │
│ ○ C) Importance of chlorophyll                      │
│ ○ D) History of biology                             │
└──────────────────────────────────────────────────────┘
```

### 4.3 Results Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ 🎉 Test Complete! - GRE Practice #5       [⬇️ Download PDF]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Overall Score:                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Verbal: 160/170 (82%)   Quant: 164/170 (88%)         │   │
│ │ ━━━━━━━━━━━━━━━━━      ━━━━━━━━━━━━━━━━━           │   │
│ │                                                        │   │
│ │ Total: 324/340 (85th percentile)                      │   │
│ │ ████████████████████░░░░░░                            │   │
│ │ 🎯 Target: 330 | Gap: -6 | Improvement: +4           │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Section Breakdown:                                           │
│ • Verbal: 12/20 (60%) | Time: 31:42/35:00                   │
│   - Text Completion: 4/6 (67%) ✓                            │
│   - Sentence Equiv: 5/7 (71%) ✓                             │
│   - Reading Comp: 3/7 (43%) ⚠️                              │
│ • Quant: 17/20 (85%) | Time: 33:15/35:00                    │
│   - Arithmetic: 5/5 (100%) ✓                                │
│   - Algebra: 6/8 (75%) ✓                                    │
│   - Geometry: 4/5 (80%) ✓                                   │
│                                                               │
│ Insights (Grow):                                             │
│ 💡 Strengths:                                                │
│ • Perfect Arithmetic & Data Analysis                        │
│ • Fast completion (+3min buffer)                            │
│ ⚠️  Improve:                                                  │
│ • Reading Comp - Inference (2/5)                            │
│ • Vocab: "abstruse", "pedantic"                             │
│ • Algebra: Quadratics (1/3)                                 │
│                                                               │
│ Next Steps:                                                  │
│ 1. Practice 20 Inference questions                          │
│ 2. Study Vocab Set 3                                        │
│ 3. Review Quadratic Equations                               │
│ [Generate Study Plan →]                                     │
│                                                               │
│ Actions:                                                     │
│ [Review All] [Review Incorrect] [Retake] [Compare] [Share] │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. System Architecture

### 5.1 High-Level Architecture Diagram

```
Users (Web/PWA/Mobile)
         ↓ HTTPS
    CDN (CloudFlare)
    - Static assets
    - Edge caching
         ↓
    Load Balancer (AWS ALB)
         ↓
┌────────────────────────────────────────┐
│          Frontend Layer                │
│  Next.js 14+ (App Router)              │
│  - SSR for SEO pages                   │
│  - CSR for interactive test UI         │
│  - PWA with Service Workers            │
│  - React 18+ (Server Components)       │
│  - TailwindCSS + ShadCN                │
└────────────────────────────────────────┘
         ↓ REST/GraphQL
┌────────────────────────────────────────┐
│         API Gateway Layer              │
│  - Rate limiting (Redis)               │
│  - Authentication (JWT)                │
│  - Request validation                  │
│  - API versioning                      │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│         Backend Services (NestJS)      │
├────────────────────────────────────────┤
│ • Auth Service                         │
│ • Exam Service                         │
│ • Test Session Service                 │
│ • Analytics Service                    │
│ • AI/ML Service                        │
│ • Payment Service (Stripe)             │
│ • Notification Service                 │
│ • Content Management Service           │
└────────────────────────────────────────┘
         ↓
┌─────────────┬──────────────┬──────────────┐
│             │              │              │
▼             ▼              ▼              ▼
PostgreSQL    Redis         S3/Supabase    Vector DB
(Prisma)      Cache         File Storage   (Pinecone)
- Users       - Sessions    - Images       - Embeddings
- Exams       - Rate limits - Audio        - Question sim
- Questions   - Leaderboard - Videos       - User profiles
- Attempts    - Job queue   - PDFs         
- Analytics                                
         ↓
    ElasticSearch/OpenSearch
    - Full-text search
    - Question bank search
    - Autocomplete
```

### 5.2 Technology Stack

**Frontend:**
- **Framework**: Next.js 14+ (App Router, Server Components)
- **UI Library**: React 18+
- **Styling**: TailwindCSS 3+
- **Components**: ShadCN UI (Radix primitives)
- **State Management**: Zustand / Jotai (atomic state)
- **Forms**: React Hook Form + Zod validation
- **API Client**: TanStack Query (React Query)
- **Math Rendering**: KaTeX
- **Code Editor**: Monaco Editor
- **Charts**: Recharts / Chart.js
- **Icons**: Lucide React
- **PWA**: next-pwa plugin

**Backend:**
- **Framework**: NestJS 10+
- **Language**: TypeScript 5+
- **ORM**: Prisma 5+
- **API Style**: REST + GraphQL (optional)
- **Validation**: class-validator + class-transformer
- **Authentication**: Passport.js (JWT, OAuth)
- **Documentation**: Swagger/OpenAPI

**Database & Storage:**
- **Primary DB**: PostgreSQL 15+
- **Cache**: Redis 7+ (Upstash or AWS ElastiCache)
- **File Storage**: AWS S3 / Supabase Storage
- **Vector DB**: Pinecone / Weaviate / Milvus
- **Search**: ElasticSearch 8+ / OpenSearch

**AI/ML:**
- **LLM Providers**: OpenAI, Anthropic, Cohere, HuggingFace
- **Orchestration**: LangChain / LlamaIndex
- **Vector Store**: Pinecone (managed) or Weaviate (self-hosted)
- **Embeddings**: OpenAI text-embedding-3 / Cohere embed-v3
- **Fine-tuning**: OpenAI fine-tuning API / AWS SageMaker
- **Evaluation**: Custom test suite + BLEU/ROUGE metrics

**Infrastructure:**
- **Hosting**: Vercel (frontend primary), AWS (API/services)
- **CDN**: CloudFlare
- **Container Orchestration**: AWS ECS / Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog / Prometheus + Grafana
- **Error Tracking**: Sentry
- **Logging**: AWS CloudWatch / ELK Stack
- **Analytics**: Segment + Mixpanel/Amplitude

### 5.3 Component Breakdown

**Frontend Components (Next.js):**
```
app/
├── (marketing)/
│   ├── page.tsx                # Landing page
│   ├── pricing/
│   └── about/
├── (app)/
│   ├── dashboard/
│   │   └── page.tsx            # User dashboard (homepage UI)
│   ├── exams/
│   │   ├── [examId]/
│   │   │   └── page.tsx        # Exam detail
│   │   └── page.tsx            # Exam catalog
│   ├── test/
│   │   └── [sessionId]/
│   │       └── page.tsx        # Test-taking UI
│   ├── results/
│   │   └── [attemptId]/
│   │       └── page.tsx        # Results dashboard
│   └── settings/
│       └── page.tsx
├── api/
│   └── [...all routes proxy to NestJS]
└── components/
    ├── ui/                     # ShadCN components
    ├── test/
    │   ├── QuestionRenderer.tsx
    │   ├── AnswerInput.tsx
    │   ├── Timer.tsx
    │   ├── NavigationPanel.tsx
    │   └── Calculator.tsx
    ├── dashboard/
    │   ├── StatCard.tsx
    │   ├── TestCard.tsx
    │   └── RecommendationCard.tsx
    └── shared/
        ├── Header.tsx
        ├── Sidebar.tsx
        └── AIChat.tsx
```

**Backend Services (NestJS):**
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── oauth.strategy.ts
│   │   └── guards/
│   │       └── permission.guard.ts
│   ├── exams/
│   │   ├── exams.controller.ts
│   │   ├── exams.service.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── test-sessions/
│   │   ├── test-sessions.controller.ts
│   │   ├── test-sessions.service.ts
│   │   └── test-sessions.gateway.ts  # WebSocket
│   ├── ai/
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts
│   │   ├── providers/
│   │   │   ├── openai.provider.ts
│   │   │   ├── anthropic.provider.ts
│   │   │   └── cohere.provider.ts
│   │   ├── generation/
│   │   │   ├── question-generator.service.ts
│   │   │   └── explanation-generator.service.ts
│   │   └── validation/
│   │       └── content-validator.service.ts
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   ├── irt/
│   │   │   └── irt-calculator.service.ts
│   │   └── insights/
│   │       └── insights-generator.service.ts
│   ├── payments/
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── webhooks/
│   │       └── stripe-webhook.controller.ts
│   └── notifications/
│       ├── notifications.service.ts
│       ├── email/
│       │   └── email.service.ts
│       └── push/
│           └── push.service.ts
├── shared/
│   ├── database/
│   │   └── prisma.service.ts
│   ├── redis/
│   │   └── redis.service.ts
│   └── s3/
│       └── s3.service.ts
└── config/
    ├── app.config.ts
    ├── database.config.ts
    └── ai.config.ts
```

### 5.4 Data Flow Examples

**Test-Taking Session Flow:**
```
1. User starts test
   → POST /api/test-sessions
   → Creates session record (Postgres)
   → Initializes cache (Redis: session:<id>)
   → Fetches questions (Postgres + cache)
   → Returns test data

2. User answers question
   → PUT /api/test-sessions/:id/answers/:questionId
   → Validates answer format
   → Saves to cache (instant feedback)
   → Queues for DB write (eventual consistency)
   → Returns success

3. User submits test
   → POST /api/test-sessions/:id/submit
   → Flushes cache to DB (atomic transaction)
   → Triggers grading job (background)
   → Triggers analytics calculation (async)
   → Returns submission confirmation

4. Grading completes
   → Background worker grades test
   → Calculates IRT scores
   → Generates insights (AI)
   → Sends notification
   → Updates user dashboard
```

**AI Question Generation Flow:**
```
1. Admin requests question batch
   → POST /api/ai/generate-questions
   → Body: { exam, topic, difficulty, count: 50 }
   → Validates quota/permissions
   → Creates generation job (DB + queue)

2. Background worker processes job
   → Fetches exam template & examples
   → Builds prompt from template
   → Calls AI provider (OpenAI/Anthropic)
   → Parses response (JSON structured output)
   → Validates format & plausibility
   → Calculates difficulty estimate
   → Saves to review queue (pending approval)

3. Reviewer approves questions
   → GET /api/ai/review-queue
   → Shows pending questions
   → Reviewer edits/approves/rejects
   → Approved → moves to question bank
   → Rejected → logs feedback, retrains

4. Question enters bank
   → Indexed in ElasticSearch (search)
   → Embedded and stored in vector DB (similarity)
   → Available for test creation
```

---

**Continue to Part 3 for AI/ML Architecture, Database Schema, and APIs...**
