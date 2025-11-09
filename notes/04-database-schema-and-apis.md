# Answly Technical Specification - Part 4
# Database Schema & API Design

---

## 8. Database Schema

### 8.1 Core Tables (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============= USERS & AUTH =============

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password_hash     String?   // Null for OAuth users
  name              String
  avatar_url        String?
  role              Role      @default(TEST_TAKER)
  tier              Tier      @default(STARTER)
  language          String    @default("en")
  timezone          String    @default("UTC")
  
  organization_id   String?
  organization      Organization? @relation(fields: [organization_id], references: [id])
  
  email_verified    Boolean   @default(false)
  email_verified_at DateTime?
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  last_login_at     DateTime?
  
  // Relations
  test_sessions     TestSession[]
  attempts          Attempt[]
  subscriptions     Subscription[]
  bookmarks         Bookmark[]
  notes             Note[]
  irt_profiles      IrtProfile[]
  ai_interactions   AIInteraction[]
  
  @@index([email])
  @@index([organization_id])
}

enum Role {
  TEST_TAKER
  INSTRUCTOR
  REVIEWER
  ADMIN
  SUPPORT
  ORG_ADMIN
}

enum Tier {
  STARTER
  GROW
  SCALE
  ENTERPRISE
}

model Organization {
  id              String    @id @default(cuid())
  name            String
  domain          String?   @unique  // e.g., "university.edu"
  tier            Tier      @default(SCALE)
  seats_limit     Int       @default(50)
  seats_used      Int       @default(0)
  
  // Branding
  logo_url        String?
  primary_color   String?
  
  // SSO
  sso_enabled     Boolean   @default(false)
  sso_provider    String?   // saml, oauth, ldap
  sso_config      Json?
  
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  users           User[]
  subscriptions   Subscription[]
}

// ============= EXAMS & QUESTIONS =============

model Exam {
  id                  String    @id @default(cuid())
  name                String    // "GRE General Test"
  code                String    @unique  // "GRE"
  category            String    // "Academic", "Professional", "Language"
  description         String?   @db.Text
  
  // Exam structure
  duration_minutes    Int
  total_sections      Int
  total_questions     Int
  passing_score       Int?
  max_score           Int
  
  // Metadata
  official_url        String?
  difficulty_level    String    // "Undergraduate", "Graduate", "Professional"
  languages           String[]  // ["en", "es", "fr"]
  active              Boolean   @default(true)
  
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  
  sections            ExamSection[]
  questions           Question[]
  test_sessions       TestSession[]
  irt_profiles        IrtProfile[]
  templates           QuestionTemplate[]
}

model ExamSection {
  id                  String    @id @default(cuid())
  exam_id             String
  exam                Exam      @relation(fields: [exam_id], references: [id], onDelete: Cascade)
  
  name                String    // "Verbal Reasoning"
  order               Int       // Section order in exam
  duration_minutes    Int
  question_count      Int
  
  // Section-specific rules
  calculator_allowed  Boolean   @default(false)
  can_skip            Boolean   @default(true)
  can_go_back         Boolean   @default(true)
  
  questions           Question[]
  
  @@unique([exam_id, order])
}

model Question {
  id                    String    @id @default(cuid())
  exam_id               String
  exam                  Exam      @relation(fields: [exam_id], references: [id])
  section_id            String?
  section               ExamSection? @relation(fields: [section_id], references: [id])
  
  // Content
  question_text         String    @db.Text
  question_type         QuestionType
  options               Json      // [{id: "A", text: "...", correct: true}]
  correct_answer        Json      // ["A"] or ["A", "B"] for multi-select
  
  // Rich content
  has_image             Boolean   @default(false)
  image_urls            String[]
  has_audio             Boolean   @default(false)
  audio_url             String?
  has_video             Boolean   @default(false)
  video_url             String?
  
  // Metadata
  topic                 String    // "Algebra", "Reading Comprehension"
  subtopic              String?   // "Quadratic Equations", "Inference"
  skills                String[]  // ["problem_solving", "critical_thinking"]
  bloom_level           String?   // "Remember", "Understand", "Apply", "Analyze"
  
  // Difficulty
  difficulty_level      Int       @default(3)  // 1-5 scale
  estimated_time_sec    Int       @default(60)
  
  // IRT Parameters (calibrated from real data)
  irt_a                 Float?    // Discrimination (0.5-2.5)
  irt_b                 Float?    // Difficulty (-3 to +3)
  irt_c                 Float?    // Guessing (usually 0.25)
  calibration_sample    Int       @default(0)
  last_calibrated_at    DateTime?
  
  // Quality metrics
  times_used            Int       @default(0)
  times_correct         Int       @default(0)
  avg_time_spent_sec    Float?
  discrimination_index  Float?    // Classical Test Theory
  
  // Source
  source                String    @default("ai_generated")  // ai_generated, instructor, official
  created_by            String?   // User ID
  ai_model              String?   // "gpt-4-turbo"
  
  // Status
  status                QuestionStatus  @default(DRAFT)
  reviewed_by           String?
  reviewed_at           DateTime?
  
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  
  // Relations
  attempts              Attempt[]
  bookmarks             Bookmark[]
  notes                 Note[]
  explanations          Explanation[]
  
  @@index([exam_id, topic])
  @@index([status])
  @@index([difficulty_level])
}

enum QuestionType {
  MULTIPLE_CHOICE
  MULTIPLE_SELECT
  TRUE_FALSE
  NUMERIC_ENTRY
  TEXT_COMPLETION
  SENTENCE_EQUIVALENCE
  ESSAY
  SHORT_ANSWER
  LISTENING
  READING_COMPREHENSION
}

enum QuestionStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  ARCHIVED
}

model Explanation {
  id                String    @id @default(cuid())
  question_id       String
  question          Question  @relation(fields: [question_id], references: [id], onDelete: Cascade)
  
  content           String    @db.Text
  format            String    @default("markdown")  // markdown, html, latex
  explanation_type  String    @default("standard")  // standard, simplified, advanced
  
  // For step-by-step
  steps             Json?     // [{step: 1, text: "...", equation: "..."}]
  
  // Rich media
  video_url         String?
  diagram_url       String?
  
  // Ratings
  helpful_count     Int       @default(0)
  not_helpful_count Int       @default(0)
  
  created_by        String?   // User ID or "ai"
  ai_model          String?
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  @@index([question_id])
}

// ============= TEST SESSIONS =============

model TestSession {
  id                String    @id @default(cuid())
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  exam_id           String
  exam              Exam      @relation(fields: [exam_id], references: [id])
  
  // Session type
  session_type      SessionType
  is_practice       Boolean   @default(true)
  
  // Progress
  status            SessionStatus  @default(IN_PROGRESS)
  current_section   Int       @default(1)
  current_question  Int       @default(1)
  
  // Timing
  started_at        DateTime  @default(now())
  paused_at         DateTime?
  resumed_at        DateTime?
  submitted_at      DateTime?
  time_elapsed_sec  Int       @default(0)
  
  // Results (populated after submission)
  total_correct     Int?
  total_questions   Int?
  raw_score         Int?
  scaled_score      Int?
  percentile        Float?
  
  // Integrity
  ip_address        String?
  user_agent        String?
  proctoring_enabled Boolean  @default(false)
  proctoring_data   Json?     // Session recording metadata
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  attempts          Attempt[]
  analytics         SessionAnalytics?
  
  @@index([user_id, status])
  @@index([exam_id])
}

enum SessionType {
  FULL_LENGTH
  SECTION_PRACTICE
  TOPIC_PRACTICE
  ADAPTIVE
  CUSTOM
}

enum SessionStatus {
  IN_PROGRESS
  PAUSED
  SUBMITTED
  GRADED
  ABANDONED
}

model Attempt {
  id                String    @id @default(cuid())
  session_id        String
  session           TestSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  question_id       String
  question          Question  @relation(fields: [question_id], references: [id])
  
  // Answer
  user_answer       Json      // ["A"] or ["B", "D"] or {value: 42} or {text: "essay"}
  is_correct        Boolean?  // Null for ungraded (essays)
  
  // Timing
  time_spent_sec    Int
  flagged           Boolean   @default(false)
  
  // Context
  attempt_number    Int       @default(1)  // If retrying same question
  
  created_at        DateTime  @default(now())
  
  @@unique([session_id, question_id])
  @@index([user_id, question_id])
  @@index([question_id, is_correct])
}

// ============= ANALYTICS =============

model SessionAnalytics {
  id                String    @id @default(cuid())
  session_id        String    @unique
  session           TestSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  
  // Section breakdown
  section_scores    Json      // [{section: "Verbal", correct: 15, total: 20}]
  
  // Topic/skill breakdown
  topic_scores      Json      // [{topic: "Algebra", correct: 8, total: 10}]
  skill_scores      Json      // [{skill: "problem_solving", correct: 12, total: 15}]
  
  // Time analysis
  avg_time_per_q    Float
  fastest_question  String?
  slowest_question  String?
  
  // Difficulty analysis
  easy_correct      Int
  easy_total        Int
  medium_correct    Int
  medium_total      Int
  hard_correct      Int
  hard_total        Int
  
  // IRT-based
  ability_estimate  Float?    // Theta
  standard_error    Float?
  
  // Insights (AI-generated)
  strengths         String[]
  weaknesses        String[]
  recommendations   Json      // [{type: "practice", topic: "...", count: 20}]
  
  generated_at      DateTime  @default(now())
  
  @@index([session_id])
}

model IrtProfile {
  id                String    @id @default(cuid())
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  exam_id           String
  exam              Exam      @relation(fields: [exam_id], references: [id])
  
  ability_estimate  Float     @default(0)  // Theta (-4 to +4)
  standard_error    Float     @default(1.0)
  
  // Breakdown by topic
  topic_abilities   Json?     // {Algebra: 1.2, Geometry: -0.5, ...}
  
  attempt_count     Int       @default(0)
  last_updated      DateTime  @default(now())
  
  @@unique([user_id, exam_id])
  @@index([user_id])
}

// ============= SUBSCRIPTIONS & BILLING =============

model Subscription {
  id                String    @id @default(cuid())
  user_id           String?
  user              User?     @relation(fields: [user_id], references: [id])
  organization_id   String?
  organization      Organization? @relation(fields: [organization_id], references: [id])
  
  tier              Tier
  status            SubscriptionStatus
  
  // Stripe
  stripe_customer_id    String?   @unique
  stripe_subscription_id String?  @unique
  stripe_price_id       String?
  
  // Billing
  amount            Int       // Cents
  currency          String    @default("USD")
  interval          String    @default("month")  // month, year
  
  // Dates
  current_period_start  DateTime
  current_period_end    DateTime
  cancel_at_period_end  Boolean   @default(false)
  canceled_at           DateTime?
  trial_end             DateTime?
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  invoices          Invoice[]
  usage_records     UsageRecord[]
  
  @@index([user_id])
  @@index([organization_id])
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

model Invoice {
  id                String    @id @default(cuid())
  subscription_id   String
  subscription      Subscription @relation(fields: [subscription_id], references: [id])
  
  stripe_invoice_id String?   @unique
  amount_due        Int
  amount_paid       Int
  currency          String
  status            String    // paid, open, void, uncollectible
  
  invoice_pdf       String?
  hosted_url        String?
  
  period_start      DateTime
  period_end        DateTime
  created_at        DateTime  @default(now())
  
  @@index([subscription_id])
}

model UsageRecord {
  id                String    @id @default(cuid())
  subscription_id   String
  subscription      Subscription @relation(fields: [subscription_id], references: [id])
  user_id           String
  
  // Usage type
  usage_type        String    // "tests_taken", "ai_queries", "question_gen"
  quantity          Int
  
  // Billing period
  period_start      DateTime
  period_end        DateTime
  
  recorded_at       DateTime  @default(now())
  
  @@index([subscription_id, period_start])
  @@index([user_id, usage_type])
}

// ============= AI & CONTENT GENERATION =============

model GenerationJob {
  id                String    @id @default(cuid())
  exam_id           String
  topic             String
  difficulty        Int
  count             Int
  
  status            String    @default("pending")  // pending, processing, completed, failed
  progress          Float     @default(0)
  
  requester_id      String
  ai_provider       String?   // openai, anthropic, cohere
  ai_model          String?   // gpt-4-turbo
  
  generated_count   Int       @default(0)
  approved_count    Int       @default(0)
  rejected_count    Int       @default(0)
  
  cost_usd          Float     @default(0)
  
  started_at        DateTime?
  completed_at      DateTime?
  error_message     String?   @db.Text
  
  created_at        DateTime  @default(now())
  
  questions         QuestionReview[]
  
  @@index([status])
  @@index([requester_id])
}

model QuestionReview {
  id                String    @id @default(cuid())
  generation_job_id String?
  generation_job    GenerationJob? @relation(fields: [generation_job_id], references: [id])
  
  question_data     Json      // Full question object before approval
  status            String    @default("pending")  // pending, approved, rejected
  quality_score     Float?
  
  reviewer_id       String?
  reviewer_feedback String?   @db.Text
  
  created_at        DateTime  @default(now())
  reviewed_at       DateTime?
  
  @@index([status])
  @@index([generation_job_id])
}

model AIInteraction {
  id                String    @id @default(cuid())
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  
  interaction_type  String    // "tutor_query", "explanation_request", "hint"
  user_message      String    @db.Text
  ai_response       String    @db.Text
  
  // Context
  question_id       String?
  exam_id           String?
  
  // AI details
  ai_provider       String    // openai, anthropic
  ai_model          String    // gpt-4-turbo
  tokens_used       Int
  latency_ms        Int
  cost_usd          Float
  
  // Feedback
  helpful           Boolean?
  rating            Int?      // 1-5
  
  created_at        DateTime  @default(now())
  
  @@index([user_id])
  @@index([created_at])
}

// ============= BOOKMARKS & NOTES =============

model Bookmark {
  id                String    @id @default(cuid())
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  question_id       String
  question          Question  @relation(fields: [question_id], references: [id], onDelete: Cascade)
  
  created_at        DateTime  @default(now())
  
  @@unique([user_id, question_id])
  @@index([user_id])
}

model Note {
  id                String    @id @default(cuid())
  user_id           String
  user              User      @relation(fields: [user_id], references: [id])
  question_id       String?
  question          Question? @relation(fields: [question_id], references: [id], onDelete: Cascade)
  
  content           String    @db.Text
  
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  @@index([user_id])
  @@index([question_id])
}

// ============= CONTENT TEMPLATES =============

model QuestionTemplate {
  id                String    @id @default(cuid())
  exam_id           String
  exam              Exam      @relation(fields: [exam_id], references: [id])
  
  topic             String
  question_type     QuestionType
  
  prompt_template   String    @db.Text
  few_shot_examples Json      // Array of example questions
  
  // Constraints
  min_options       Int       @default(4)
  max_options       Int       @default(5)
  allow_multi_select Boolean  @default(false)
  
  created_by        String
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  @@unique([exam_id, topic, question_type])
}
```

---

## 9. API Surface

### 9.1 REST API Endpoints

**Base URL:** `https://api.answly.com/v1`

**Authentication:** JWT tokens in `Authorization: Bearer <token>` header

#### Auth Endpoints

```typescript
POST   /auth/register
Body: { email, password, name }
Response: { user, accessToken, refreshToken }

POST   /auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }

POST   /auth/refresh
Body: { refreshToken }
Response: { accessToken }

POST   /auth/logout
Body: { refreshToken }
Response: { success: true }

POST   /auth/oauth/:provider  // google, github, etc.
Response: { redirectUrl }

GET    /auth/me
Response: { user, subscription, usage }
```

#### Exam Endpoints

```typescript
GET    /exams
Query: { category?, search?, lang?, active? }
Response: { exams: Exam[], total, page, pageSize }

GET    /exams/:examId
Response: { exam: Exam, sections: ExamSection[] }

GET    /exams/:examId/questions
Query: { sectionId?, topic?, difficulty?, limit?, offset? }
Response: { questions: Question[], total }

GET    /exams/:examId/stats
Response: { totalQuestions, avgDifficulty, topicDistribution, userAttempts }
```

#### Test Session Endpoints

```typescript
POST   /test-sessions
Body: { examId, sessionType, questionIds? }
Response: { session: TestSession, questions: Question[] }

GET    /test-sessions/:sessionId
Response: { session: TestSession, currentQuestion, progress }

PUT    /test-sessions/:sessionId/answer
Body: { questionId, answer, timeSpent, flagged? }
Response: { success: true, nextQuestion? }

POST   /test-sessions/:sessionId/pause
Response: { session: TestSession }

POST   /test-sessions/:sessionId/resume
Response: { session: TestSession, remainingTime }

POST   /test-sessions/:sessionId/submit
Response: { session: TestSession, results: SessionAnalytics }

GET    /test-sessions/:sessionId/review
Response: { questions: QuestionWithAttempt[], analytics: SessionAnalytics }
```

#### Analytics Endpoints

```typescript
GET    /analytics/dashboard
Query: { examId?, timeRange? }
Response: { 
  testsT
