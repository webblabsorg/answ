# Answly Technical Specification - Part 6
# Security, Testing, Deployment & Appendices

---

## 12. Security & Compliance

### 12.1 Authentication
- JWT tokens (15min access, 7d refresh)
- bcrypt password hashing (cost: 12)
- OAuth 2.0 (Google, GitHub)
- Rate limiting: 5 login attempts per 15min
- RBAC with permission caching (Redis, 5min TTL)

### 12.2 API Security
- Rate limits by tier (Starter: 60rpm, Grow: 300rpm)
- Input validation (class-validator)
- SQL injection protection (Prisma ORM)
- XSS prevention (CSP headers, React escaping)
- CSRF tokens for state-changing operations

### 12.3 Data Protection
- Encryption at rest (AES-256)
- TLS 1.3 in transit
- GDPR: Data export, right to be forgotten
- Sensitive fields: Additional app-level encryption
- Data retention: 3 years, then auto-delete

### 12.4 Proctoring (Scale tier)
- Secure browser mode
- Identity verification (ID + selfie + liveness)
- Webcam/screen recording
- AI anomaly detection
- Integration: ProctorU, Proctorio

---

## 13. Testing

### 13.1 Test Coverage
- Unit: 80% (Jest)
- Integration: E2E critical paths (Playwright)
- Load: k6 (500 concurrent users, <500ms p95)

### 13.2 Example Tests

**Unit Test:**
```typescript
describe('QuestionGeneratorService', () => {
  it('should generate valid questions', async () => {
    const result = await service.generate({ examId: 'GRE', count: 10 });
    expect(result.generated).toBe(10);
    result.questions.forEach(q => {
      expect(q.question).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    });
  });
});
```

**E2E Test:**
```typescript
test('complete test flow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Start GRE Test');
  await page.click('[data-option="A"]');
  await page.click('button:has-text("Submit")');
  await expect(page).toHaveURL(/\/results/);
});
```

### 13.3 AI Quality Assurance
- Automated validation (format, plausibility, duplicates)
- Human review (10% sample, inter-rater reliability > 0.85)
- IRT calibration (post-launch, 30+ attempts)
- BLEU/ROUGE metrics for explanations

---

## 14. Operations

### 14.1 Monitoring
- **Metrics**: Prometheus + Grafana (latency, error rate, throughput)
- **Logging**: Structured JSON, ELK stack
- **Errors**: Sentry (automatic issue creation)
- **Alerts**: PagerDuty (critical), Slack (warnings)

### 14.2 Scaling
- **App**: Auto-scale ECS (2-20 instances, CPU > 70%)
- **DB**: Postgres with 2 read replicas
- **Cache**: Redis Cluster (6 nodes)
- **CDN**: CloudFlare (static assets)

### 14.3 Disaster Recovery
- **RTO**: 1 hour
- **RPO**: 15 minutes
- **Backups**: Daily DB snapshots (30d retention), S3 versioning

---

## 15. Deployment

### 15.1 Infrastructure (AWS)
```
VPC → ALB → ECS (App) → RDS (DB) + ElastiCache (Redis) → S3
```

### 15.2 CI/CD (GitHub Actions)
```yaml
on: push to main
1. Lint & Test (unit + e2e)
2. Build Docker image → ECR
3. Deploy to ECS (blue-green)
4. Smoke tests
```

---

## 16. Appendices

### 16.1 Sample Prompts

**GRE Prompt:**
```
Generate GRE Text Completion question.
Topic: {topic}, Difficulty: {1-5}
Requirements: Graduate-level vocab, 2 blanks, plausible distractors
Output: JSON with question, options, answer, explanation, difficulty
```

**SAT Math Prompt:**
```
Generate SAT Math question.
Topic: {topic}, Calculator: {yes/no}, Difficulty: {1-5}
Requirements: Real-world context, reasonable numbers, common error distractors
Output: JSON with question, options, solution_steps, difficulty
```

### 16.2 API Response Examples

**Create Test Session:**
```json
{
  "session": {
    "id": "sess_123",
    "exam_id": "gre",
    "status": "IN_PROGRESS",
    "started_at": "2024-11-09T14:30:00Z"
  },
  "questions": [
    {
      "id": "q_001",
      "question_text": "...",
      "options": [...]
    }
  ]
}
```

**Test Results:**
```json
{
  "session_id": "sess_123",
  "score": 324,
  "percentile": 85,
  "section_breakdown": [
    {"section": "Verbal", "score": 160, "correct": 15, "total": 20},
    {"section": "Quant", "score": 164, "correct": 17, "total": 20}
  ],
  "insights": {
    "strengths": ["Algebra", "Arithmetic"],
    "weaknesses": ["Reading Comprehension - Inference"],
    "recommendations": [
      {"type": "practice", "topic": "Reading Inference", "count": 20}
    ]
  }
}
```

### 16.3 Exam Feature Matrix

| Feature | GRE | SAT | GMAT | CFA | TOEFL |
|---------|-----|-----|------|-----|-------|
| Multiple Choice | ✓ | ✓ | ✓ | ✓ | ✓ |
| Numeric Entry | ✓ | ✓ | ✓ | ✓ | ✗ |
| Essay | ✓ | ✓ | ✓ | ✓ | ✓ |
| Calculator | Quant only | Math only | ✗ | ✓ | ✗ |
| Adaptive | ✓ | ✗ | ✓ | ✗ | ✗ |
| Listening | ✗ | ✗ | ✗ | ✗ | ✓ |
| Duration | 3h 45m | 3h | 3h 30m | 6h | 3h |

### 16.4 Tech Stack Summary

**Frontend:**
- Next.js 14, React 18, TypeScript
- TailwindCSS, ShadCN UI
- Zustand, React Query
- KaTeX (math), Monaco (code)

**Backend:**
- NestJS 10, Prisma ORM
- PostgreSQL 15, Redis 7
- ElasticSearch, Pinecone (vectors)

**AI/ML:**
- OpenAI (GPT-4), Anthropic (Claude)
- LangChain, IRT (3PL model)
- Fine-tuning, RAG

**Infra:**
- AWS (ECS, RDS, S3, CloudFront)
- Stripe (payments)
- SendGrid (email)
- Sentry, Datadog

---

## Summary

Answly is a production-ready exam practice platform with:

1. **High-fidelity tests** replicating real exams (GRE, SAT, CFA, etc.)
2. **AI-powered content** (generation, explanations, tutoring)
3. **Advanced analytics** (IRT scoring, personalized insights)
4. **Multi-tier access** (Starter, Grow, Scale, Enterprise)
5. **Scalable architecture** (100k+ concurrent users)
6. **Enterprise features** (SSO, proctoring, white-label)

Ready for 3-6 engineer team implementation.

**Estimated Timeline:**
- Phase 1 (3 months): Core features (auth, exams, test-taking, basic analytics)
- Phase 2 (2 months): AI integration (generation, tutor, IRT)
- Phase 3 (2 months): Grow features (analytics, proctoring, subscriptions)
- Phase 4 (1 month): Enterprise (SSO, white-label, API)

Total: ~8 months to MVP + enterprise launch
