# Answly Technical Specification - Part 5
# Workflows & Implementation Details

---

## 9. API Surface (Continued)

### 9.1 Analytics & AI Endpoints

```typescript
// Analytics
GET    /analytics/dashboard
Response: { testsCompleted, avgScore, percentile, streak, weakTopics[], nextRecommendations[] }

GET    /analytics/test-history
Query: { examId?, limit?, offset? }
Response: { sessions: TestSession[], pagination }

GET    /analytics/performance/:examId
Response: { irtAbility, topicScores[], difficultyProgress, predictedScore }

// AI Endpoints
POST   /ai/tutor/ask
Body: { question, context?, examId? }
Response: { answer, sources[], followUpPrompts[] }

POST   /ai/explain/:questionId
Body: { difficulty? }  // simplified, standard, advanced
Response: { explanation, steps[], visualAids[] }

POST   /ai/generate-questions
Body: { examId, topic, difficulty, count }
Response: { jobId, status: "pending" }

GET    /ai/generation-jobs/:jobId
Response: { job, questions[], progress }

POST   /ai/review-question
Body: { questionId, action: "approve"|"reject", feedback? }
Response: { success: true }
```

### 9.2 Admin Endpoints

```typescript
// Content Management
GET    /admin/questions
Query: { status?, examId?, topic?, search? }
Response: { questions[], total, filters }

PUT    /admin/questions/:id
Body: { ...questionData }
Response: { question }

POST   /admin/questions/bulk-import
Body: FormData (CSV/JSON file)
Response: { imported: number, failed: FailedRecord[] }

DELETE /admin/questions/:id
Response: { success: true }

// User Management
GET    /admin/users
Query: { role?, tier?, search?, page? }
Response: { users[], total }

PUT    /admin/users/:id/role
Body: { role: Role }
Response: { user }

POST   /admin/users/:id/impersonate
Response: { impersonationToken, expiresAt }

// Analytics
GET    /admin/analytics/platform
Response: { activeUsers, revenue, usageByTier, aiCosts, topExams }

GET    /admin/analytics/content
Response: { questionsByStatus, avgQualityScore, topContributors }
```

### 9.3 WebSocket Events (Real-time)

```typescript
// Test Session Channel: /ws/test-sessions/:sessionId

// Client → Server
{
  type: "answer_question",
  data: { questionId, answer, timeSpent }
}

{
  type: "flag_question",
  data: { questionId, flagged: true }
}

{
  type: "heartbeat",  // Keep session alive
  data: { timestamp }
}

// Server → Client
{
  type: "answer_saved",
  data: { questionId, success: true }
}

{
  type: "time_warning",
  data: { remainingSeconds: 300 }  // 5 min warning
}

{
  type: "session_expired",
  data: { autoSubmitted: true }
}
```

---

## 10. Key Workflows

### 10.1 User Signup & Onboarding

```
1. User submits registration form
   POST /auth/register { email, password, name }
   
2. Server creates user record (tier: FREE)
   → Sends verification email
   → Creates trial subscription record
   → Initializes usage limits in Redis
   
3. User verifies email
   GET /auth/verify-email?token=xxx
   → Updates email_verified = true
   
4. Onboarding flow
   → Survey: Target exam, current level, test date
   → Creates IrtProfile with default ability (0)
   → Recommends first practice test
   
5. First test experience
   → Tutorial overlay on test UI
   → Simplified test (10 questions)
   → Shows results with upgrade CTA
```

### 10.2 Taking a Practice Test

```
1. User selects exam and clicks "Start Test"
   POST /test-sessions { examId, type: "FULL_LENGTH" }
   
2. Server creates test session
   → Selects questions (adaptive or random)
   → Caches session in Redis (fast access)
   → Returns first question
   
3. WebSocket connection established
   ws://api.answly.com/ws/test-sessions/:sessionId
   
4. User answers questions
   For each question:
   → Client sends answer via WS
   → Server validates and saves to cache
   → Sends next question
   → Every 10 answers, flush cache to DB
   
5. Timer management
   → Server tracks elapsed time
   → Sends warnings at 5min, 1min remaining
   → Auto-submits at time=0
   
6. User submits test
   POST /test-sessions/:sessionId/submit
   
7. Grading & Analytics (Background Job)
   → Calculate raw score
   → Estimate IRT ability (theta)
   → Generate topic/skill breakdowns
   → AI generates insights & recommendations
   → Update user IRT profile
   → Send notification
   
8. Results displayed
   → Redirect to /results/:sessionId
   → Show scores, percentile, insights
   → Offer question review
```

### 10.3 AI Question Generation

```
1. Admin requests question batch
   POST /ai/generate-questions
   Body: { examId: "GRE", topic: "Algebra", difficulty: 4, count: 100 }
   
2. Server creates generation job
   → Job record in DB (status: pending)
   → Queued in BullMQ/Redis
   → Returns jobId immediately
   
3. Background worker picks up job
   → Fetches exam template & examples
   → Generates in batches of 10 (parallel)
   → For each question:
     a. Build prompt with few-shot examples
     b. Call AI provider (GPT-4)
     c. Parse JSON response
     d. Run validation checks
     e. Calculate quality score
     f. Save to QuestionReview table
   
4. Quality control
   → High quality (score > 0.9) → Auto-approve
   → Medium (0.7-0.9) → Review queue
   → Low (< 0.7) → Reject, log for retraining
   
5. Reviewer approves questions
   GET /admin/review-queue
   → Shows pending questions
   → Reviewer can:
     - Approve (moves to Question table)
     - Edit & Approve
     - Reject with feedback
   
6. Approved questions indexed
   → ElasticSearch (full-text search)
   → Vector DB (similarity search)
   → Available for test creation
```

### 10.4 Subscription Upgrade

```
1. User clicks "Upgrade to Grow"
   → Redirected to /pricing or modal opens
   
2. User selects plan (Grow, Scale)
   → Monthly vs Annual
   → Selects currency (if multi-currency)
   
3. Checkout initiated
   POST /subscriptions/checkout
   Body: { tier: "GROW", interval: "year", currency: "USD" }
   
4. Server creates Stripe Checkout Session
   → Calculates price (with regional pricing)
   → Applies discount codes if any
   → Returns checkoutUrl
   
5. User redirected to Stripe
   → Enters payment details
   → Confirms purchase
   
6. Stripe webhook: checkout.session.completed
   POST /webhooks/stripe
   → Verifies signature
   → Creates Subscription record
   → Updates User.tier = GROW
   → Updates usage limits in Redis
   → Sends welcome email
   
7. User redirected back to app
   → Success page
   → Immediately has Grow features
```

### 10.5 Organization Provisioning

```
1. Enterprise customer contacts sales
   → Sales creates Organization record manually
   → Sets: name, domain, seats_limit, tier
   
2. Admin invites users
   POST /admin/organizations/:id/invite
   Body: { emails: ["user@company.com"], role: "TEST_TAKER" }
   
3. Server sends invitation emails
   → Click invitation link
   → If no account: Sign up flow
   → If existing account: Link to org
   
4. SSO Setup (if enabled)
   → Admin configures SSO provider
   → Provides: SAML metadata URL or OAuth credentials
   → Tests connection
   → Enables SSO
   
5. Users log in via SSO
   → Redirect to IdP
   → SAML assertion received
   → User auto-created or linked
   → Assigned to organization
   
6. Organization dashboard
   → Org admin views:
     - All users (seats used/available)
     - Aggregate analytics
     - Billing & invoices
   → Can assign tests, create groups
```

---

## 11. Dev Practices & File Structure

### 11.1 Frontend Structure (Next.js)

```
answly-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── exams/
│   │   │   ├── [examId]/
│   │   │   └── page.tsx
│   │   ├── test/
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx
│   │   │       └── components/
│   │   ├── results/
│   │   │   └── [attemptId]/
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── questions/
│   │   ├── users/
│   │   └── analytics/
│   └── api/
│       └── [...proxy]/route.ts  // Proxy to NestJS
├── components/
│   ├── ui/  // ShadCN components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   ├── test/
│   │   ├── QuestionRenderer.tsx
│   │   ├── AnswerInput.tsx
│   │   ├── Timer.tsx
│   │   ├── NavigationPanel.tsx
│   │   └── Calculator.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── TestHistoryCard.tsx
│   │   └── RecommendationCard.tsx
│   └── shared/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── AIChat.tsx
│       └── MathRenderer.tsx
├── lib/
│   ├── api/  // API client functions
│   │   ├── auth.ts
│   │   ├── exams.ts
│   │   ├── test-sessions.ts
│   │   └── analytics.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTestSession.ts
│   │   └── useAnalytics.ts
│   ├── store/  // Zustand stores
│   │   ├── authStore.ts
│   │   └── testStore.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── images/
│   └── fonts/
├── styles/
│   └── globals.css
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 11.2 Backend Structure (NestJS)

```
answly-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── refresh.strategy.ts
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       └── roles.guard.ts
│   │   ├── exams/
│   │   │   ├── exams.controller.ts
│   │   │   ├── exams.service.ts
│   │   │   ├── exams.module.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── test-sessions/
│   │   │   ├── test-sessions.controller.ts
│   │   │   ├── test-sessions.service.ts
│   │   │   ├── test-sessions.gateway.ts
│   │   │   └── test-sessions.module.ts
│   │   ├── questions/
│   │   │   ├── questions.controller.ts
│   │   │   ├── questions.service.ts
│   │   │   └── questions.module.ts
│   │   ├── analytics/
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── irt/
│   │   │   │   └── irt-calculator.service.ts
│   │   │   └── insights/
│   │   │       └── insights-generator.service.ts
│   │   ├── ai/
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── ai.module.ts
│   │   │   ├── providers/
│   │   │   │   ├── openai.provider.ts
│   │   │   │   ├── anthropic.provider.ts
│   │   │   │   └── ai-orchestrator.service.ts
│   │   │   ├── generation/
│   │   │   │   ├── question-generator.service.ts
│   │   │   │   └── explanation-generator.service.ts
│   │   │   └── validation/
│   │   │       └── content-validator.service.ts
│   │   ├── subscriptions/
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.service.ts
│   │   │   └── webhooks/
│   │   │       └── stripe-webhook.controller.ts
│   │   └── notifications/
│   │       ├── notifications.service.ts
│   │       ├── email/
│   │       │   └── email.service.ts
│   │       └── push/
│   │           └── push.service.ts
│   ├── shared/
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   ├── redis/
│   │   │   ├── redis.service.ts
│   │   │   └── redis.module.ts
│   │   ├── s3/
│   │   │   └── s3.service.ts
│   │   ├── elasticsearch/
│   │   │   └── elasticsearch.service.ts
│   │   └── vector-store/
│   │       └── vector-store.service.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── ai.config.ts
│   │   └── stripe.config.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── guards/
│   ├── main.ts
│   └── app.module.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### 11.3 Code Examples

**DTO with Validation:**
```typescript
// dto/create-test-session.dto.ts
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { SessionType } from '@prisma/client';

export class CreateTestSessionDto {
  @IsString()
  examId: string;

  @IsEnum(SessionType)
  sessionType: SessionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionIds?: string[];
}
```

**Service with Dependency Injection:**
```typescript
// test-sessions/test-sessions.service.ts
@Injectable()
export class TestSessionsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private questionsService: QuestionsService,
    private analyticsService: AnalyticsService,
  ) {}

  async createSession(userId: string, dto: CreateTestSessionDto) {
    // 1. Fetch exam and questions
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    const questions = await this.questionsService.selectQuestions(dto);

    // 2. Create session record
    const session = await this.prisma.testSession.create({
      data: {
        user_id: userId,
        exam_id: dto.examId,
        session_type: dto.sessionType,
        status: 'IN_PROGRESS',
      },
    });

    // 3. Cache session data in Redis for fast access
    await this.redis.set(
      `session:${session.id}`,
      JSON.stringify({ session, questions, currentIndex: 0 }),
      'EX',
      3600 * 4 // 4 hour TTL
    );

    return { session, questions: [questions[0]] }; // Return first question
  }

  async submitAnswer(sessionId: string, dto: SubmitAnswerDto) {
    // Get from cache
    const cached = await this.redis.get(`session:${sessionId}`);
    const sessionData = JSON.parse(cached);

    // Validate answer
    const question = sessionData.questions.find(q => q.id === dto.questionId);
    const isCorrect = this.validateAnswer(question, dto.answer);

    // Create attempt
    await this.prisma.attempt.create({
      data: {
        session_id: sessionId,
        user_id: sessionData.session.user_id,
        question_id: dto.questionId,
        user_answer: dto.answer,
        is_correct: isCorrect,
        time_spent_sec: dto.timeSpent,
      },
    });

    // Update cache
    sessionData.currentIndex++;
    await this.redis.set(`session:${sessionId}`, JSON.stringify(sessionData));

    return {
      success: true,
      nextQuestion: sessionData.questions[sessionData.currentIndex],
    };
  }

  async submitSession(sessionId: string, userId: string) {
    // Flush cache to DB
    const cached = await this.redis.get(`session:${sessionId}`);
    const sessionData = JSON.parse(cached);

    // Update session
    const session = await this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
      },
    });

    // Queue grading job
    await this.analyticsService.gradeSession(sessionId);

    return session;
  }
}
```

**Guard for Permission Check:**
```typescript
// guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check permissions (cached in Redis)
    const userPermissions = await this.getUserPermissions(user.id);

    return requiredPermissions.every(permission =>
      this.hasPermission(userPermissions, permission),
    );
  }

  private async getUserPermissions(userId: string) {
    const cached = await this.redis.get(`user:${userId}:permissions`);
    if (cached) return JSON.parse(cached);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    const permissions = this.calculatePermissions(user);
    await this.redis.set(
      `user:${userId}:permissions`,
      JSON.stringify(permissions),
      'EX',
      300 // 5 min cache
    );

    return permissions;
  }
}
```

---

**Continue to Part 6 for Security, Testing, and Deployment...**
