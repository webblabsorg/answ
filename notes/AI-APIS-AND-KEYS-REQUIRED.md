# AI APIs and Keys Required for Answly Platform

**Last Updated:** November 10, 2025  
**Platform:** Answly - AI-Powered Exam Preparation Platform  
**Status:** Production Configuration Guide

---

## 📋 Executive Summary

The Answly platform requires **5 critical AI/payment service integrations** and **3 optional enhancement services**. Translation uses OpenAI (no separate Google Translate API needed), and currency conversion currently uses static fallback rates (external API recommended for production). This document lists all required API keys, their roles, pricing, and configuration.

---

## ⚠️ Important Clarifications

### Translation Service
**NO Google Translate API Needed** - The platform uses OpenAI GPT models for translation:
- **Current Implementation:** `TranslationService` uses `AIOrchestrator` (OpenAI/Anthropic)
- **Supported Languages:** English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi
- **Why This Approach:** Already using OpenAI, so leveraging it for translation is cost-effective
- **Location:** `src/ai/services/translation.service.ts`
- **Cost:** Included in OpenAI usage (~$0.01-0.03 per 1K tokens)

### Currency Conversion Service
**External Currency API Recommended** - Currently uses static fallback rates:
- **Current Implementation:** `CurrencyService` with hardcoded rates (USD, EUR, GBP, CAD, AUD, JPY, INR, BRL)
- **TODO Comment:** "fetch from Stripe FX rates or external provider"
- **Recommendation:** Integrate one of these APIs:
  - **Fixer.io** - $10/month for 1,000 requests/month (recommended)
  - **ExchangeRate-API** - Free tier: 1,500 requests/month
  - **Open Exchange Rates** - $12/month for unlimited requests
  - **Stripe FX Rates** - Free if using Stripe (best option)
- **Location:** `src/billing/services/currency.service.ts`
- **Status:** Works with fallback rates but needs real-time data for production

---

## 🤖 Core AI Providers

### 1. OpenAI (Primary - REQUIRED)

**API Key:** `OPENAI_API_KEY` (environment variable)

**Roles & Purposes:**

| Feature | Model | Role | Usage |
|---------|-------|------|-------|
| **Question Generation** | `gpt-4-turbo-preview` | Generate exam questions with multiple choice options | High |
| **AI Tutor Chat** | `gpt-4-turbo-preview` | Real-time tutoring conversations | High |
| **Explanations** | `gpt-4-turbo-preview` | Detailed answer explanations | Medium |
| **Study Plans** | `gpt-4-turbo-preview` | Personalized study recommendations | Medium |
| **Embeddings (RAG)** | `text-embedding-3-small` | Vector embeddings for semantic search | High |
| **Content Validation** | `gpt-4-turbo-preview` | Validate generated questions | Medium |

**Configuration:**
```bash
OPENAI_API_KEY="your-openai-key-here"  # REQUIRED
```

**Default Model:** `gpt-4-turbo-preview`  
**Embedding Model:** `text-embedding-3-small` (1536 dimensions)

**Pricing (Approximate):**
- GPT-4 Turbo: $0.01/1K prompt tokens, $0.03/1K completion tokens
- Embeddings: $0.0001/1K tokens

**Monthly Estimate:** 
- 10,000 questions generated: ~$150
- 50,000 tutor messages: ~$300
- 100,000 embeddings: ~$10
- **Total:** ~$460/month

**Where Used:**
- `src/ai/providers/openai.provider.ts` - Main provider
- `src/ai/services/question-generator.service.ts` - Question generation
- `src/ai/services/ai-tutor.service.ts` - Tutoring conversations
- `src/ai/services/rag.service.ts` - Embeddings for RAG
- `src/ai/services/vector-store.service.ts` - Embedding generation

**Fallback:** Anthropic (Claude) if OpenAI fails

---

### 2. Anthropic Claude (Secondary - REQUIRED)

**API Key:** `ANTHROPIC_API_KEY` (environment variable)

**Roles & Purposes:**

| Feature | Model | Role | Usage |
|---------|-------|------|-------|
| **Question Generation** | `claude-3-5-sonnet-20241022` | Backup for OpenAI failures | Medium |
| **AI Tutor Chat** | `claude-3-5-sonnet-20241022` | Backup tutoring provider | Medium |
| **Explanations** | `claude-3-5-sonnet-20241022` | Alternative explanation engine | Low |
| **Content Validation** | `claude-3-5-sonnet-20241022` | Validate and improve questions | Low |

**Configuration:**
```bash
ANTHROPIC_API_KEY="your-anthropic-key-here"  # REQUIRED
```

**Default Model:** `claude-3-5-sonnet-20241022`

**Pricing (Approximate):**
- Claude 3.5 Sonnet: $0.003/1K prompt tokens, $0.015/1K completion tokens

**Monthly Estimate:** 
- Backup usage (~20% of traffic): ~$100/month

**Where Used:**
- `src/ai/providers/anthropic.provider.ts` - Provider implementation
- `src/ai/services/ai-orchestrator.service.ts` - Failover routing

**Fallback:** OpenAI if Claude fails

**Note:** Claude does NOT support embeddings - OpenAI required for RAG

---

### 3. Cohere (Optional - Recommended)

**API Key:** `COHERE_API_KEY`

**Roles & Purposes:**

| Feature | Model | Role | Usage |
|---------|-------|------|-------|
| **Embeddings** | `embed-english-v3.0` | Alternative embedding provider | Low |
| **Reranking** | `rerank-english-v3.0` | Improve RAG result quality | Low |
| **Classification** | `command-r-plus` | Question difficulty classification | Low |

**Configuration:**
```bash
COHERE_API_KEY="..."  # OPTIONAL
```

**Default Model:** `command-r-plus`  
**Embedding Model:** `embed-english-v3.0`

**Pricing (Approximate):**
- Command R+: $0.0005/1K prompt tokens, $0.0015/1K completion tokens
- Embeddings: $0.0001/1K tokens

**Monthly Estimate:** ~$50/month (if used)

**Where Used:**
- `src/ai/providers/cohere.provider.ts` - Provider implementation
- Used for embeddings and reranking

**Status:** Optional - enhances RAG quality but not critical

---

## 🗄️ Vector Database

### 4. Pinecone (REQUIRED for RAG)

**API Keys:**
- `PINECONE_API_KEY` - Main API key
- `PINECONE_ENVIRONMENT` - Environment (e.g., `us-east1-gcp`)
- `PINECONE_INDEX` - Index name (e.g., `answly-questions`)

**Roles & Purposes:**

| Feature | Purpose | Importance |
|---------|---------|------------|
| **Question Search** | Semantic search across 50K+ questions | Critical |
| **RAG Context** | Retrieve relevant questions for AI tutor | Critical |
| **Personalization** | Find similar questions for IRT | High |
| **Study Recommendations** | Match questions to user weaknesses | Medium |

**Configuration:**
```bash
PINECONE_API_KEY="..."                # REQUIRED
PINECONE_ENVIRONMENT="us-east1-gcp"   # REQUIRED
PINECONE_INDEX="answly-questions"     # REQUIRED
```

**Index Configuration:**
- **Dimension:** 1536 (matches OpenAI `text-embedding-3-small`)
- **Metric:** Cosine similarity
- **Pods:** Start with 1 pod (can scale)

**Pricing:**
- Starter: $70/month (1M vectors)
- Standard: $0.096/hour per pod

**Monthly Estimate:** ~$70-100/month

**Where Used:**
- `src/ai/services/vector-store.service.ts` - Main integration
- `src/ai/services/rag.service.ts` - RAG context retrieval
- `src/ai/services/personalization.service.ts` - User recommendations

**Alternatives:** 
- Weaviate (self-hosted)
- Qdrant (open-source)
- Chroma (lightweight)

---

## 💳 Payment Provider APIs

### 5. Stripe (REQUIRED)

**API Keys:**
```bash
STRIPE_SECRET_KEY="sk_test_..."       # REQUIRED
STRIPE_PUBLISHABLE_KEY="pk_test_..."  # REQUIRED (frontend)
STRIPE_WEBHOOK_SECRET="whsec_..."     # REQUIRED
```

**Roles & Purposes:**

| Feature | Purpose | Importance |
|---------|---------|------------|
| **Subscription Management** | Handle recurring billing | Critical |
| **Payment Processing** | Credit card payments | Critical |
| **Customer Portal** | Self-service billing | High |
| **Tax Calculation** | Stripe Tax for VAT/GST | High |
| **Invoicing** | Automatic invoice generation | High |
| **Webhooks** | Payment status notifications | Critical |

**Price IDs (Configure in Stripe Dashboard):**
```bash
STRIPE_PRICE_GO="price_..."       # $5/month
STRIPE_PRICE_PLUS="price_..."     # $20/month
STRIPE_PRICE_PRO="price_..."      # $200/month
```

**Monthly Cost:** 2.9% + $0.30 per transaction

**Where Used:**
- `src/billing/services/stripe.service.ts` - Main integration
- `src/billing/controllers/subscription.controller.ts` - Checkout
- `src/billing/controllers/webhook.controller.ts` - Webhooks

---

## 🌍 Regional Payment Providers (Optional)

### 6. PayPal (Optional)

**API Keys:**
```bash
PAYPAL_SANDBOX_ENABLED=false
PAYPAL_SANDBOX_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
```

**Purpose:** Alternative payment method for select regions

**Where Used:** `src/billing/services/paypal.service.ts`

---

### 7. Razorpay (Optional - India)

**API Keys:**
```bash
RAZORPAY_ENABLED=false
RAZORPAY_API_KEY="rzp_live_..."
RAZORPAY_API_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

**Purpose:** UPI, NetBanking, and cards for Indian market

**Where Used:** `src/billing/services/regional-payment.service.ts`

---

### 8. Mercado Pago (Optional - Latin America)

**API Keys:**
```bash
MERCADOPAGO_ENABLED=false
MERCADOPAGO_API_KEY="..."
MERCADOPAGO_WEBHOOK_SECRET="..."
```

**Purpose:** PIX, Boleto, OXXO for Latin American markets

**Where Used:** `src/billing/services/regional-payment.service.ts`

---

### 9. Alipay (Optional - China)

**API Keys:**
```bash
ALIPAY_ENABLED=false
ALIPAY_API_KEY="..."
ALIPAY_API_SECRET="..."
```

**Purpose:** Alipay and WeChat Pay for Chinese market

**Where Used:** `src/billing/services/regional-payment.service.ts`

---

## 📧 Communication Services

### 10. Email Service (SMTP/SendGrid)

**API Keys:**
```bash
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@answly.com"
```

**Roles & Purposes:**

| Feature | Purpose | Importance |
|---------|---------|------------|
| **Password Reset** | Send reset links | Critical |
| **Email Verification** | Account activation | Critical |
| **Invitations** | Team member invites | High |
| **Dunning Emails** | Payment failure reminders | High |
| **Notifications** | Exam results, updates | Medium |

**Monthly Cost:** 
- SendGrid: Free tier (100 emails/day), then $19.95/month

**Where Used:**
- `src/auth/services/email.service.ts` (needs implementation)
- `src/billing/services/dunning.service.ts` (TODO)
- `src/enterprise/services/invite.service.ts` (TODO)

---

## 🔐 Authentication Providers (Optional)

### 11. Google OAuth (Optional)

**API Keys:**
```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

**Purpose:** Google Workspace SSO

**Where Used:** `src/enterprise/services/sso.service.ts`

---

### 12. Microsoft OAuth (Optional)

**API Keys:**
```bash
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."
MICROSOFT_TENANT_ID="..."
```

**Purpose:** Azure AD / Microsoft 365 SSO

**Where Used:** `src/enterprise/services/sso.service.ts`

---

## 📊 Analytics & Monitoring (Optional)

### 13. Sentry (Recommended)

**API Key:**
```bash
SENTRY_DSN="https://...@sentry.io/..."
```

**Purpose:** Error tracking and performance monitoring

---

### 14. PostHog (Optional)

**API Key:**
```bash
POSTHOG_API_KEY="..."
POSTHOG_HOST="https://app.posthog.com"
```

**Purpose:** Product analytics and feature flags

---

## 💱 Currency Exchange Rate API (RECOMMENDED)

### 15. Currency API - Choose One

**⭐ Option 1: Stripe FX Rates (RECOMMENDED - FREE)**
- **Setup:** Use Stripe's built-in exchange rates
- **API:** Available via Stripe API you already use
- **Cost:** FREE (included with Stripe)
- **Implementation:** Update `CurrencyService.getRates()` to call Stripe API

**Option 2: ExchangeRate-API (FREE)**
```bash
EXCHANGE_RATE_API_KEY="..."  # Optional
EXCHANGE_RATE_API_URL="https://v6.exchangerate-api.com/v6"
```
- **Cost:** FREE (1,500 requests/month)
- **Paid:** $9/month for 100K requests
- **Get Key:** https://www.exchangerate-api.com/

**Option 3: Fixer.io**
```bash
FIXER_API_KEY="..."
```
- **Cost:** $10/month (1,000 requests/month)
- **Get Key:** https://fixer.io/

**Option 4: Open Exchange Rates**
```bash
OPEN_EXCHANGE_RATES_APP_ID="..."
```
- **Cost:** $12/month (unlimited)
- **Get Key:** https://openexchangerates.org/

**Current Status:**
- ⚠️ Uses static fallback rates (updated manually)
- ✅ Works but not real-time
- 🎯 Recommended: Use Stripe FX rates (already integrated)

**Where Used:**
- `src/billing/services/currency.service.ts` (TODO: integrate external API)
- `src/billing/controllers/subscription.controller.ts` (pricing/:currency endpoint)

---

## 📧 Email Service Implementation

### 16. Email Service (REQUIRED - Needs Implementation)

**Current Status:** ⚠️ **NOT YET IMPLEMENTED** - Email service referenced but not fully built

**Required For:**
- Password reset emails (`src/auth/auth.service.ts`)
- Email verification
- Team invitations (`src/enterprise/services/invite.service.ts`)
- Payment failure notifications (`src/billing/services/dunning.service.ts`)
- GDPR compliance emails (`src/compliance/services/compliance.service.ts`)

**Recommended Provider: SendGrid**
```bash
SENDGRID_API_KEY="SG...."
FROM_EMAIL="noreply@answly.com"
FROM_NAME="Answly"

# Or use SMTP
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-smtp-password"
```

**Alternative Providers:**
- **Amazon SES:** $0.10 per 1K emails
- **Mailgun:** Free for 5K emails/month
- **Postmark:** $15/month for 10K emails

**Implementation TODO:**
1. Create `src/common/services/email.service.ts`
2. Implement templates for:
   - Password reset
   - Email verification
   - Team invitations
   - Payment failures (dunning)
   - GDPR export/deletion notifications
3. Update auth, billing, enterprise, and compliance modules

---

## 📦 File Storage Service (RECOMMENDED)

### 17. AWS S3 or CloudFlare R2 (Recommended)

**Purpose:** Store user-generated content and exports

**Use Cases:**
- **GDPR Data Exports:** User data export files (`src/compliance/services/compliance.service.ts`)
- **Audit Log Exports:** CSV downloads (`src/compliance/services/audit-log.service.ts`)
- **User Avatars:** Profile pictures
- **Invoice PDFs:** Stripe invoices (already via Stripe)
- **Study Material Uploads:** Future feature

**AWS S3 Configuration:**
```bash
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="answly-uploads"
```

**CloudFlare R2 (Cheaper Alternative):**
```bash
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="answly-uploads"
```

**Pricing:**
- **S3:** $0.023/GB/month + $0.0004/1K GET requests
- **CloudFlare R2:** $0.015/GB/month + FREE egress (better for downloads)

**Current Status:** ⚠️ Not implemented - needed for GDPR exports, audit logs

---

## 🌐 CDN Service (OPTIONAL)

### 18. CloudFlare or AWS CloudFront

**Purpose:** Serve static assets (images, fonts, JS/CSS)

**Benefits:**
- Faster page loads globally
- Reduced server bandwidth
- DDoS protection
- Free HTTPS

**CloudFlare (Recommended):**
```bash
CLOUDFLARE_ZONE_ID="..."
CLOUDFLARE_API_TOKEN="..."
```
- **Cost:** FREE tier available
- **Setup:** Point domain DNS to CloudFlare

**AWS CloudFront:**
```bash
AWS_CLOUDFRONT_DISTRIBUTION_ID="..."
```
- **Cost:** $0.085/GB for first 10TB

**Current Status:** ⚠️ Not implemented - optional performance enhancement

---

## 🎯 Required vs Optional Summary

### CRITICAL (Must Have for Production)

| Service | Key(s) | Monthly Cost | Status |
|---------|--------|--------------|--------|
| **OpenAI** | `OPENAI_API_KEY` | ~$460 | ⚠️ REQUIRED |
| **Anthropic** | `ANTHROPIC_API_KEY` | ~$100 | ⚠️ REQUIRED |
| **Pinecone** | `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX` | ~$70 | ⚠️ REQUIRED |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | 2.9% + $0.30 | ⚠️ REQUIRED |
| **Email (SMTP)** | `SMTP_*` credentials | ~$20 | ⚠️ REQUIRED |

**Total Critical Monthly Cost:** ~$650 + transaction fees

### RECOMMENDED (Enhance Platform)

| Service | Key(s) | Monthly Cost | Purpose |
|---------|--------|--------------|---------|
| **Currency API** | Varies (or FREE with Stripe) | $0-12 | Real-time FX rates |
| **File Storage (S3/R2)** | AWS credentials | $5-10 | GDPR exports, avatars |
| **Email Service** | `SENDGRID_API_KEY` | $0-20 | Notifications (REQUIRED) |
| **Cohere** | `COHERE_API_KEY` | ~$50 | Better embeddings |
| **Sentry** | `SENTRY_DSN` | $26 | Error tracking |
| **PostHog** | `POSTHOG_API_KEY` | $0-20 | Analytics |
| **CDN (CloudFlare)** | Domain setup | $0-20 | Performance |

**Total Recommended:** ~$101-158/month

### OPTIONAL (Regional/Enterprise)

| Service | Key(s) | Monthly Cost | Use Case |
|---------|--------|--------------|----------|
| **PayPal** | `PAYPAL_CLIENT_*` | Free + fees | Alternative payment |
| **Razorpay** | `RAZORPAY_API_*` | Free + fees | India market |
| **Mercado Pago** | `MERCADOPAGO_API_KEY` | Free + fees | Latin America |
| **Alipay** | `ALIPAY_API_*` | Free + fees | China market |
| **Google OAuth** | `GOOGLE_CLIENT_*` | Free | SSO |
| **Microsoft OAuth** | `MICROSOFT_CLIENT_*` | Free | SSO |

---

## 📝 Complete .env Configuration

### Minimum Viable Configuration (MVP)

```bash
# ============================================================================
# CRITICAL - Platform won't function without these
# ============================================================================

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/answly"

# Redis (Caching)
REDIS_URL="redis://localhost:6379"

# JWT Authentication
JWT_SECRET="your_super_secure_random_string_here"
JWT_EXPIRATION="7d"
JWT_REFRESH_SECRET="another_secure_random_string"
JWT_REFRESH_EXPIRATION="30d"

# OpenAI (CRITICAL - Primary AI provider)
OPENAI_API_KEY="your-openai-key-here"  # Get from https://platform.openai.com/api-keys

# Anthropic Claude (CRITICAL - Backup AI provider)
ANTHROPIC_API_KEY="your-anthropic-key-here"  # Get from https://console.anthropic.com/

# Pinecone (CRITICAL - Vector database for RAG)
PINECONE_API_KEY="your-pinecone-key-here"  # Get from https://app.pinecone.io/
PINECONE_ENVIRONMENT="us-east1-gcp"
PINECONE_INDEX="answly-questions"

# Stripe (CRITICAL - Payment processing)
STRIPE_SECRET_KEY="your-stripe-secret-key"  # Get from https://dashboard.stripe.com/apikeys
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"  # From webhook endpoint setup
STRIPE_PRICE_GO="your-price-id-go"      # Create products in Stripe Dashboard
STRIPE_PRICE_PLUS="your-price-id-plus"
STRIPE_PRICE_PRO="your-price-id-pro"

# Email (CRITICAL - User communications) - NEEDS IMPLEMENTATION
SENDGRID_API_KEY="your-sendgrid-key"  # Get from https://sendgrid.com/
FROM_EMAIL="noreply@answly.com"
FROM_NAME="Answly"
# OR use SMTP
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-smtp-password"

# Server
PORT=4000
NODE_ENV="production"
CORS_ORIGIN="https://yourdomain.com"

# ============================================================================
# RECOMMENDED - Production features
# ============================================================================

# Currency Conversion (RECOMMENDED - Use Stripe FX or external API)
# Option 1: Use Stripe FX rates (FREE - already have Stripe)
# No additional config needed

# Option 2: ExchangeRate-API (FREE)
EXCHANGE_RATE_API_KEY="..."  # Optional for free tier
EXCHANGE_RATE_API_URL="https://v6.exchangerate-api.com/v6"

# File Storage (RECOMMENDED - For GDPR exports, avatars)
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="answly-uploads"

# Or CloudFlare R2 (cheaper)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="answly-uploads"

# Error Tracking (RECOMMENDED)
SENTRY_DSN="https://...@sentry.io/..."

# Analytics (OPTIONAL)
POSTHOG_API_KEY="..."
POSTHOG_HOST="https://app.posthog.com"

# CDN (OPTIONAL)
CLOUDFLARE_ZONE_ID="..."
CLOUDFLARE_API_TOKEN="..."
```

---

## 🔧 Setup Instructions by Service

### 1. OpenAI Setup

**Steps:**
1. Go to https://platform.openai.com/signup
2. Create account or sign in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy key (starts with `sk-proj-`)
6. Add to `.env`: `OPENAI_API_KEY="sk-proj-..."`

**Test:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Models to Enable:**
- GPT-4 Turbo (text generation)
- text-embedding-3-small (embeddings)

---

### 2. Anthropic Claude Setup

**Steps:**
1. Go to https://console.anthropic.com/
2. Create account
3. Navigate to API Keys
4. Create new key
5. Copy key (starts with `sk-ant-api03-`)
6. Add to `.env`: `ANTHROPIC_API_KEY="sk-ant-api03-..."`

**Test:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

---

### 3. Pinecone Setup

**Steps:**
1. Go to https://app.pinecone.io/
2. Create account
3. Create new index:
   - **Name:** `answly-questions`
   - **Dimension:** 1536
   - **Metric:** Cosine
   - **Cloud:** AWS/GCP (choose region)
4. Copy API key from settings
5. Add to `.env`:
```bash
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="us-east1-gcp"
PINECONE_INDEX="answly-questions"
```

**Test:**
```bash
curl https://controller.us-east1-gcp.pinecone.io/databases \
  -H "Api-Key: $PINECONE_API_KEY"
```

---

### 4. Stripe Setup

**Steps:**
1. Go to https://dashboard.stripe.com/register
2. Create account
3. Get API keys from https://dashboard.stripe.com/apikeys
4. Create products and prices:
   - Go to Products → Add Product
   - Create: "Go Plan" ($5/month), "Plus Plan" ($20/month), "Pro Plan" ($200/month)
   - Copy price IDs (start with `price_`)
5. Set up webhook:
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`
   - Copy webhook secret (starts with `whsec_`)

**Add to `.env`:**
```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_GO="price_..."
STRIPE_PRICE_PLUS="price_..."
STRIPE_PRICE_PRO="price_..."
```

---

### 5. Email Service Setup (SendGrid)

**Steps:**
1. Go to https://sendgrid.com/
2. Create account
3. Navigate to Settings → API Keys
4. Create new API key with "Full Access"
5. Verify sender email/domain

**Add to `.env`:**
```bash
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@answly.com"
```

**Test:**
```bash
# Using SendGrid Web API
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@answly.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

---

## 🔄 AI Provider Routing Logic

### Provider Selection Strategy

**Question Generation:**
```
1. Try OpenAI (gpt-4-turbo-preview) - 80% of traffic
2. Fallback to Anthropic (claude-3-5-sonnet) - if OpenAI fails
3. Cache results for 24h to reduce costs
```

**AI Tutor:**
```
1. Try OpenAI (gpt-4-turbo-preview) - Primary
2. Fallback to Anthropic (claude-3-5-sonnet) - if OpenAI fails
3. Use Cohere for embeddings/reranking if available
```

**Embeddings:**
```
1. Try OpenAI (text-embedding-3-small) - Primary
2. Fallback to Cohere (embed-english-v3.0) - if available
3. No fallback if both fail (RAG disabled)
```

**Implementation:**
```typescript
// src/ai/services/ai-orchestrator.service.ts
const provider = await this.selectProvider('question_generation');
// Returns: OpenAIProvider or AnthropicProvider
```

---

## 💰 Cost Optimization Strategies

### 1. Caching

**Response Cache:**
- Cache common question generations: 24h TTL
- Cache tutor responses for similar queries: 1h TTL
- Cache embeddings: Permanent (in vector DB)

**Savings:** ~40% reduction in API calls

### 2. Model Selection

**Smart Routing:**
- Use GPT-3.5 Turbo for simple questions: 10x cheaper
- Use GPT-4 only for complex generation
- Batch embed operations

**Savings:** ~30% cost reduction

### 3. Rate Limiting

**User Quotas:**
- Free tier: 10 questions/month (minimal cost)
- Paid tiers: Rate limits prevent abuse

**Savings:** Prevents runaway costs

### 4. Batch Processing

**Bulk Operations:**
- Batch question generation (10 at once)
- Batch embedding (100 questions at once)

**Savings:** ~20% efficiency gain

---

## 📊 Cost Breakdown by Feature

| Feature | Primary API | Monthly Cost | Users Affected |
|---------|-------------|--------------|----------------|
| Question Generation | OpenAI GPT-4 | $150 | All tiers |
| AI Tutor | OpenAI GPT-4 | $300 | Paid tiers |
| Embeddings (RAG) | OpenAI + Pinecone | $80 | All |
| Content Validation | OpenAI GPT-4 | $10 | Admin only |
| Backup Provider | Anthropic Claude | $100 | Failover |
| Payment Processing | Stripe | 2.9% + fees | Paid tiers |
| Email | SendGrid | $20 | All |

**Total:** ~$660/month + transaction fees

**Per User Cost:** 
- 1,000 users: $0.66/user/month
- 10,000 users: $0.066/user/month
- 100,000 users: $0.0066/user/month (scales well)

---

## ⚠️ Critical Dependencies

### Without These, Platform CANNOT Function:

1. **OPENAI_API_KEY** - No question generation or AI tutor
2. **PINECONE_API_KEY** - No RAG, reduced tutor quality
3. **STRIPE_SECRET_KEY** - No paid subscriptions
4. **SMTP Credentials** - No password resets or notifications

### Without These, Platform Has Reduced Functionality:

1. **ANTHROPIC_API_KEY** - No failover (downtime if OpenAI fails)
2. **COHERE_API_KEY** - Reduced RAG quality
3. **Regional providers** - Limited to Stripe-supported countries

---

## 🚀 Quick Start for Development

### Minimum .env for Local Testing

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/answly_dev"
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="local_dev_secret_123"
JWT_EXPIRATION="7d"

# AI (Get free tier keys)
OPENAI_API_KEY="sk-proj-..."           # REQUIRED
ANTHROPIC_API_KEY="sk-ant-api03-..."   # REQUIRED

# Pinecone (Use free tier)
PINECONE_API_KEY="..."                 # REQUIRED
PINECONE_ENVIRONMENT="us-east1-gcp"
PINECONE_INDEX="answly-dev"

# Stripe (Use test mode)
STRIPE_SECRET_KEY="sk_test_..."        # REQUIRED
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Use Ethereal for testing)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."

# Server
PORT=4000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
```

**Free Tier Limits:**
- OpenAI: $5 free credit (test only)
- Anthropic: Limited free tier
- Pinecone: Free starter plan (1M vectors)
- Stripe: Test mode (free)
- Ethereal: Free test email service

---

## 📞 API Key Security Best Practices

### DO:
✅ Store keys in environment variables (never in code)  
✅ Use different keys for dev/staging/production  
✅ Rotate keys every 90 days  
✅ Monitor API usage for anomalies  
✅ Set up billing alerts  
✅ Use least-privilege scopes  

### DON'T:
❌ Commit keys to version control  
❌ Share production keys  
❌ Use production keys in development  
❌ Expose keys in client-side code  
❌ Log full API keys  

---

## 🔗 API Documentation Links

### AI Providers

- **OpenAI:** https://platform.openai.com/docs/api-reference
- **Anthropic:** https://docs.anthropic.com/claude/reference
- **Cohere:** https://docs.cohere.com/
- **Pinecone:** https://docs.pinecone.io/

### Payment Providers

- **Stripe:** https://stripe.com/docs/api
- **Razorpay:** https://razorpay.com/docs/api/
- **Mercado Pago:** https://www.mercadopago.com/developers/en/docs
- **Alipay:** https://global.alipay.com/docs/

---

## 📈 Scaling Considerations

### At 10,000 Users

**AI Costs:**
- OpenAI: ~$500-800/month
- Anthropic: ~$100-150/month
- Pinecone: ~$100/month
- **Total AI:** ~$700-1,050/month

**Per User:** $0.07-0.10/month (marginal cost)

### At 100,000 Users

**AI Costs:**
- OpenAI: ~$3,000-5,000/month (bulk discounts apply)
- Anthropic: ~$500-800/month
- Pinecone: ~$500/month (multiple pods)
- **Total AI:** ~$4,000-6,300/month

**Per User:** $0.04-0.06/month (economies of scale)

### Enterprise Volume Discounts

**Available from:**
- OpenAI: Contact sales at 100K+ tokens/day
- Anthropic: Enterprise plans available
- Pinecone: Reserved capacity pricing

---

## ✅ Quick Checklist for Production

### Before Launch:

- [ ] OpenAI API key configured and funded
- [ ] Anthropic API key configured as backup
- [ ] Pinecone index created with 1536 dimensions
- [ ] Stripe products and prices created
- [ ] Stripe webhook endpoint configured and tested
- [ ] Email service configured and sender verified
- [ ] All keys in production `.env`
- [ ] API keys rotated from development keys
- [ ] Billing alerts set up (OpenAI, Anthropic, Pinecone)
- [ ] Usage monitoring dashboards configured

### Optional Enhancements:

- [ ] Cohere API for better embeddings
- [ ] Sentry for error tracking
- [ ] PostHog for analytics
- [ ] Regional payment providers for target markets
- [ ] SSO providers (Google/Microsoft)

---

## 📞 Summary

**REQUIRED APIs:** 5 (OpenAI, Anthropic, Pinecone, Stripe, Email)  
**RECOMMENDED APIs:** 3 (Cohere, Sentry, PostHog)  
**OPTIONAL APIs:** 6 (Regional payments, SSO providers)  

**Critical Monthly Cost:** ~$650  
**Full Setup Cost:** ~$750-800  

**Platform Features Requiring AI:**
- ✅ Question Generation (OpenAI primary, Claude backup)
- ✅ AI Tutor (OpenAI primary, Claude backup)
- ✅ RAG Context (OpenAI embeddings + Pinecone)
- ✅ Explanations (OpenAI primary)
- ✅ Study Plans (OpenAI primary)
- ✅ Content Validation (OpenAI primary)
- ✅ IRT Personalization (OpenAI + analytics)

**Without API Keys, These Features Are Disabled:**
- AI question generation → Manual question upload only
- AI tutor → Feature unavailable
- Smart recommendations → Basic recommendations only
- Automatic explanations → Manual explanations only

**Recommendation:** Secure OpenAI, Anthropic, and Pinecone keys first. These three enable 95% of AI functionality. Add others based on feature priority and budget.

---

## 🔍 Menu Items Review - Missing APIs Check

**All menu items reviewed from `AppSidebar.tsx`:**

| Menu Item | APIs Required | Status |
|-----------|---------------|--------|
| **AI Tutor** | OpenAI, Anthropic, Pinecone (RAG) | ✅ Complete |
| **Practice Tests** | OpenAI (question generation), IRT scoring | ✅ Complete |
| **Performance Insights** | Internal analytics (no external API) | ✅ Complete |
| **Study Plan** | OpenAI (generation), Personalization service | ✅ Complete |
| **Usage & Limits** | Internal tracking (no external API) | ✅ Complete |
| **Billing & Invoices** | Stripe API | ✅ Complete |
| **My Performance** | Internal analytics | ✅ Complete |
| **Recommendations** | OpenAI + IRT + analytics | ✅ Complete |
| **Organization** | Internal (teams, SSO), Email service | ⚠️ Email TODO |
| **Admin Analytics** | Internal + Stripe | ✅ Complete |
| **Admin Predictions** | Internal ML models | ✅ Complete |
| **Review Queue** | Internal workflow | ✅ Complete |
| **User Management** | Internal CRUD | ✅ Complete |
| **Bulk Import** | CSV parsing (no API) | ✅ Complete |

**Verdict:** All menu features covered! Only missing piece is Email Service implementation.

---

## 📋 Implementation Checklist

### ✅ Already Implemented
- [x] OpenAI integration (questions, tutor, translations)
- [x] Anthropic Claude backup provider
- [x] Pinecone vector database
- [x] Stripe billing and webhooks
- [x] Currency conversion (static rates)
- [x] Translation service (via OpenAI)
- [x] Regional payment providers (Razorpay, Mercado Pago, Alipay)
- [x] Tax calculation (Stripe Tax)
- [x] SSO infrastructure (Google, Microsoft)
- [x] Audit logs and compliance features

### ⚠️ Needs Implementation
- [ ] **Email Service** (HIGH PRIORITY - REQUIRED)
  - Create `src/common/services/email.service.ts`
  - Integrate SendGrid or SMTP
  - Implement email templates
  - Wire up to auth, billing, enterprise, compliance modules

- [ ] **File Storage** (MEDIUM PRIORITY - RECOMMENDED)
  - Choose S3 or CloudFlare R2
  - Implement upload/download service
  - Wire up GDPR exports
  - Wire up audit log CSV exports
  - Add user avatar uploads

- [ ] **Currency API** (LOW PRIORITY - ENHANCEMENT)
  - Update `CurrencyService.getRates()` to call external API
  - Recommended: Use Stripe FX rates (free)
  - Alternative: ExchangeRate-API free tier

### 🔧 Optional Enhancements
- [ ] Cohere API for better embeddings and reranking
- [ ] Sentry for error tracking
- [ ] PostHog for product analytics
- [ ] CDN (CloudFlare) for performance
- [ ] Regional payment provider integrations (if expanding internationally)

---

## 🎯 Quick Action Items

### Before Production Launch:

1. **Get API Keys (30 minutes):**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Pinecone: https://app.pinecone.io/
   - Stripe: https://dashboard.stripe.com/apikeys
   - SendGrid: https://sendgrid.com/

2. **Implement Email Service (4-8 hours):**
   - Create EmailService with SendGrid
   - Add email templates (password reset, invites, etc.)
   - Test all email flows

3. **Setup File Storage (2-4 hours):**
   - Choose S3 or R2
   - Implement StorageService
   - Wire up GDPR exports and audit logs

4. **Currency API (1-2 hours):**
   - Update CurrencyService to use Stripe FX rates
   - Test multi-currency pricing

5. **Configure Environment Variables:**
   - Copy all keys to production `.env`
   - Verify webhook endpoints
   - Set up billing alerts

6. **Test End-to-End:**
   - Payment flows
   - Email notifications
   - GDPR data exports
   - Multi-currency checkout

---

## 💡 Cost Optimization Tips

1. **Use Stripe FX Rates** - Free instead of paid currency API
2. **Cache AI Responses** - Already implemented, saves 40% on API costs
3. **Batch Operations** - Generate questions in bulk
4. **Rate Limiting** - Prevent abuse (already implemented)
5. **CloudFlare R2 over S3** - Cheaper storage with free egress
6. **SendGrid Free Tier** - 100 emails/day is enough for early stage

**Estimated Savings:** $50-100/month with these optimizations

---

## 🚀 Final Recommendation

**Phase 1 (Launch Ready):**
1. ✅ OpenAI API key - **REQUIRED**
2. ✅ Anthropic API key - **REQUIRED**
3. ✅ Pinecone setup - **REQUIRED**
4. ✅ Stripe configuration - **REQUIRED**
5. ❌ **Email Service implementation - REQUIRED (TODO)**

**Phase 2 (Production Hardening):**
6. File storage (S3/R2) for GDPR and audit logs
7. Sentry error tracking
8. Currency API (Stripe FX rates)

**Phase 3 (Scale & Optimize):**
9. CDN (CloudFlare)
10. Cohere for embedding optimization
11. PostHog analytics
12. Regional payment providers

**Priority:** Implement Email Service before launch. Everything else is either done or optional.

---

## 📞 Support and Resources

**Official Documentation:**
- OpenAI: https://platform.openai.com/docs
- Anthropic: https://docs.anthropic.com/
- Pinecone: https://docs.pinecone.io/
- Stripe: https://stripe.com/docs
- SendGrid: https://docs.sendgrid.com/

**Community Support:**
- OpenAI Community: https://community.openai.com/
- Stripe Discord: https://discord.gg/stripe
- NextJS Discord: https://nextjs.org/discord

**Answly Implementation:**
- Backend: `dev/backend/src/`
- Frontend: `dev/frontend/src/`
- Documentation: `notes/`

---

**Document Version:** 2.0  
**Last Updated:** November 10, 2025  
**Status:** All APIs documented, Email service implementation pending
