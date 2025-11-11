# Answly - Render Deployment Guide

This guide walks you through deploying the Answly backend to Render.

---

## Prerequisites

- Render account (https://render.com)
- GitHub repository with your code
- API keys for OpenAI, Anthropic, Cohere, Pinecone, Stripe

---

## Step 1: Prepare the Backend

### 1.1 Make build.sh Executable (Git)

```bash
cd dev/backend
git add build.sh
git update-index --chmod=+x build.sh
git commit -m "Make build.sh executable"
git push
```

### 1.2 Verify Package.json Scripts

Ensure these scripts exist in `dev/backend/package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy"
  }
}
```

---

## Step 2: Create PostgreSQL Database on Render

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com

2. **Create New PostgreSQL**
   - Click "New +" → "PostgreSQL"
   - **Name:** `answly-db`
   - **Database:** `answly_production`
   - **User:** `answly`
   - **Region:** Choose closest to your users (e.g., Oregon, Frankfurt)
   - **Plan:** Starter ($7/month) or Free (limited, expires in 90 days)
   - Click "Create Database"

3. **Copy Database URL**
   - Wait for database to provision (~2 minutes)
   - Copy the **Internal Database URL** (starts with `postgresql://`)
   - Format: `postgresql://answly:PASSWORD@HOST:5432/answly_production`

---

## Step 3: Create Redis Instance on Render

1. **Create New Redis**
   - Click "New +" → "Redis"
   - **Name:** `answly-redis`
   - **Region:** Same as database
   - **Plan:** Starter ($10/month) or Free (25MB, limited)
   - **Max Memory Policy:** `allkeys-lru`
   - Click "Create Redis"

2. **Copy Redis URL**
   - Copy the **Internal Redis URL** (starts with `redis://`)

---

## Step 4: Deploy Backend to Render

### 4.1 Create Web Service

1. **New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository: `answly`

2. **Configure Service**
   - **Name:** `answly-backend`
   - **Region:** Same as database and Redis
   - **Branch:** `main`
   - **Root Directory:** `dev/backend`
   - **Runtime:** Node
   - **Build Command:** `chmod +x build.sh && ./build.sh`
   - **Start Command:** `npm run start:prod`
   - **Plan:** Starter ($7/month) or Free (limited)

3. **Add Environment Variables**

Click "Advanced" → "Add Environment Variable" and add these:

#### Required Variables (Auto-configured)
```bash
NODE_ENV=production
PORT=10000
```

#### Database & Redis (from your services)
```bash
DATABASE_URL=<Internal Database URL from Step 2>
REDIS_URL=<Internal Redis URL from Step 3>
```

#### JWT Secrets (generate strong random strings)
```bash
JWT_SECRET=<generate random 64-char string>
JWT_REFRESH_SECRET=<generate different 64-char string>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
```

**Generate secrets in terminal:**
```bash
# macOS/Linux
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))
```

#### CORS (Your Vercel Frontend URL)
```bash
CORS_ORIGIN=https://answly.vercel.app
```

#### AI Provider Keys
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
```

#### Pinecone (Vector Database)
```bash
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east1-gcp
PINECONE_INDEX=answly-vectors
```

#### Stripe (Payment Processing)
```bash
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GROWTH=price_... (from Stripe dashboard)
STRIPE_PRICE_SCALE=price_... (from Stripe dashboard)
```

#### Optional: Email (for password reset)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@answly.com
```

4. **Create Web Service**
   - Click "Create Web Service"
   - Wait for deployment (~5-10 minutes)

5. **Verify Deployment**
   - Check build logs for errors
   - Once deployed, visit your service URL: `https://answly-backend.onrender.com`
   - You should see the API response (NestJS default or Swagger docs)

---

## Step 5: Configure Frontend (Vercel)

### 5.1 Update Frontend Environment Variables

1. **Go to Vercel Dashboard**
   - Open your `answly-frontend` project
   - Go to Settings → Environment Variables

2. **Add/Update Variables**

```bash
NEXT_PUBLIC_API_URL=https://answly-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
```

3. **Redeploy Frontend**
   - Go to Deployments → Latest Deployment → "Redeploy"
   - Or push a new commit to trigger automatic deployment

### 5.2 Test Connection

Open your frontend URL (e.g., `https://answly.vercel.app`) and:
1. Open browser DevTools → Network tab
2. Try to sign up or login
3. Check API requests go to your Render backend
4. Verify no CORS errors

---

## Step 6: Run Database Migrations

### Option A: Automatic (via build.sh)

Migrations run automatically during deployment via `build.sh`:
```bash
npx prisma migrate deploy
```

### Option B: Manual (via Render Shell)

If migrations failed or need manual execution:

1. **Open Render Shell**
   - Go to your `answly-backend` service
   - Click "Shell" tab on the right sidebar

2. **Run Migrations**
```bash
npx prisma migrate deploy
```

3. **Seed Database (Optional)**
```bash
npm run prisma:seed
```

---

## Step 7: Configure Stripe Webhooks

Stripe needs to send events to your backend when payments succeed/fail.

### 7.1 Create Webhook Endpoint

1. **Go to Stripe Dashboard**
   - https://dashboard.stripe.com/webhooks

2. **Add Endpoint**
   - Click "Add endpoint"
   - **URL:** `https://answly-backend.onrender.com/api/webhooks/stripe`
   - **Events to send:**
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Click "Add endpoint"

3. **Copy Webhook Secret**
   - Click on the newly created endpoint
   - Reveal and copy the **Signing secret** (starts with `whsec_`)

4. **Update Render Environment Variable**
   - Go to Render → `answly-backend` → Environment
   - Update `STRIPE_WEBHOOK_SECRET` with the webhook secret
   - Click "Save Changes" (this will redeploy)

---

## Step 8: Test Authentication Flow

### 8.1 Test Signup

1. **Open Frontend**
   - Go to `https://answly.vercel.app`
   - Click "Sign Up"

2. **Create Account**
   - Enter name, email, password
   - Click "Create Account"

3. **Verify Success**
   - Should redirect to dashboard
   - Check Render logs for any errors:
     - Go to Render → `answly-backend` → Logs

### 8.2 Test Login

1. **Logout** (if logged in)
2. **Go to Login Page**
3. **Enter credentials** from signup
4. **Click "Login"**
5. **Verify** you're redirected to dashboard

### 8.3 Test API Endpoints

Open browser DevTools → Console and run:

```javascript
// Test health check
fetch('https://answly-backend.onrender.com/')
  .then(r => r.json())
  .then(console.log);

// Test auth endpoint (should return 401)
fetch('https://answly-backend.onrender.com/api/auth/me')
  .then(r => r.json())
  .then(console.log);
```

---

## Step 9: Monitor & Debug

### 9.1 Check Logs

**Render Logs:**
- Go to Render → `answly-backend` → Logs
- Monitor for errors, warnings, API requests

**Common Issues:**
- **CORS errors:** Check `CORS_ORIGIN` matches your Vercel URL exactly
- **Database connection errors:** Verify `DATABASE_URL` is correct
- **Missing environment variables:** Check all required vars are set

### 9.2 Database Management

**Prisma Studio (Read-only on Render):**
```bash
# Run locally with production database
DATABASE_URL="<your-render-db-url>" npx prisma studio
```

**Direct SQL Access:**
- Go to Render → `answly-db` → Connect
- Use provided connection string with `psql` or DBeaver

### 9.3 Performance Monitoring

**Render Metrics:**
- Go to Render → `answly-backend` → Metrics
- Monitor CPU, Memory, Response Times

**Sentry (Optional):**
- Integrate Sentry for error tracking
- Add `SENTRY_DSN` to environment variables

---

## Step 10: Production Checklist

Before going live, verify:

- [ ] ✅ Backend deployed and accessible
- [ ] ✅ Database migrations completed
- [ ] ✅ Redis connected
- [ ] ✅ Frontend connects to backend (no CORS errors)
- [ ] ✅ Signup flow works
- [ ] ✅ Login flow works
- [ ] ✅ JWT tokens are secure (check JWT_SECRET is strong)
- [ ] ✅ Stripe webhooks configured
- [ ] ✅ AI providers working (OpenAI, Anthropic, Cohere)
- [ ] ✅ Pinecone vector store connected
- [ ] ✅ All environment variables set
- [ ] ✅ HTTPS enabled (automatic on Render)
- [ ] ✅ Logs monitored for errors

---

## Troubleshooting

### Build Fails: "Prisma Client Not Generated"

**Fix:**
```bash
# Add to build.sh before npm run build
npx prisma generate
```

### Database Migration Fails

**Fix:**
1. Check `DATABASE_URL` is correct
2. Manually run migrations via Render Shell:
```bash
npx prisma migrate deploy
```

### Redis Connection Issues

**Fix:**
- Verify `REDIS_URL` format: `redis://HOST:PORT`
- Check Redis instance is in same region

### CORS Errors

**Fix:**
1. Update `CORS_ORIGIN` in Render to match Vercel URL exactly
2. No trailing slash: `https://answly.vercel.app` ✅, `https://answly.vercel.app/` ❌
3. Redeploy backend after changing

### Stripe Webhooks Not Firing

**Fix:**
1. Verify webhook URL: `https://answly-backend.onrender.com/api/webhooks/stripe`
2. Check `STRIPE_WEBHOOK_SECRET` is correct
3. Test with Stripe CLI:
```bash
stripe listen --forward-to https://answly-backend.onrender.com/api/webhooks/stripe
```

---

## Cost Estimate (Render)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Starter | $7 |
| Redis | Starter | $10 |
| Web Service (Backend) | Starter | $7 |
| **Total** | | **$24/month** |

**Free Tier Option:**
- Use free plans for all services (limited, 90-day expiry for DB)
- Total: $0/month (not recommended for production)

---

## Next Steps

1. ✅ Complete this deployment guide
2. ✅ Test all features with real users
3. ✅ Create the missing pages (grammar, calculators, flashcards, etc.)
4. 📈 Set up analytics (Google Analytics, Mixpanel)
5. 📧 Configure email service (SendGrid, AWS SES)
6. 🚀 Launch marketing campaign

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **NestJS Docs:** https://docs.nestjs.com
- **Stripe Webhooks:** https://stripe.com/docs/webhooks

---

**Deployment Complete!** 🎉

Your backend is now live on Render and connected to your Vercel frontend.
