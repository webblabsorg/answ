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
