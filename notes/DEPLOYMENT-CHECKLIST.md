# Answly - Render Deployment Checklist

**Time Required:** 45-60 minutes  
**Cost:** $24/month ($7 PostgreSQL + $10 Redis + $7 Web Service)

---

## ✅ Pre-Deployment Checklist

- [x] Backend code fixed for deployment (optional modules disabled)
- [x] build.sh script created
- [x] render.yaml configuration created
- [x] Environment variable template created
- [ ] Render account created
- [ ] API keys ready (OpenAI, Stripe, etc.)
- [ ] Vercel dashboard access

---

## 📋 Step 1: Commit Changes to Git (5 minutes)

The deployment files are ready. Let's commit them:

```bash
cd C:\Users\Plange\Downloads\Projects\answly

# Add new files
git add build.sh render.yaml
git add QUICK-START-DEPLOYMENT.md RENDER-DEPLOYMENT-GUIDE.md
git add AUTHENTICATION-SETUP-GUIDE.md MISSING-PAGES-SUMMARY.md
git add PROJECT-STATUS-SUMMARY.md FULL-PLATFORM-LAUNCH-PLAN.md
git add .env.production.example DEPLOYMENT-CHECKLIST.md
git add dev/backend/src/app.module.ts
git add dev/backend/.env.example

# Commit
git commit -m "chore: prepare backend for Render deployment

- Add Render deployment configuration (build.sh, render.yaml)
- Fix app.module.ts to handle optional modules gracefully
- Add deployment guides and checklists
- Disable optional features by default (AI, billing, enterprise)
- Ready for production deployment

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# Push to GitHub
git push origin main
```

---

## 📋 Step 2: Create Render Account (2 minutes)

1. Go to https://render.com
2. Click "Get Started" or "Sign Up"
3. Sign up with:
   - GitHub (recommended - auto-connects repos)
   - Email + Password
4. Verify your email
5. Complete profile setup

**✅ Done when:** You're logged into Render dashboard

---

## 📋 Step 3: Deploy PostgreSQL Database (5 minutes)

1. **Click "New +"** → **"PostgreSQL"**

2. **Configure Database:**
   - **Name:** `answly-db`
   - **Database:** `answly_production`
   - **User:** `answly`
   - **Region:** Oregon (or closest to your users)
   - **PostgreSQL Version:** 16 (latest)
   - **Plan:** **Starter** ($7/month)
     - Alternative: Free (90-day limit, not recommended)

3. **Click "Create Database"**

4. **Wait for Provisioning** (~2-3 minutes)
   - Status will change from "Creating" to "Available"

5. **Copy Connection URLs:**
   - Click on database name
   - Find "Internal Database URL"
   - **Copy this URL** - format:
     ```
     postgresql://answly:PASSWORD@dpg-XXXXX.oregon-postgres.render.com/answly_production
     ```
   - Save it securely (you'll need it for Step 5)

**✅ Done when:** Database shows "Available" and URL is copied

---

## 📋 Step 4: Deploy Redis Instance (5 minutes)

1. **Click "New +"** → **"Redis"**

2. **Configure Redis:**
   - **Name:** `answly-redis`
   - **Region:** **Same as database** (Oregon)
   - **Plan:** **Starter** ($10/month)
     - Alternative: Free (25MB, limited)
   - **Max Memory Policy:** `allkeys-lru`
   - **Redis Version:** 7 (latest)

3. **Click "Create Redis"**

4. **Wait for Provisioning** (~1-2 minutes)

5. **Copy Connection URL:**
   - Click on Redis instance name
   - Find "Internal Redis URL"
   - **Copy this URL** - format:
     ```
     redis://red-XXXXX:6379
     ```
   - Save it securely

**✅ Done when:** Redis shows "Available" and URL is copied

---

## 📋 Step 5: Deploy Backend Web Service (20 minutes)

### 5.1 Create Web Service

1. **Click "New +"** → **"Web Service"**

2. **Connect Repository:**
   - Click "Connect GitHub" (if not already connected)
   - Authorize Render to access your repositories
   - Select repository: **answly**

3. **Configure Service:**
   - **Name:** `answly-backend`
   - **Region:** **Same as database and Redis** (Oregon)
   - **Branch:** `main`
   - **Root Directory:** `dev/backend`
   - **Runtime:** Node
   - **Build Command:** `chmod +x build.sh && ./build.sh`
   - **Start Command:** `npm run start:prod`
   - **Plan:** **Starter** ($7/month)
     - Alternative: Free (limited, sleeps after inactivity)

4. **Click "Advanced"** to add environment variables

---

### 5.2 Add Environment Variables

Click "Add Environment Variable" for each of these:

#### Core Configuration
```bash
NODE_ENV=production
PORT=10000
```

#### Database & Redis (paste from Steps 3 & 4)
```bash
DATABASE_URL=<paste PostgreSQL Internal URL>
REDIS_URL=<paste Redis Internal URL>
```

#### JWT Secrets (generate new random strings)

**Windows PowerShell:**
```powershell
# Run these two commands separately to generate secrets
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))
[Convert]::ToBase64String((1..48|%{Get-Random -Max 256}))
```

**Mac/Linux:**
```bash
openssl rand -base64 48
openssl rand -base64 48
```

Add the generated secrets:
```bash
JWT_SECRET=<paste first generated secret>
JWT_REFRESH_SECRET=<paste second generated secret>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
```

#### CORS (your Vercel frontend URL)
```bash
CORS_ORIGIN=https://answly.vercel.app
```

#### Rate Limiting
```bash
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

#### Feature Flags
```bash
FEATURE_ADMIN=true
FEATURE_AI=false
FEATURE_BILLING=false
FEATURE_ENTERPRISE=false
FEATURE_COMPLIANCE=false
```

#### Optional: AI Provider Keys (skip for now if not using)
```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
COHERE_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX=
```

#### Optional: Stripe (skip for now if not using)
```bash
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_SCALE=
```

---

### 5.3 Deploy

1. **Review configuration** - make sure all required variables are set
2. **Click "Create Web Service"**
3. **Wait for deployment** (~5-10 minutes)
   - Watch the build logs in real-time
   - Look for errors (should see "Build successful" at the end)
4. **Verify deployment:**
   - Status should show "Live"
   - Service URL: `https://answly-backend.onrender.com`

**✅ Done when:** 
- Service shows "Live"
- Build logs show "Build successful"
- No errors in logs

---

## 📋 Step 6: Update Vercel Frontend (5 minutes)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Open Project:**
   - Find your `answly-frontend` project
   - Click on it

3. **Go to Settings:**
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

4. **Update API URL:**
   - Find `NEXT_PUBLIC_API_URL` (or add if missing)
   - **Value:** `https://answly-backend.onrender.com`
   - **Environment:** Production, Preview, Development (check all)
   - Click "Save"

5. **Redeploy Frontend:**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait ~2-3 minutes

**✅ Done when:** 
- Environment variable updated
- Redeployment shows "Ready"

---

## 📋 Step 7: Test Deployment (10 minutes)

### 7.1 Test API Connection

Open your browser and visit:
```
https://answly-backend.onrender.com/
```

**Expected:** You should see a response (e.g., "Hello World" or API info)

---

### 7.2 Test Swagger Docs

Visit:
```
https://answly-backend.onrender.com/api
```

**Expected:** Swagger API documentation page loads

---

### 7.3 Test User Registration

1. Go to your frontend: `https://answly.vercel.app`
2. Click "Sign Up" or go to `/register`
3. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123!
4. Click "Create Account"

**Expected:**
- ✅ Redirected to dashboard
- ✅ User is logged in
- ✅ No CORS errors in browser console

**If it fails:**
- Check Render logs: Dashboard → answly-backend → Logs
- Check browser console for errors
- Verify `CORS_ORIGIN` matches Vercel URL exactly

---

### 7.4 Test User Login

1. Logout if logged in
2. Go to `/login`
3. Enter:
   - Email: test@example.com
   - Password: TestPass123!
4. Click "Login"

**Expected:**
- ✅ Redirected to dashboard
- ✅ User data loaded

---

### 7.5 Test Protected Routes

1. While logged in, visit:
   - `/dashboard`
   - `/settings`
   - `/tutor`

**Expected:** All pages load without errors

2. Open DevTools → Application → Local Storage
3. Delete `auth-store` item
4. Try accessing `/dashboard`

**Expected:** Redirected to `/login`

---

## 📋 Step 8: Configure Stripe Webhooks (Optional - 5 minutes)

**Skip this if not using payments yet**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://answly-backend.onrender.com/api/webhooks/stripe`
4. **Events to send:**
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. **Copy Signing Secret** (starts with `whsec_`)
7. **Update Render:**
   - Go to Render → answly-backend → Environment
   - Update `STRIPE_WEBHOOK_SECRET`
   - Click "Save" (will redeploy)

**✅ Done when:** Webhook shows "Enabled" in Stripe dashboard

---

## 📋 Step 9: Monitor & Verify (5 minutes)

### 9.1 Check Logs

1. Go to Render → answly-backend → Logs
2. Look for:
   - ✅ Server started successfully
   - ✅ Database connected
   - ✅ No errors
3. Watch for incoming requests as you test

### 9.2 Check Metrics

1. Go to Render → answly-backend → Metrics
2. Verify:
   - CPU usage is normal (<50%)
   - Memory usage is acceptable
   - Response times are fast (<1s)

### 9.3 Create Test Users

Create 2-3 test accounts with different emails to verify everything works:

```
User 1:
- Email: john@example.com
- Password: Test123!

User 2:
- Email: jane@example.com
- Password: Test123!
```

**✅ Done when:** 
- Multiple test users created successfully
- All can login and access features
- Logs show no errors

---

## 🎉 Deployment Complete Checklist

- [ ] Backend deployed on Render
- [ ] Database created and connected
- [ ] Redis created and connected
- [ ] Frontend updated with backend URL
- [ ] User registration works
- [ ] User login works
- [ ] Protected routes work
- [ ] No CORS errors
- [ ] No errors in logs
- [ ] Multiple test users created

---

## 🚨 Troubleshooting

### Issue: Build Failed on Render

**Check:**
1. Build logs for specific error
2. Verify `build.sh` has correct permissions
3. Check all dependencies are in `package.json`

**Fix:**
```bash
# Make build.sh executable locally
git update-index --chmod=+x dev/backend/build.sh
git commit -m "fix: make build.sh executable"
git push
```

---

### Issue: CORS Error

**Symptom:** "blocked by CORS policy" in browser console

**Fix:**
1. Go to Render → answly-backend → Environment
2. Verify `CORS_ORIGIN` is **exactly**: `https://answly.vercel.app`
3. No trailing slash!
4. Save changes (will redeploy)

---

### Issue: Database Connection Failed

**Symptom:** "Can't reach database" in logs

**Fix:**
1. Verify `DATABASE_URL` is correct
2. Check database is in same region as backend
3. Test connection: Render → answly-db → Connect → Copy Internal URL

---

### Issue: 401 Unauthorized

**Symptom:** Can't access protected routes

**Fix:**
1. Check JWT tokens are being sent in Authorization header
2. Verify `JWT_SECRET` is set correctly
3. Clear browser cache and localStorage
4. Try logging in again

---

## 📊 Monthly Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Starter | $7 |
| Redis | Starter | $10 |
| Web Service | Starter | $7 |
| **Total** | | **$24/month** |

---

## 🎯 Next Steps

After deployment is complete and tested:

1. ✅ **Invite Beta Users** (5-10 people)
   - Share signup link: `https://answly.vercel.app/register`
   - Ask for feedback

2. ✅ **Monitor Performance** (first 48 hours)
   - Check Render metrics daily
   - Watch for errors in logs
   - Respond to user feedback

3. 🚀 **Choose First Feature to Build**
   - See `MISSING-PAGES-SUMMARY.md`
   - Recommended: Flashcards (most requested)

4. 📈 **Plan Marketing Launch**
   - Social media announcement
   - Product Hunt launch
   - SEO optimization

---

**Status:** 🎉 **Ready for Production!**

**Backend URL:** https://answly-backend.onrender.com  
**Frontend URL:** https://answly.vercel.app  
**API Docs:** https://answly-backend.onrender.com/api

---

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Review troubleshooting section above
3. Consult `RENDER-DEPLOYMENT-GUIDE.md` for detailed steps

**Deployment Time:** 45-60 minutes  
**Result:** Fully functional production platform! 🚀
