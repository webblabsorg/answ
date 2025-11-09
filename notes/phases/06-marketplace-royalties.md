# Phase 5 (Optional): Marketplace & Royalties
## Creator Ecosystem, Moderation, Payouts

> IMPORTANT: Deprecated — Out of Scope. This document is retained for archival reference only. Marketplace & Royalties are not part of the current Answly roadmap/spec and should not be implemented. See: [Roadmap Overview](./00-roadmap-overview.md) and [Implementation README](./README.md).

**Duration:** 4 weeks (2 sessions)  
**Track Type:** Optional (can run after Phase 3 or alongside Phase 4)  
**Goal:** Enable vetted creators to publish/sell content on Answly with royalties

---

## What is the Marketplace?
A curated marketplace where instructors and content creators can publish exam questions, full tests, explanations, and study packs. Organizations and learners can purchase or subscribe to this content. Royalty payouts compensate creators based on usage/sales.

### Purpose & Benefits
- Expand content coverage faster across exams and languages
- Incentivize high‑quality contributions with direct revenue share
- Allow niche/long‑tail content and localized variants
- Create sustainable, community‑powered growth
- Provide institutions with specialized, curated libraries

---

## Session 19: Creator Onboarding & Publishing (Weeks 37–38)

### Objectives
- Define creator roles, verification, and agreements
- Build submission and publishing workflow
- Add moderation & quality gates

### Tasks
- **Creator Roles & RBAC**
  - Roles: Creator, Reviewer, Admin; per‑org creator support
  - KYC via Stripe Connect; tax forms collection
- **Submission Pipeline**
  - Draft → Review → Approved → Published states
  - Metadata: exam, section, topic, locale, difficulty, IRT (optional)
  - Asset upload to S3 (images/audio/video)
- **Moderation**
  - Review queue with checklists and automated checks (duplicates, format)
  - Quality scores and feedback loop; rejections with reasons
- **Pricing & Packaging**
  - SKUs: per‑question pack, full tests, bundles, subscriptions
  - Regional pricing; discounts/coupons compatible

### Deliverables
- Creator dashboard (submissions, sales, payouts)
- Reviewer tools (bulk approve/reject, feedback)
- Publishing API & lifecycle state machine

### Checkpoints
- [ ] Creator onboarding with KYC complete
- [ ] Submissions pass automated + manual checks
- [ ] Content can be published and versioned

---

## Session 20: Royalties, Payouts & Reporting (Weeks 39–40)

### Objectives
- Implement royalty calculation, statements, and payouts
- Provide sales analytics and reporting
- Ensure legal/compliance alignment

### Tasks
- **Royalty Models**
  - Fixed revenue share per sale (e.g., 60/40 creator/platform)
  - Usage‑based share for subscriptions (pool revenue × usage weight)
  - Minimum guarantees (optional, for strategic partners)
- **Calculation Engine**
  - Monthly cycle job aggregates: sales, usage, refunds
  - Per‑item attribution for attempts/consumption
  - Handles coupons/discounts and taxes
- **Payouts (Stripe Connect)**
  - Creator accounts (standard/express)
  - Payout schedules (weekly/monthly) with thresholds
  - Reconciliation and dispute handling
- **Reports & Dashboards**
  - Creator statements, item‑level performance, top buyers
  - Platform reports: GMV, take rate, creator earnings
- **Compliance**
  - KYC/AML via Stripe; 1099/Tax forms generation (US) or local equivalents
  - Content license terms and DMCA takedown process

### Deliverables
- Royalty calculation service + statements PDF
- Stripe Connect payout flows
- Reporting UIs for creators and admins

### Checkpoints
- [ ] Royalty engine reconciles sample month accurately
- [ ] Statements generated and delivered
- [ ] Payouts executed in test mode

---

## Data Model Additions

```prisma
model CreatorProfile {
  id            String   @id @default(cuid())
  user_id       String   @unique
  kyc_status    String   // pending, verified, rejected
  stripe_account_id String?
  locale_focus  String[]
  bio           String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}

model MarketplaceItem {
  id         String   @id @default(cuid())
  type       String   // question_pack, full_test, bundle, subscription
  title      String
  description String?
  exam_id    String
  locale     String   // en, es, fr, hi, zh, ...
  price_cents Int
  currency   String
  sku        String   @unique
  status     String   // draft, review, approved, published
  owner_id   String   // creator user id
  metadata   Json?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model RoyaltyRecord {
  id           String   @id @default(cuid())
  item_id      String
  creator_id   String
  period_month DateTime // 1st day of month
  gross_cents  Int
  discounts_cents Int
  taxes_cents  Int
  net_cents    Int
  platform_fee_cents Int
  creator_share_cents Int
  currency     String
  details      Json?    // breakdown by buyers, usage, refunds
  created_at   DateTime @default(now())
}
```

---

## API Outline

- POST /marketplace/items (create draft)
- POST /marketplace/items/:id/submit (for review)
- POST /marketplace/items/:id/publish
- GET  /marketplace/items (catalog, filters by exam/locale/topic)
- GET  /creators/me/statements
- POST /payouts/execute (admin)

---

## Success Criteria
- Marketplace items pass review and are purchasable
- Royalties calculated accurately and paid out
- Creators have visibility into performance and earnings
- Legal/compliance workflows documented and running
