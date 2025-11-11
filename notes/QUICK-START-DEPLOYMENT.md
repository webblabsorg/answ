# Answly - Quick Start: Deployment & Real User Testing

**Goal:** Get backend on Render, frontend on Vercel, and test authentication with real users before building new features.

---

## ✅ Prerequisites

- [x] Frontend already live on Vercel
- [x] GitHub repository set up
- [ ] Render account created
- [ ] Vercel account access
- [ ] API keys ready (OpenAI, Anthropic, Cohere, Stripe, Pinecone)

---

## 🚀 Quick Deployment Steps

### 1. Prepare Backend for Render (5 minutes)

```bash
cd dev/backend

# Make build script executable
git add build.sh
git update-index --chmod=+x build.sh
git commit -m "chore: make build.sh executable for Render"
git push
```

---

### 2. Deploy Database on Render (5 minutes)

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
   - Name: `answly-db`
   - Database: `answly_production`
   - Region: Oregon (or closest)
   - Plan: **Starter** ($7/month)
3. Click "Create Database"
4. **Copy Internal Database URL** (save for later)

---

### 3. Deploy Redis on Render (3 minutes)

1. Click "New +" → "Redis"
   - Name: `answly-redis`
   - Region: Same as database
   - Plan: **Starter** ($10/month)
2. Click "Create Redis"
3. **Copy Internal Redis URL** (save for later)

---

### 4. Deploy Backend on Render (10 minutes)

1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - **Name:** `answly-backend`
   - **Root Directory:** `dev/backend`
   - **Build Command:** `chmod +x build.sh && ./build.sh`
   - **Start Command:** `npm run start:prod`
   - **Plan:** Starter ($7/month)

4. **Add Environment Variables:**

```bash
# Core
NODE_ENV=production
PORT=10000

# Database (paste from Step 2)
DATABASE_URL=<Internal Database URL>

# Redis (paste from Step 3)
REDIS_URL=<Internal Redis URL>

# JWT (generate random strings)
JWT_SECRET=<generate 64-char random string>
JWT_REFRESH_SECRET=<generate different 64-char random string>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# CORS (your Vercel URL)
CORS_ORIGIN=https://answly.vercel.app

# AI Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east1-gcp
PINECONE_INDEX=answly-vectors

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_SCALE=price_...
```

5. Click "Create Web Service"
6. Wait for deployment (~5-10 minutes)
7. **Copy Service URL:** `https://answly-backend.onrender.com`

---

### 5. Update Frontend on Vercel (2 minutes)

1. Go to Vercel dashboard
2. Open `answly-frontend` project
3. Settings → Environment Variables
4. **Update/Add:**

```bash
NEXT_PUBLIC_API_URL=https://answly-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

5. Deployments → Redeploy latest

---

### 6. Configure Stripe Webhooks (5 minutes)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
   - **URL:** `https://answly-backend.onrender.com/api/webhooks/stripe`
   - **Events:**
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Copy **Signing secret** (`whsec_...`)
4. Go to Render → answly-backend → Environment
5. Update `STRIPE_WEBHOOK_SECRET` with signing secret
6. Save (auto-redeploys)

---

## ✅ Test Authentication (10 minutes)

### Test 1: User Registration

1. Open frontend: `https://answly.vercel.app`
2. Click "Sign Up" or go to `/register`
3. Create account:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123!
4. **Expected:** Redirected to dashboard, logged in

**Check Render Logs:**
- Go to Render → answly-backend → Logs
- Should see: `POST /api/auth/register` → `201 Created`

---

### Test 2: User Login

1. Logout (click user menu → Logout)
2. Go to `/login`
3. Enter credentials:
   - Email: test@example.com
   - Password: TestPass123!
4. Click "Login"
5. **Expected:** Redirected to dashboard

**Check Logs:**
- Should see: `POST /api/auth/login` → `200 OK`

---

### Test 3: Protected Routes

1. While logged in, visit:
   - `/dashboard`
   - `/tutor`
   - `/settings`
2. **Expected:** All pages load successfully

3. Open DevTools → Application → Local Storage
4. Delete `auth-store` item
5. Try accessing `/dashboard`
6. **Expected:** Redirected to `/login`

---

### Test 4: API Health Check

Open browser console and run:

```javascript
// Test API is accessible
fetch('https://answly-backend.onrender.com/')
  .then(r => r.text())
  .then(console.log);

// Should return: "Hello World" or similar
```

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Symptom:** "blocked by CORS policy" in browser console

**Fix:**
1. Go to Render → answly-backend → Environment
2. Check `CORS_ORIGIN` matches Vercel URL **exactly**
   - ✅ `https://answly.vercel.app`
   - ❌ `https://answly.vercel.app/`
3. Save and wait for redeploy

---

### Issue: Database Migration Failed

**Symptom:** "Schema not in sync" errors

**Fix:**
1. Go to Render → answly-backend → Shell
2. Run:
```bash
npx prisma migrate deploy
```

---

### Issue: 500 Internal Server Error

**Fix:**
1. Check Render logs for details
2. Common causes:
   - Missing environment variable
   - Database connection failed
   - Redis connection failed

---

## 📊 Deployment Checklist

### Backend (Render)
- [ ] PostgreSQL database created
- [ ] Redis instance created
- [ ] Backend service deployed
- [ ] All environment variables set
- [ ] Database migrations ran successfully
- [ ] Service is accessible (https://answly-backend.onrender.com)
- [ ] Logs show no errors

### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_API_URL` points to Render backend
- [ ] Redeployed after environment variable changes
- [ ] No CORS errors in browser console

### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] Protected routes require authentication
- [ ] Tokens persist in localStorage
- [ ] Logout clears tokens

### Stripe
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to backend
- [ ] Test payment flow (optional for now)

---

## 💰 Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Render PostgreSQL | Starter | $7 |
| Render Redis | Starter | $10 |
| Render Web Service | Starter | $7 |
| Vercel | Hobby/Pro | $0-20 |
| **Total** | | **$24-44/month** |

---

## 🎯 Next Steps

### Immediate (After Deployment)
1. ✅ Test authentication with 5-10 real users
2. ✅ Monitor Render logs for errors
3. ✅ Verify database is populated with users

### This Week
1. 🚀 Choose first feature to build (recommend: Flashcards)
2. 📄 Review `MISSING-PAGES-SUMMARY.md` for full list
3. 💻 Start development on highest priority pages

### This Month
1. Build Phase 1 features (Flashcards, Vocabulary, Essays)
2. Test with beta users
3. Gather feedback and iterate

---

## 📚 Documentation Reference

- **Full Deployment Guide:** `RENDER-DEPLOYMENT-GUIDE.md`
- **Authentication Testing:** `AUTHENTICATION-SETUP-GUIDE.md`
- **Missing Pages List:** `MISSING-PAGES-SUMMARY.md`
- **Full Platform Roadmap:** `FULL-PLATFORM-LAUNCH-PLAN.md`

---

## 🆘 Need Help?

### Common Commands

**Check Render logs:**
```bash
# Go to Render Dashboard → answly-backend → Logs
```

**Run migrations manually:**
```bash
# Render Shell
npx prisma migrate deploy
```

**View database:**
```bash
# Locally with production DB
DATABASE_URL="<render-db-url>" npx prisma studio
```

**Generate JWT secrets:**
```bash
# macOS/Linux
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))
```

---

## ✅ Success Criteria

**You're ready to build new features when:**

- ✅ Frontend loads from Vercel
- ✅ Backend responds from Render
- ✅ Users can sign up
- ✅ Users can log in
- ✅ Protected routes work
- ✅ No CORS errors
- ✅ Database is accessible
- ✅ Logs show clean requests

---

**Estimated Total Time:** 45-60 minutes

**Status After Completion:** ✅ Production-ready authentication + deployment

**Next:** Build missing pages (Flashcards, Grammar, Essays, etc.)

---

Good luck with deployment! 🚀
