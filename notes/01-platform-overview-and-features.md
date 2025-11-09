# Answly Technical Specification - Part 1
# Platform Overview & Features

**Version:** 1.0  
**Last Updated:** November 2024  
**Document Type:** Production-Ready Technical Specification  

---

## 1. Platform Overview

### 1.1 Mission

Answly is a web-based platform that delivers **high-fidelity, exam-like practice experiences** for standardized and professional tests. The platform replicates real exam environments with pixel-perfect UI, authentic timing constraints, identical question formats, and accurate scoring methodologies.

### 1.2 Supported Exams

**Standardized Tests:**
- SAT, ACT, PSAT
- GRE, GMAT, LSAT, MCAT
- TOEFL, IELTS
- AP Exams (multiple subjects)

**Professional Certifications:**
- CFA (Levels I, II, III)
- CPA, CMA, CIA
- PMP, CAPM
- AWS, Azure, GCP certifications
- CISSP, CEH, CompTIA
- AMCAT, VAT (various countries)

**Regional/National Exams:**
- A-Levels, IB
- UPSC, JEE, NEET (India)
- Gaokao practice (China)
- Baccalauréat (France)

### 1.3 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Availability** | 99.95% uptime | Monthly SLA |
| **Response Time** | < 200ms (p95) for API calls | APM monitoring |
| **Test Loading** | < 3s full test initialization | Client-side timing |
| **Concurrent Users** | Support 100k+ simultaneous test-takers | Load testing |
| **Data Durability** | 99.999999999% (11 9's) | S3/DB replication |
| **Security** | SOC 2 Type II compliant | Annual audit |
| **GDPR Compliance** | Full data portability & deletion | Automated tooling |
| **Mobile Performance** | Lighthouse score > 90 | CI/CD checks |
| **AI Response Time** | < 5s for question generation | P95 latency |
| **Localization Coverage** | 15+ languages at launch | i18n coverage metrics |

### 1.4 Key Technical Priorities

1. **Exam Fidelity**: Pixel-perfect replication of official exam interfaces
2. **AI Quality**: >95% human-approved question quality rate
3. **Performance**: Sub-second question navigation, instant answer recording
4. **Reliability**: Zero data loss on test submissions
5. **Scalability**: Linear cost scaling with user growth
6. **Accessibility**: WCAG 2.1 AA compliance minimum

---

## 2. Detailed Feature List

### 2.1 Starter Tier Features

**Test Access:**
- 3 full-length practice tests per month (any exam)
- Unlimited access to 10 sample questions per exam section
- Basic performance dashboard
- Auto-graded multiple choice questions

**Study Tools:**
- Question bank browsing (limited to 50 questions/month)
- Basic explanations (text-only)
- Performance history (last 30 days)
- Community forum access (read-only)

**Content:**
- Standard question difficulty only
- English language only
- No downloadable content

### 2.2 Grow Tier Features

**Enhanced Test Access:**
- Unlimited full-length practice tests
- Unlimited question bank access
- Adaptive difficulty testing
- Detailed performance analytics with IRT scoring
- Comparison with global percentiles

**Advanced Study Tools:**
- AI-powered personalized study plans
- Interactive explanations with step-by-step solutions
- Video explanations (where applicable)
- Flashcard generator from missed questions
- Spaced repetition scheduling
- Weak area identification & targeted practice

**Content & Customization:**
- All difficulty levels (easy, medium, hard, expert)
- Create custom practice sets
- Bookmark unlimited questions
- Annotate questions with private notes
- Download/print question sets (with DRM)

**AI Features:**
- Ask AI tutor questions (100 queries/month)
- Generate custom practice questions (50/month)
- Request alternative explanations
- Hint system during practice

**Language & Accessibility:**
- All supported languages
- Text-to-speech
- Adjustable font sizes & contrast modes

### 2.3 Scale Tier Features

**Everything in Grow, plus:**

**Institutional Features:**
- Multi-user management (up to 50 seats)
- Custom test creation & assignment
- Organization-wide analytics dashboard
- White-label branding options
- SSO integration (SAML, OAuth)

**Advanced AI:**
- Unlimited AI tutor queries
- Generate up to 500 custom questions/month
- Fine-tune difficulty to specific needs
- Custom content upload for AI enhancement
- Priority AI processing queue

**Proctoring & Security:**
- Remote proctoring integration
- Secure browser mode enforcement
- IP whitelisting
- Session recording & playback
- Plagiarism detection for essays

**Analytics & Reporting:**
- Psychometric analysis (IRT, CTT)
- Cohort comparison reports
- Exportable data (CSV, PDF, API access)
- Custom report builder
- Predictive scoring (actual exam score estimates)

**Content Creation:**
- Upload custom questions (bulk import)
- Peer review workflow

### 2.4 Admin & Instructor Capabilities

**Content Management:**
- Question CRUD operations
- Bulk import/export (CSV, JSON, QTI format)
- Question versioning & change history
- Difficulty tagging & calibration
- Meta-tagging (topics, subtopics, skills, Bloom's taxonomy)
- Rich media upload (images, audio, video, LaTeX equations)

**Quality Control:**
- Human-in-the-loop AI review queue
- Flag inappropriate/incorrect content
- A/B testing for question variants
- Item analysis dashboard (discrimination index, difficulty, reliability)
- Automated quality metrics (distractor analysis, response time distribution)

**User Management:**
- View/edit user accounts
- Grant/revoke access
- Audit logs
- Impersonate user for support
- Bulk operations (password resets, tier changes)

**AI Oversight:**
- Monitor AI generation jobs
- Approve/reject AI-generated content
- Adjust AI parameters (temperature, model selection)
- View cost analytics per model/provider
- Set budgets & rate limits

### 2.5 Analytics Features

**Individual User Analytics:**
- Score trends over time (line charts)
- Percentile rankings (global, regional, cohort)
- Time management analysis (avg time per question type)
- Accuracy by topic/skill
- Comparative performance (vs. similar users)
- Predicted actual exam score (using IRT)

**Organizational Analytics:**
- Aggregate performance dashboards
- Cohort comparison (classes, groups)
- User engagement metrics (logins, tests taken, time spent)
- Content effectiveness (question-level statistics)
- ROI calculations (score improvement vs. usage)

**Psychometric Analytics:**
- Item Response Theory (IRT) parameters:
  - Difficulty (b-parameter)
  - Discrimination (a-parameter)
  - Guessing (c-parameter)
- Classical Test Theory (CTT) metrics:
  - Item difficulty index
  - Item discrimination index
  - Point-biserial correlation
- Reliability coefficients (Cronbach's alpha, KR-20)
- Standard error of measurement
- Differential item functioning (DIF) analysis

### 2.6 Accessibility Features

**WCAG 2.1 AA Compliance:**
- Keyboard navigation (full functionality without mouse)
- Screen reader compatibility (ARIA labels, semantic HTML)
- Color contrast ratios > 4.5:1
- Resizable text (up to 200% without loss of functionality)
- Focus indicators for interactive elements

**Assistive Technologies:**
- Text-to-speech for question content
- Speech-to-text for essay responses
- Adjustable font families (dyslexia-friendly options)
- High contrast mode
- Reduced motion mode (for vestibular disorders)
- Extended time accommodations
- Pause/break functionality

**Multi-Language Support:**
- Interface localization (15+ languages at launch)
- Right-to-left (RTL) language support (Arabic, Hebrew)
- Question translation (where exam permits)
- Language-specific keyboards for text input
- Currency localization

---

## 3. User Roles & RBAC

### 3.1 Permission Matrix

| Permission | Test-Taker (Starter) | Test-Taker (Grow) | Test-Taker (Scale) | Instructor | Reviewer | Admin | Support |
|------------|-------------------|------------------|---------------------------|------------|----------|-------|---------|
| **Tests** |
| Take practice tests | Limited (3/mo) | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Read-only |
| Access question bank | Limited (50/mo) | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Read-only |
| Create custom tests | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View detailed analytics | Basic | Advanced | Advanced + Org | Advanced | Basic | All | All |
| Download/export data | ❌ | PDF only | PDF + CSV + API | All formats | ❌ | All formats | Read-only |
| **AI Features** |
| AI tutor queries | ❌ | 100/month | Unlimited | Unlimited | ❌ | Unlimited | ❌ |
| Generate questions | ❌ | 50/month | 500/month | 1000/month | ❌ | Unlimited | ❌ |
| Request explanations | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Content Management** |
| Upload questions | ❌ | ❌ | Bulk import | Full CRUD | Approve/Reject | Full CRUD | Read-only |
| Edit questions | ❌ | Report errors | Own content | All content | Flag issues | All content | Read-only |
| Delete questions | ❌ | ❌ | Own content | Own content | Recommend | All content | ❌ |
| Tag/categorize | ❌ | ❌ | Own content | All content | ✅ | All content | ❌ |
| **User Management** |
| View user list | ❌ | ❌ | Own org | ❌ | ❌ | All users | All users |
| Edit user accounts | Self only | Self only | Own org users | ❌ | ❌ | All users | Limited edit |
| Grant permissions | ❌ | ❌ | Own org (limited) | ❌ | ❌ | ✅ | ❌ |
| View audit logs | Own only | Own only | Own org | ❌ | ❌ | All logs | All logs |
| **Billing** |
| View invoices | Own only | Own only | Own org | ❌ | ❌ | All accounts | All accounts |
| Manage subscription | Own only | Own only | Own org | ❌ | ❌ | All accounts | Read-only |
| Refund/credit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Request only |
| **System** |
| Modify platform settings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Access feature flags | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Read-only |

### 3.2 Role Definitions

**Test-Taker (Starter/Grow/Scale)**
- Primary user type
- Permissions based on subscription tier
- Can upgrade/downgrade at any time
- Data retained for 90 days after account closure (then anonymized)
- Can request full data export (GDPR compliance)

**Instructor/Content Creator**
- Can create, edit, and manage test content
- Access to analytics for content they've created
- Can assign tests to students
- Requires verification (email + LinkedIn/credentials)

**Content Reviewer**
- Reviews AI-generated and user-submitted content
- Can approve, reject, or request modifications
- Cannot create content directly
- Focuses on quality control and moderation
- Performance metrics tracked (review speed, accuracy)

**Admin**
- Full system access (superuser)
- Can modify user roles and permissions
- Access to all analytics and logs
- Can execute database migrations and system maintenance
- 2FA required, session expires after 1 hour of inactivity

**Support Agent**
- Read-only access to most features
- Can view user accounts and support tickets
- Can escalate to admins for modifications
- Access to impersonation for debugging (logged & time-limited)
- Can issue refunds up to $50 without approval

**Organization Account**
- Represents an institution (school, company, training center)
- Can manage multiple test-taker accounts (sub-accounts)
- Consolidated billing
- Custom branding (logo, colors)
- SSO integration (SAML 2.0, OAuth 2.0, LDAP)
- Department/group hierarchies

### 3.3 Permission Implementation

**Database Structure:**
```typescript
// Permissions stored as JSON in user table, cached in Redis
interface UserPermissions {
  role: 'test_taker' | 'instructor' | 'reviewer' | 'admin' | 'support' | 'org';
  tier?: 'free' | 'pro' | 'professional'; // Only for test_takers
  organization_id?: string; // For org members
  custom_permissions?: {
    resource: string; // e.g., 'question', 'user', 'analytics'
    actions: ('create' | 'read' | 'update' | 'delete')[];
  }[];
  limits?: {
    tests_per_month?: number;
    ai_queries_per_month?: number;
    question_generation_per_month?: number;
  };
}
```

**Permission Checking Middleware (NestJS):**
```typescript
// guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );
    
    if (!requiredPermissions) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return this.checkPermissions(user, requiredPermissions);
  }
  
  private checkPermissions(user: User, required: string[]): boolean {
    // Check role-based permissions
    // Check tier-based limits
    // Check custom permissions
    // Check organization constraints
  }
}

// Usage in controllers:
@UseGuards(PermissionGuard)
@Permissions('question:create')
@Post('questions')
async createQuestion(@Body() dto: CreateQuestionDto) {
  // ...
}
```

---

## 4. Pricing & Access Logic

### 4.1 Pricing Tiers

**Starter Tier: $0/month**
- 3 full practice tests/month
- 50 question bank questions/month
- Basic analytics
- Community support only

**Grow Tier: $29/month or $290/year (17% savings)**
- Unlimited practice tests
- Unlimited question bank access
- 100 AI tutor queries/month
- 50 custom question generations/month
- Advanced analytics with IRT
- Email support (24-48h response)
- All languages & accessibility features

**Scale Tier: $99/month or $990/year (17% savings)**
- Everything in Grow
- Up to 50 seats
- 500 custom question generations/month per seat
- Unlimited AI tutor queries
- Organization analytics
- Custom branding
- SSO integration
- Priority support (4-8h response)
- Dedicated account manager (for 25+ seats)

**Enterprise Tier: Custom Pricing**
- Unlimited seats
- On-premise deployment option
- Custom AI model fine-tuning
- API access for LMS integration
- SLA guarantees
- White-label solution
- 24/7 phone support

### 4.2 Feature Access Matrix

| Feature | Starter | Grow | Scale | Enterprise |
|---------|------|-----|--------------|------------|
| **Tests** |
| Practice tests per month | 3 | Unlimited | Unlimited | Unlimited |
| Question bank access | 50/mo | Unlimited | Unlimited | Unlimited |
| Adaptive tests | ❌ | ✅ | ✅ | ✅ |
| Custom test creation | ❌ | ✅ | ✅ | ✅ |
| **AI Features** |
| AI tutor queries | ❌ | 100/mo | Unlimited | Unlimited |
| Custom question generation | ❌ | 50/mo | 500/mo/seat | Unlimited |
| Personalized study plans | ❌ | ✅ | ✅ | ✅ |
| AI hint system | ❌ | ✅ | ✅ | ✅ |
| **Analytics** |
| Basic performance metrics | ✅ | ✅ | ✅ | ✅ |
| IRT scoring | ❌ | ✅ | ✅ | ✅ |
| Predictive scoring | ❌ | ✅ | ✅ | ✅ |
| Organization dashboard | ❌ | ❌ | ✅ | ✅ |
| Cohort analysis | ❌ | ❌ | ✅ | ✅ |
| Custom reports | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |
| **Content** |
| All difficulty levels | ❌ | ✅ | ✅ | ✅ |
| All languages | ❌ | ✅ | ✅ | ✅ |
| Download/export | ❌ | PDF | PDF+CSV | All formats |
| Bulk content upload | ❌ | ❌ | ✅ | ✅ |
| **Support** |
| Community forum | ✅ | ✅ | ✅ | ✅ |
| Email support | ❌ | 24-48h | 4-8h | 1-4h |
| Phone support | ❌ | ❌ | ❌ | 24/7 |
| Dedicated account manager | ❌ | ❌ | 25+ seats | ✅ |
| **Infrastructure** |
| Cloud-hosted | ✅ | ✅ | ✅ | ✅ |
| On-premise deployment | ❌ | ❌ | ❌ | ✅ |
| Custom domain | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | Partial | Full |
| SSO integration | ❌ | ❌ | ✅ | ✅ |
| SLA guarantee | ❌ | ❌ | 99.5% | 99.95% |

### 4.3 Usage Metering & Enforcement

**Tracking Limits:**
```typescript
// Implemented in Redis for fast access
interface UsageMetrics {
  user_id: string;
  billing_cycle_start: Date;
  billing_cycle_end: Date;
  
  tests_taken: number;
  tests_limit: number;
  
  questions_accessed: number;
  questions_limit: number;
  
  ai_queries: number;
  ai_queries_limit: number;
  
  question_generations: number;
  question_generations_limit: number;
}

// Reset on billing cycle
// Cached in Redis with TTL = end of billing cycle
// Synced to Postgres hourly for durability
```

**Enforcement Strategy:**
- Soft limits: Warn at 80%, 90%, 95% of quota
- Hard limits: Block action + show upgrade prompt
- Grace period: 3 days past limit for accidental overages
- Overage charges: Optional for Scale/Enterprise ($0.10 per AI query, $0.50 per question generation)

**Regional Pricing:**
```typescript
const regionalPricing = {
  US: { grow: 29, scale: 99 },
  EU: { grow: 27, scale: 92 }, // €25, €85
  UK: { grow: 24, scale: 82 }, // £22, £75
  IN: { grow: 12, scale: 42 }, // ₹999, ₹3499
  BR: { grow: 15, scale: 52 }, // R$75, R$259
  // Purchasing Power Parity adjustments
};
```

### 4.4 Payment Processing

**Providers:**
- **Stripe**: Primary payment processor (cards, wallets)
- **PayPal**: Alternative checkout option
- **Regional**: Razorpay (India), Alipay (China), Mercado Pago (LATAM)

**Supported Payment Methods:**
- Credit/Debit cards (Visa, Mastercard, Amex, Discover)
- Digital wallets (Apple Pay, Google Pay, PayPal)
- Bank transfers (ACH, SEPA)
- Purchase orders (Enterprise only)

**Billing Features:**
- Automatic renewal
- Pro-rated upgrades/downgrades
- 30-day money-back guarantee (Grow tier)
- Volume discounts (Scale: 10+ seats = 10% off, 25+ seats = 15% off)
- Annual billing discount (17% vs. monthly)
- Student verification discount (30% off Grow with valid .edu email)

---

## Next: Continue to Part 2 for UX Wireframes & Architecture
