# Phase 3: Monetization
## Subscription Tiers & Revenue Generation

**Duration:** 8 weeks (4 sessions)  
**Team:** 4-6 engineers  
**Goal:** Launch paid tiers, implement billing, build advanced analytics

---

## Phase Overview

By the end of Phase 3, the platform will:
- Support 3 paid tiers (Starter free, Grow, Scale)
- Process payments via Stripe
- Enforce usage limits and quotas
- Provide advanced analytics dashboards
- Generate predictive insights
- Track MRR and key business metrics

**Success Criteria:**
- Stripe integration live and tested
- >5% conversion rate (free to paid)
- Payment success rate >95%
- Usage metering accurate
- Analytics dashboard complete
- Churn rate <10%

---

## Session 11: Stripe Integration & Billing (Weeks 21-22)

### Objectives
- Integrate Stripe payment processing
- Build subscription management
- Implement webhook handling

### Tasks & Story Points

**Backend (28 pts)**
- [10] Integrate Stripe SDK
- [8] Build subscription service (create, update, cancel)
- [6] Implement webhook handlers
- [4] Add usage metering

**Frontend (20 pts)**
- [10] Build pricing page
- [6] Create checkout flow
- [4] Build subscription management UI

**Testing (10 pts)**
- [6] Test payment flows (success, failure, edge cases)
- [4] Test webhook handling

### Deliverables

**Subscription Service:**
```typescript
@Injectable()
export class SubscriptionService {
  constructor(
    private stripe: Stripe,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  
  async createCheckoutSession(userId: string, tier: Tier, interval: 'month' | 'year') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // Get or create Stripe customer
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { user_id: userId },
      });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripe_customer_id: stripeCustomerId },
      });
    }
    
    // Get price ID
    const priceId = this.getPriceId(tier, interval);
    
    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        user_id: userId,
        tier,
      },
    });
    
    return { checkoutUrl: session.url };
  }
  
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancel(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.Invoice);
        break;
    }
  }
  
  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata.user_id;
    const tier = session.metadata.tier as Tier;
    
    // Get subscription details
    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    );
    
    // Create subscription record
    await this.prisma.subscription.create({
      data: {
        user_id: userId,
        tier,
        status: 'ACTIVE',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        amount: subscription.items.data[0].price.unit_amount || 0,
        currency: subscription.currency.toUpperCase(),
        interval: subscription.items.data[0].price.recurring?.interval || 'month',
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
      },
    });
    
    // Update user tier
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier },
    });
    
    // Update usage limits in Redis
    await this.usageLimitService.initializeLimits(userId, tier);
    
    // Send welcome email
    await this.emailService.sendSubscriptionWelcome(userId, tier);
  }
  
  private getPriceId(tier: Tier, interval: string): string {
    const prices = {
      GROW: {
        month: process.env.STRIPE_PRICE_GROW_MONTHLY,
        year: process.env.STRIPE_PRICE_GROW_YEARLY,
      },
      SCALE: {
        month: process.env.STRIPE_PRICE_SCALE_MONTHLY,
        year: process.env.STRIPE_PRICE_SCALE_YEARLY,
      },
    };
    return prices[tier][interval];
  }
}
```

**Usage Metering:**
```typescript
@Injectable()
export class UsageLimitService {
  async checkLimit(userId: string, action: UsageAction): Promise<boolean> {
    const key = `usage:${userId}:${action}`;
    const current = await this.redis.get(key);
    const limit = await this.getLimit(userId, action);
    
    if (parseInt(current || '0') >= limit) {
      return false; // Limit exceeded
    }
    
    return true;
  }
  
  async incrementUsage(userId: string, action: UsageAction) {
    const key = `usage:${userId}:${action}`;
    const ttl = await this.getResetTTL(userId);
    
    await this.redis.incr(key);
    await this.redis.expire(key, ttl);
    
    // Log to database (async, non-blocking)
    this.logUsage(userId, action).catch(console.error);
  }
  
  private async getLimit(userId: string, action: UsageAction): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { where: { status: 'ACTIVE' } } },
    });
    
    const tier = user?.tier || 'STARTER';
    
    const limits = {
      STARTER: {
        tests_per_month: 3,
        questions_per_month: 50,
        ai_queries_per_month: 0,
        question_generation_per_month: 0,
      },
      GROW: {
        tests_per_month: Infinity,
        questions_per_month: Infinity,
        ai_queries_per_month: 100,
        question_generation_per_month: 50,
      },
      SCALE: {
        tests_per_month: Infinity,
        questions_per_month: Infinity,
        ai_queries_per_month: Infinity,
        question_generation_per_month: 500,
      },
    };
    
    return limits[tier][action];
  }
}
```

**Checkpoint 3.1: Billing Live** ✅
- [ ] Stripe integration complete
- [ ] Users can upgrade to Grow/Scale
- [ ] Payment processing successful (test mode)
- [ ] Webhooks handled correctly
- [ ] Subscription status synced
- [ ] Usage limits enforced

---

## Session 12: Advanced Analytics Dashboard (Weeks 23-24)

### Objectives
- Build comprehensive analytics dashboard
- Implement data visualization
- Add export functionality

### Tasks & Story Points

**Backend (25 pts)**
- [10] Build analytics aggregation service
- [8] Implement topic/skill breakdown
- [5] Add performance trends calculation
- [2] Create export service (CSV/PDF)

**Frontend (30 pts)**
- [12] Build analytics dashboard layout
- [10] Integrate charts (Recharts/Chart.js)
- [5] Add filters and date ranges
- [3] Implement export UI

**Testing (8 pts)**
- [5] Test analytics calculations
- [3] Validate chart rendering

### Deliverables

**Analytics Service:**
```typescript
@Injectable()
export class AnalyticsService {
  async getUserDashboard(userId: string, examId?: string) {
    const [
      testsCompleted,
      avgScore,
      recentSessions,
      topicBreakdown,
      difficultyProgress,
      timeManagement,
      irtProfile,
    ] = await Promise.all([
      this.getTestCount(userId, examId),
      this.getAverageScore(userId, examId),
      this.getRecentSessions(userId, examId, 10),
      this.getTopicBreakdown(userId, examId),
      this.getDifficultyProgress(userId, examId),
      this.getTimeManagement(userId, examId),
      this.getIRTProfile(userId, examId),
    ]);
    
    // Calculate percentile
    const percentile = await this.calculatePercentile(userId, examId, avgScore);
    
    // Get recommendations
    const recommendations = await this.personalizationService
      .getRecommendations(userId, examId);
    
    return {
      summary: {
        testsCompleted,
        avgScore,
        percentile,
        studyStreak: await this.getStreak(userId),
        totalTimeSpent: await this.getTotalTime(userId),
      },
      recentSessions,
      topicBreakdown,
      difficultyProgress,
      timeManagement,
      irtProfile,
      recommendations,
    };
  }
  
  async getTopicBreakdown(userId: string, examId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: { exam_id: examId },
      },
      include: { question: true },
    });
    
    // Group by topic
    const topicStats = new Map();
    
    attempts.forEach(a => {
      const topic = a.question.topic;
      if (!topicStats.has(topic)) {
        topicStats.set(topic, { correct: 0, total: 0, avgTime: 0 });
      }
      const stats = topicStats.get(topic);
      stats.total++;
      if (a.is_correct) stats.correct++;
      stats.avgTime += a.time_spent_sec;
    });
    
    // Convert to array
    return Array.from(topicStats.entries()).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.correct / stats.total,
      avgTime: stats.avgTime / stats.total,
      weaknessScore: 1 - (stats.correct / stats.total), // Higher = weaker
    }))
    .sort((a, b) => b.weaknessScore - a.weaknessScore);
  }
  
  async getDifficultyProgress(userId: string, examId: string) {
    // Get attempts over time, grouped by difficulty
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: { exam_id: examId },
      },
      include: { question: true },
      orderBy: { created_at: 'asc' },
    });
    
    // Group into 2-week buckets
    const buckets = this.groupByWeeks(attempts, 2);
    
    return buckets.map(bucket => ({
      week: bucket.start,
      easy: this.calculateAccuracy(bucket.attempts, 1, 2),
      medium: this.calculateAccuracy(bucket.attempts, 3, 3),
      hard: this.calculateAccuracy(bucket.attempts, 4, 5),
    }));
  }
  
  async generateReport(userId: string, sessionId: string): Promise<Buffer> {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        attempts: { include: { question: true } },
        analytics: true,
      },
    });
    
    // Generate PDF using puppeteer or similar
    const html = this.reportTemplate.render({
      user: await this.prisma.user.findUnique({ where: { id: userId } }),
      session,
      analytics: session.analytics,
      recommendations: await this.personalizationService.getRecommendations(userId, session.exam_id),
    });
    
    const pdf = await this.pdfService.generate(html);
    return pdf;
  }
}
```

**Dashboard Component:**
```typescript
export function AnalyticsDashboard({ userId, examId }: Props) {
  const { data, isLoading } = useQuery(
    ['analytics', userId, examId],
    () => api.analytics.getDashboard(userId, examId)
  );
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div className="analytics-dashboard">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Tests Completed"
          value={data.summary.testsCompleted}
          icon={<TestIcon />}
        />
        <StatCard 
          title="Average Score"
          value={`${data.summary.avgScore}%`}
          trend="+5%"
          icon={<TrophyIcon />}
        />
        <StatCard 
          title="Percentile"
          value={`${data.summary.percentile}th`}
          icon={<ChartIcon />}
        />
        <StatCard 
          title="Study Streak"
          value={`${data.summary.studyStreak} days`}
          icon={<FireIcon />}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Topic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={data.topicBreakdown}
              xKey="topic"
              yKey="accuracy"
              height={300}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Difficulty Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={data.difficultyProgress}
              lines={[
                { key: 'easy', color: '#10b981' },
                { key: 'medium', color: '#f59e0b' },
                { key: 'hard', color: '#ef4444' },
              ]}
              height={300}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recommendations.map(rec => (
            <RecommendationCard key={rec.topic} recommendation={rec} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Checkpoint 3.2: Analytics Complete** ✅
- [ ] Dashboard shows all key metrics
- [ ] Charts render correctly
- [ ] Data calculations accurate
- [ ] Export to PDF/CSV working
- [ ] Performance optimized (<2s load)
- [ ] Mobile responsive

---

## Session 13: Usage Tracking & Optimization (Weeks 25-26)

### Objectives
- Implement detailed usage tracking
- Build business metrics dashboard
- Optimize for conversion

### Tasks & Story Points

**Backend (22 pts)**
- [10] Build business metrics service (MRR, churn, LTV)
- [6] Implement event tracking
- [4] Add cohort analysis
- [2] Create admin analytics API

**Frontend (18 pts)**
- [10] Build admin business dashboard
- [5] Add conversion funnel visualization
- [3] Create user journey tracking

**Product (12 pts)**
- [6] Optimize pricing page
- [4] Add upgrade prompts throughout app
- [2] Implement feature gating

### Deliverables

**Business Metrics:**
```typescript
@Injectable()
export class BusinessMetricsService {
  async getMetrics(startDate: Date, endDate: Date) {
    const [
      mrr,
      arr,
      churnRate,
      conversionRate,
      ltv,
      cac,
      userGrowth,
    ] = await Promise.all([
      this.calculateMRR(startDate, endDate),
      this.calculateARR(startDate, endDate),
      this.calculateChurn(startDate, endDate),
      this.calculateConversion(startDate, endDate),
      this.calculateLTV(),
      this.calculateCAC(startDate, endDate),
      this.getUserGrowth(startDate, endDate),
    ]);
    
    return {
      mrr,
      arr,
      churnRate,
      conversionRate,
      ltv,
      cac,
      ltvCacRatio: ltv / cac,
      userGrowth,
    };
  }
  
  private async calculateMRR(start: Date, end: Date) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        created_at: { gte: start, lte: end },
      },
    });
    
    // Normalize to monthly recurring
    const mrr = subscriptions.reduce((sum, sub) => {
      const monthlyAmount = sub.interval === 'year' 
        ? sub.amount / 12 
        : sub.amount;
      return sum + monthlyAmount;
    }, 0);
    
    return mrr / 100; // Convert cents to dollars
  }
  
  private async calculateChurn(start: Date, end: Date) {
    const startCount = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        created_at: { lt: start },
      },
    });
    
    const canceled = await this.prisma.subscription.count({
      where: {
        status: 'CANCELED',
        canceled_at: { gte: start, lte: end },
      },
    });
    
    return canceled / startCount;
  }
  
  private async calculateConversion(start: Date, end: Date) {
    const signups = await this.prisma.user.count({
      where: {
        created_at: { gte: start, lte: end },
      },
    });
    
    const conversions = await this.prisma.subscription.count({
      where: {
        created_at: { gte: start, lte: end },
        tier: { in: ['GROW', 'SCALE'] },
      },
    });
    
    return conversions / signups;
  }
}
```

**Conversion Optimization:**
```typescript
// Feature gating with upgrade prompts
export function FeatureGate({ feature, tier, children }: Props) {
  const { user } = useAuth();
  const hasAccess = checkFeatureAccess(user.tier, feature, tier);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return (
    <UpgradePrompt
      feature={feature}
      requiredTier={tier}
      onUpgrade={() => router.push('/pricing')}
    />
  );
}

// Usage throughout app
<FeatureGate feature="ai_tutor" tier="GROW">
  <AITutorChat />
</FeatureGate>

<FeatureGate feature="custom_tests" tier="GROW">
  <CreateCustomTestButton />
</FeatureGate>
```

**Checkpoint 3.3: Metrics & Optimization** ✅
- [ ] Business dashboard shows MRR, churn, conversion
- [ ] Event tracking operational
- [ ] Conversion funnel optimized
- [ ] Upgrade prompts strategically placed
- [ ] Feature gating working
- [ ] A/B testing framework ready

---

## Session 14: Polish & Revenue Optimization (Weeks 27-28)

### Objectives
- Final polish for paid features
- Optimize conversion flows
- Prepare for launch

### Tasks & Story Points

**Product (20 pts)**
- [8] Optimize onboarding flow
- [6] Add in-app messaging for upgrades
- [4] Implement referral program
- [2] Add testimonials/social proof

**Backend (15 pts)**
- [8] Implement coupon/discount codes
- [5] Add subscription pausing
- [2] Build cancellation flow with feedback

**Frontend (18 pts)**
- [10] Polish pricing page
- [5] Add comparison tables
- [3] Implement trial period UI

**Testing (10 pts)**
- [6] End-to-end payment testing
- [4] Load test with payment scenarios

### Deliverables

**Coupon System:**
```typescript
@Injectable()
export class CouponService {
  async applyCoupon(code: string, userId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });
    
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Invalid coupon');
    }
    
    if (coupon.expires_at && coupon.expires_at < new Date()) {
      throw new BadRequestException('Coupon expired');
    }
    
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      throw new BadRequestException('Coupon limit reached');
    }
    
    // Check user eligibility
    const alreadyUsed = await this.prisma.couponUsage.findFirst({
      where: { coupon_id: coupon.id, user_id: userId },
    });
    
    if (alreadyUsed && !coupon.allow_multiple_uses) {
      throw new BadRequestException('Already used this coupon');
    }
    
    return coupon;
  }
  
  async createStripeCoupon(coupon: Coupon) {
    return await this.stripe.coupons.create({
      id: coupon.code,
      percent_off: coupon.percent_off,
      duration: coupon.duration,
      max_redemptions: coupon.max_uses,
    });
  }
}
```

**Cancellation Flow with Feedback:**
```typescript
async cancelSubscription(subscriptionId: string, feedback: CancellationFeedback) {
  // Save feedback
  await this.prisma.cancellationFeedback.create({
    data: {
      subscription_id: subscriptionId,
      reason: feedback.reason,
      comments: feedback.comments,
      would_return: feedback.wouldReturn,
    },
  });
  
  // Offer to pause instead?
  if (feedback.reason === 'too_expensive') {
    return {
      suggestion: 'pause',
      message: 'Would you like to pause your subscription for 1-3 months instead?',
    };
  }
  
  // Cancel in Stripe
  const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
  
  // Update database
  await this.prisma.subscription.update({
    where: { stripe_subscription_id: subscriptionId },
    data: {
      status: 'CANCELED',
      canceled_at: new Date(),
    },
  });
  
  // Send exit survey email
  await this.emailService.sendCancellationSurvey(subscription.customer);
  
  return { success: true };
}
```

**Checkpoint 3.4: Launch Ready** ✅
- [ ] All payment flows tested
- [ ] Conversion rate >5%
- [ ] Churn rate <10%
- [ ] MRR tracking accurate
- [ ] Coupon system working
- [ ] Cancellation flow smooth

---

## Phase 3 Final Deliverables

### Revenue Features
✅ Stripe billing integration  
✅ 3 subscription tiers (Starter, Grow, Scale)  
✅ Usage metering and limits  
✅ Coupon/discount system  
✅ Cancellation with feedback  

### Analytics Features
✅ User analytics dashboard  
✅ Business metrics dashboard  
✅ Topic/skill breakdown  
✅ Performance trends  
✅ Export to PDF/CSV  

### Business Metrics
- **Conversion Rate:** >5%
- **Churn Rate:** <10%
- **Payment Success:** >95%
- **MRR Growth:** 20% month-over-month target
- **LTV:CAC:** >3:1

---

## Phase 3 Gate Review

Before proceeding to Phase 4:

### Revenue
- [ ] Stripe integration working (production mode)
- [ ] First paying customers acquired
- [ ] MRR tracking accurate
- [ ] Conversion rate >5%
- [ ] Churn rate <10%

### Product
- [ ] Usage limits enforced correctly
- [ ] Analytics dashboard complete
- [ ] All tier features differentiated
- [ ] Upgrade prompts optimized
- [ ] Feature gating working

### Technical
- [ ] Payment webhooks reliable
- [ ] No revenue leakage (all transactions tracked)
- [ ] Subscription status always in sync
- [ ] Export functionality working
- [ ] Performance maintained

---

# Phase 3 Spec Parity Addendum

This addendum augments Phase 3 with items from the technical specification to ensure full coverage of billing, analytics, and revenue features.

## Session 11: Payments & Billing (Weeks 21-22)

- **Multicurrency & Localization**
  - Currency detection from locale/IP with user override; currency switcher in header
  - Price books by currency (USD, EUR, GBP, INR, BRL) with Stripe prices
  - Exchange rates refresh daily via Stripe FX rates or Fixer.io fallback
  - Localized number/date formats per locale (Intl APIs)
- **Regional Payment Providers**
  - PayPal: alternate checkout path and webhook handling
  - Razorpay (India), Alipay (China), Mercado Pago (LATAM) adapters (feature-flag per region)
  - Fallback to Stripe where supported; provider selection logic by country and currency
- **Taxes, Invoicing & Receipts**
  - Stripe Tax: automatic jurisdiction detection and VAT/GST calculation
  - Business profile & VAT ID validation on org accounts
  - PDF invoice generation and storage in S3, link from billing history
  - Dunning management: retry schedule (1h, 24h, 3d, 7d), email reminders, payment method update link
- **Refunds & Credits**
  - Admin partial/full refunds via Dashboard endpoint; credit balance support
  - Proration for mid-cycle plan changes

## Session 12: Analytics Dashboard (Weeks 23-24)

- **Psychometric Analytics**
  - Item analysis: difficulty index, discrimination, point‑biserial, response time distribution
  - Cohort benchmarking (global, regional, org)
  - Reliability metrics (KR‑20, Cronbach’s alpha)
- **Exports & Sharing**
  - CSV exports for attempts and item stats
  - PDF export for results and cohort reports (templated)
- **Data Pipeline**
  - Event stream (Kafka or Kinesis) for user events: answers, flags, time-on-question
  - Aggregations to OLAP store (Athena/Redshift/BigQuery) nightly; dashboard reads via API

## Session 13: Usage & Business Metrics (Weeks 25-26)

- **Business KPIs**
  - MRR, ARR, churn, conversion, LTV, CAC, LTV:CAC ratio
  - Segment events (Segment SDK) forwarding to Mixpanel/Amplitude
- **Conversion Optimization**
  - Pricing page A/B tests (copy, CTA, annual toggle default)
  - In‑app upgrade nudges for locked features with contextual value props

## Session 14: Revenue Polish (Weeks 27-28)

- **Subscriptions UX**
  - Pause subscription (1-3 months), scheduled cancellation with save offers
  - Trials (7/14 days) with card capture setting configurable per plan
- **Compliance & Reporting**
  - Revenue reports by region/currency; tax summaries (downloadable)
  - PCI posture: card data handled by Stripe elements only (no server storage)

## Acceptance Criteria Additions

- Prices configured per currency; invoices show currency and tax lines
- At least one regional provider live in sandbox (e.g., Razorpay or PayPal)
- Dunning emails & retry logic verified in test mode
- Item analysis and cohort benchmarking visible on analytics dashboard
- Event pipeline delivering aggregates to OLAP store for charts
- CSV/PDF exports downloadable and correct


---


## Next Phase

Proceed to: **[Phase 4: Enterprise](./04-phase4-enterprise.md)**

Focus: SSO, white-label, proctoring, API access
