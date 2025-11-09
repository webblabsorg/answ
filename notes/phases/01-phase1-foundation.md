# Phase 1: Foundation
## Core Platform Development

**Duration:** 12 weeks (6 sessions)  
**Team:** 3-6 engineers  
**Goal:** Build working MVP with test-taking capabilities

---

## Phase Overview

By the end of Phase 1, users should be able to:
- Register and login to the platform
- Browse available exams (GRE, SAT, GMAT)
- Take a full-length practice test
- Submit answers and see results
- Review questions with basic explanations
- Admins can manage question content

**Success Criteria:**
- 3 exam types fully implemented
- 500+ questions loaded per exam
- Test completion rate >80%
- Page load time <3s
- Zero data loss on submissions

---

## Session 1: Infrastructure & Auth (Weeks 1-2)

### Objectives
- Set up development environment
- Implement authentication system
- Create basic UI shell

### Tasks & Story Points

**Backend (20 pts)**
- [8] Set up NestJS project with TypeScript
- [5] Configure PostgreSQL + Prisma schema
- [3] Implement JWT authentication
- [2] Set up Redis for sessions
- [2] Create user registration endpoint

**Frontend (18 pts)**
- [8] Set up Next.js 14 with App Router
- [5] Configure TailwindCSS + ShadCN UI
- [3] Build login/register pages
- [2] Implement auth context/store

**DevOps (10 pts)**
- [4] Set up AWS infrastructure (ECS, RDS) for API/services
- [3] Configure CI/CD (GitHub Actions → Vercel for FE, AWS for API)
- [2] Set up staging (Vercel frontend + AWS staging API)
- [1] Configure environment variables (Vercel env + AWS Secrets)

### Deliverables

**Code:**
```typescript
// Backend: auth.service.ts
@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hashedPassword,
        name: dto.name,
        tier: 'STARTER',
      },
    });
    return this.generateTokens(user);
  }
  
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }
}
```

**Checkpoint 1.1: Auth System Working** ✅
- [ ] Users can register with email/password
- [ ] Users can login and receive JWT
- [ ] Protected routes return 401 when unauthorized
- [ ] Refresh token flow working
- [ ] Password reset email sent (mock)

---

## Session 2: Exam Catalog & Data Models (Weeks 3-4)

### Objectives
- Finalize database schema
- Build exam catalog UI
- Seed initial question data

### Tasks & Story Points

**Backend (22 pts)**
- [8] Implement exam models (Exam, Section, Question)
- [5] Create exam CRUD endpoints
- [4] Build question import service (CSV/JSON)
- [3] Seed database with 100 questions per exam
- [2] Add question search/filter API

**Frontend (20 pts)**
- [8] Build exam catalog page
- [6] Create exam detail page with sections
- [4] Build question preview component
- [2] Add exam search & filters

**Content (15 pts)**
- [10] Prepare 100 GRE questions (with solutions)
- [5] Prepare 100 SAT Math questions

### Deliverables

**Database Schema:**
```prisma
model Exam {
  id                  String    @id @default(cuid())
  name                String
  code                String    @unique
  category            String
  duration_minutes    Int
  total_sections      Int
  total_questions     Int
  sections            ExamSection[]
  questions           Question[]
}

model Question {
  id                    String    @id @default(cuid())
  exam_id               String
  question_text         String    @db.Text
  question_type         QuestionType
  options               Json
  correct_answer        Json
  difficulty_level      Int       @default(3)
  topic                 String
}
```

**Checkpoint 1.2: Exam Catalog Live** ✅
- [ ] 3 exams visible in catalog (GRE, SAT, GMAT)
- [ ] Each exam shows sections and structure
- [ ] 100+ questions loaded per exam
- [ ] Search and filter working
- [ ] Question preview rendering correctly

---

## Session 3: Test-Taking UI - Part 1 (Weeks 5-6)

### Objectives
- Build core test-taking interface
- Implement timer and navigation
- Handle answer submission

### Tasks & Story Points

**Backend (18 pts)**
- [8] Create test session management
- [5] Implement WebSocket for real-time updates
- [3] Build answer submission endpoint
- [2] Add session state caching (Redis)

**Frontend (25 pts)**
- [10] Build test-taking shell (header, timer, navigation)
- [8] Create question renderer (MCQ, numeric, text)
- [4] Implement answer selection/input
- [3] Build navigation panel with question grid

### Deliverables

**Test Session Flow:**
```typescript
// Frontend: Test-taking page
export default function TestPage({ params }: { params: { sessionId: string } }) {
  const { session, currentQuestion } = useTestSession(params.sessionId);
  const [answer, setAnswer] = useState(null);
  
  const handleSubmitAnswer = async () => {
    await api.submitAnswer(params.sessionId, {
      questionId: currentQuestion.id,
      answer,
      timeSpent: timer.elapsed,
    });
    // Move to next question
  };
  
  return (
    <div className="test-layout">
      <Header timer={timer} onSubmit={handleSubmitTest} />
      <div className="flex">
        <QuestionPanel 
          question={currentQuestion}
          answer={answer}
          onAnswerChange={setAnswer}
        />
        <NavigationPanel 
          questions={session.questions}
          current={currentQuestion.id}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}
```

**Checkpoint 1.3: Basic Test-Taking Works** ✅
- [ ] User can start a test session
- [ ] Questions display correctly
- [ ] Timer counts down
- [ ] Answers can be selected/entered
- [ ] Navigation between questions works
- [ ] Progress saved in real-time

---

## Session 4: Test-Taking UI - Part 2 (Weeks 7-8)

### Objectives
- Complete test submission flow
- Build results page
- Add review functionality

### Tasks & Story Points

**Backend (20 pts)**
- [8] Implement test grading logic
- [6] Build results calculation (score, percentile)
- [4] Create question review endpoint
- [2] Add attempt history tracking

**Frontend (22 pts)**
- [8] Build results dashboard
- [6] Create question review interface
- [5] Add flagging and notes features
- [3] Implement section review screen

**Testing (8 pts)**
- [5] Write E2E tests for test-taking flow
- [3] Load test with 100 concurrent users

### Deliverables

**Grading Service:**
```typescript
@Injectable()
export class GradingService {
  async gradeSession(sessionId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { session_id: sessionId },
      include: { question: true },
    });
    
    let totalCorrect = 0;
    attempts.forEach(attempt => {
      const isCorrect = this.validateAnswer(
        attempt.question,
        attempt.user_answer
      );
      attempt.is_correct = isCorrect;
      if (isCorrect) totalCorrect++;
    });
    
    // Calculate scores by section
    const sectionScores = this.calculateSectionScores(attempts);
    
    // Save results
    await this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'GRADED',
        total_correct: totalCorrect,
        total_questions: attempts.length,
        raw_score: totalCorrect,
        scaled_score: this.scaleScore(totalCorrect, attempts.length),
      },
    });
    
    // Generate analytics
    await this.analyticsService.generateSessionAnalytics(sessionId);
  }
}
```

**Checkpoint 1.4: Full Test Flow Complete** ✅
- [ ] User can complete entire test
- [ ] Submission successful (no data loss)
- [ ] Results page shows score
- [ ] Section breakdown displayed
- [ ] User can review all questions
- [ ] Correct/incorrect answers highlighted

---

## Session 5: Admin Panel & Content Management (Weeks 9-10)

### Objectives
- Build admin dashboard
- Create question management interface
- Implement bulk import

### Tasks & Story Points

**Backend (18 pts)**
- [8] Create admin API endpoints (CRUD questions)
- [5] Build bulk import service (CSV parsing)
- [3] Add role-based access control
- [2] Implement admin audit logging

**Frontend (25 pts)**
- [10] Build admin dashboard layout
- [8] Create question editor interface
- [5] Build bulk import UI with validation
- [2] Add admin user management page

**Content (10 pts)**
- [10] Prepare 400 more questions (total 500 per exam)

### Deliverables

**Admin Question Editor:**
```typescript
// Frontend: Question editor component
export function QuestionEditor({ question, onSave }: Props) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    question_type: question?.question_type || 'MULTIPLE_CHOICE',
    options: question?.options || [
      { id: 'A', text: '', correct: false },
      { id: 'B', text: '', correct: false },
      { id: 'C', text: '', correct: false },
      { id: 'D', text: '', correct: false },
    ],
    difficulty_level: question?.difficulty_level || 3,
    topic: question?.topic || '',
    explanation: question?.explanation || '',
  });
  
  const handleSave = async () => {
    const validation = validateQuestion(formData);
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }
    await onSave(formData);
    toast.success('Question saved!');
  };
  
  return (
    <form>
      <Textarea 
        label="Question Text"
        value={formData.question_text}
        onChange={(e) => setFormData({...formData, question_text: e.target.value})}
      />
      <OptionEditor options={formData.options} onChange={handleOptionsChange} />
      <Select label="Difficulty" value={formData.difficulty_level} />
      <Button onClick={handleSave}>Save Question</Button>
    </form>
  );
}
```

**Checkpoint 1.5: Admin Tools Ready** ✅
- [ ] Admin can login with elevated permissions
- [ ] Question CRUD operations working
- [ ] Bulk import accepts CSV files
- [ ] 500+ questions per exam loaded
- [ ] Validation prevents malformed questions
- [ ] Audit log tracks all changes

---

## Session 6: Polish, Testing & Launch Prep (Weeks 11-12)

### Objectives
- Bug fixes and polish
- Performance optimization
- Security hardening
- Documentation

### Tasks & Story Points

**Bug Fixes (15 pts)**
- [10] Fix critical bugs from testing
- [5] Address UI/UX issues

**Performance (12 pts)**
- [5] Optimize database queries (add indexes)
- [4] Implement API response caching
- [3] Add CDN for static assets

**Security (10 pts)**
- [5] Security audit and fixes
- [3] Rate limiting implementation
- [2] Input validation hardening

**Testing (15 pts)**
- [8] Write comprehensive E2E tests
- [4] Load testing (1000 concurrent users)
- [3] Security penetration testing

**Documentation (8 pts)**
- [4] API documentation (Swagger)
- [2] User guide
- [2] Admin guide

### Deliverables

**Performance Optimization:**
```typescript
// Add database indexes
@@index([exam_id, topic])
@@index([status])
@@index([difficulty_level])

// Caching layer
@Injectable()
export class ExamService {
  async getExam(examId: string) {
    // Check cache first
    const cached = await this.redis.get(`exam:${examId}`);
    if (cached) return JSON.parse(cached);
    
    // Fetch from DB
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: true },
    });
    
    // Cache for 1 hour
    await this.redis.set(
      `exam:${examId}`,
      JSON.stringify(exam),
      'EX',
      3600
    );
    
    return exam;
  }
}
```

**Checkpoint 1.6: MVP Ready for Beta** ✅
- [ ] All critical bugs fixed
- [ ] Performance targets met (<3s load, <200ms API)
- [ ] Security audit passed (no critical issues)
- [ ] Load test passed (1000 concurrent users)
- [ ] Documentation complete
- [ ] Staging environment stable
- [ ] Ready for beta users

---

## Phase 1 Final Deliverables

### Code Deliverables
✅ Frontend repository with Next.js app  
✅ Backend repository with NestJS API  
✅ Database schema with 1500+ questions  
✅ Admin panel for content management  
✅ CI/CD pipeline with automated tests  

### Features Delivered
✅ User authentication (email/password)  
✅ Exam catalog (GRE, SAT, GMAT)  
✅ Full test-taking experience  
✅ Automatic grading  
✅ Results dashboard  
✅ Question review  
✅ Admin content management  

### Technical Metrics
- **Test Coverage:** >80% backend, >60% frontend
- **Performance:** <3s page load, <200ms API (p95)
- **Availability:** >99.5% during beta
- **Security:** Zero critical vulnerabilities
- **Load Capacity:** 1000 concurrent test-takers

---

## Phase 1 Gate Review

Before proceeding to Phase 2, verify:

### Functional Requirements
- [ ] 3 complete exam types implemented
- [ ] Users can complete full-length tests
- [ ] Grading is accurate (spot-check 100 questions)
- [ ] Admin can manage all content
- [ ] No data loss in 100 test submissions

### Non-Functional Requirements
- [ ] Page load time <3s (p95)
- [ ] API response time <200ms (p95)
- [ ] Database queries optimized (no N+1)
- [ ] Caching implemented for read-heavy endpoints
- [ ] CDN configured for static assets

### Quality Requirements
- [ ] Unit test coverage >80%
- [ ] E2E tests cover critical paths
- [ ] Load test passed (1000 concurrent users)
- [ ] Security scan passed
- [ ] Code review completed for all PRs

### Documentation Requirements
- [ ] API documentation (Swagger)
- [ ] README with setup instructions
- [ ] Architecture decision records (ADRs)
- [ ] Deployment runbook
- [ ] User/admin guides

### Team Readiness
- [ ] Team comfortable with codebase
- [ ] Code review process working well
- [ ] CI/CD pipeline reliable
- [ ] Sprint velocity consistent
- [ ] Technical debt backlog managed

---

## Lessons Learned Template

**What Went Well:**
- 

**What Could Be Improved:**
- 

**Action Items for Phase 2:**
- 

---

# Phase 1 Spec Parity Addendum

This addendum augments Phase 1 with tasks from the technical specification to ensure full coverage.

## Session 1: Infrastructure & Auth (Weeks 1-2)

- **PWA Baseline**
  - Configure Next.js PWA (next-pwa), service worker scaffold
  - App Shell pattern; offline fallback route `/offline`
- **Accessibility Foundations**
  - Install ESLint a11y rules, axe-core dev checks
  - Define WCAG 2.1 AA acceptance criteria in PR template
- **Design System**
  - ShadCN tokens (colors/spacing) with high-contrast variants

## Session 2: Exam Catalog & Data Models (Weeks 3-4)

- **Homepage (ChatGPT-style layout)**
  - Left sidebar (categories, saved, recent)
  - Center chat/test launcher
  - Right panel (stats/recommendations)
- **Search (ElasticSearch/OpenSearch) Bootstrap**
  - Provision cluster (dev/staging)
  - Create `questions` index mappings (text + keyword + dense_vector)
  - ETL job to sync Questions → ES
- **Asset Storage (S3/Supabase)**
  - Buckets: `question-media/`, `explanations/`, `org-branding/`
  - Signed URL helper; upload policies

## Session 3: Test-Taking UI - Part 1 (Weeks 5-6)

- **Keyboard Shortcuts & a11y**
  - Next (N), Previous (P), Flag (F), Submit (S)
  - Focus management between options and grid
- **Localization/i18n**
  - Integrate `next-intl` with language switcher
  - Load translations from `/locales/{lang}.json`
  - RTL support (Arabic/Hebrew) via `dir="rtl"`

## Session 4: Test-Taking UI - Part 2 (Weeks 7-8)

- **Essay & Math Enhancements**
  - Essay: word count, print-safe styling
  - Math: KaTeX, copy protection (optional), equation alt-text
- **Offline Test Flow**
  - Cache next N questions in IndexedDB
  - Local answer queue; background sync on reconnect

## Session 5: Admin Panel & Content Management (Weeks 9-10)

- **Bulk Media Import**
  - CSV + ZIP (images/audio) import validation
- **Search Admin Tools**
  - Reindex button, index health status, field analyzer

## Session 6: Polish, Testing & Launch Prep (Weeks 11-12)

- **PWA Verification**
  - Lighthouse PWA: >90 score
  - Install prompt + app icons
- **Localization QA**
  - Snapshot tests for LTR/RTL
- **Accessibility Audit**
  - axe violations: 0 critical, 0 serious
- **Monitoring**
  - Sentry + basic Web Vitals reporting (LCP, FID, CLS)

---

## Acceptance Criteria Additions

- PWA offline works for practice sessions (read-only)
- Homepage matches wireframe layout components
- ES index populated and query API returns results
- i18n switch toggles languages; RTL renders correctly
- Keyboard shortcuts functional and documented
- a11y checks pass (WCAG 2.1 AA baseline)


---

## Next Phase

Once Phase 1 gate is passed, proceed to:
**[Phase 2: AI Integration](./02-phase2-ai-integration.md)**

Focus: Question generation, AI tutor, IRT calibration
