# Answly - Authentication Setup & Testing Guide

This guide helps you test the authentication flow with real users before building new features.

---

## Current Authentication Status

✅ **Backend:** Fully implemented (NestJS + JWT + Prisma)  
✅ **Frontend:** Login/Register pages exist  
⏳ **Testing:** Needs real user testing  

---

## Step 1: Start Backend Locally (Before Render Deployment)

### 1.1 Install Dependencies

```bash
cd dev/backend
npm install
```

### 1.2 Configure Environment Variables

Create `dev/backend/.env`:

```bash
# Copy from .env.example
DATABASE_URL="postgresql://answly:answly_dev_password@localhost:5432/answly_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="development_secret_change_in_production_12345"
JWT_EXPIRATION="7d"
JWT_REFRESH_SECRET="development_refresh_secret_change_in_production_67890"
JWT_REFRESH_EXPIRATION="30d"
PORT=4000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
```

### 1.3 Start Database (Docker)

```bash
# From project root
cd dev
docker-compose up -d postgres redis
```

Or install PostgreSQL and Redis locally.

### 1.4 Run Migrations

```bash
cd dev/backend
npx prisma generate
npx prisma migrate dev
```

### 1.5 Seed Database (Optional)

```bash
npm run prisma:seed
```

This creates:
- 3 exams (GRE, SAT, GMAT)
- Sample questions
- Admin user (email: `admin@answly.com`, password: `admin123`)

### 1.6 Start Backend

```bash
npm run start:dev
```

Backend should be running at: **http://localhost:4000**

Test: Open http://localhost:4000 in browser (should see "Hello World" or API response)

---

## Step 2: Start Frontend Locally

### 2.1 Install Dependencies

```bash
cd dev/frontend
npm install
```

### 2.2 Configure Environment Variables

Create `dev/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Answly
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.3 Start Frontend

```bash
npm run dev
```

Frontend should be running at: **http://localhost:3000**

---

## Step 3: Test User Registration

### 3.1 Open Registration Page

Go to: http://localhost:3000/register

### 3.2 Create Test User

Fill in the form:
- **Name:** Test User
- **Email:** test@example.com
- **Password:** TestPass123!
- **Confirm Password:** TestPass123!

Click "Create Account" or "Sign Up"

### 3.3 Verify Success

**Expected Behavior:**
- Redirected to dashboard or home page
- User should be logged in
- Check browser DevTools → Application → Local Storage
  - Should see `auth-store` with user data and token

**Check Backend Logs:**
- Should see `POST /api/auth/register` request
- Status: 201 Created

**Check Database:**
```bash
npx prisma studio
```
- Open `users` table
- Should see new user with hashed password

---

## Step 4: Test User Login

### 4.1 Logout

If logged in, logout:
- Click user menu → Logout
- Or clear localStorage: `localStorage.clear()`

### 4.2 Open Login Page

Go to: http://localhost:3000/login

### 4.3 Login with Test User

Enter credentials:
- **Email:** test@example.com
- **Password:** TestPass123!

Click "Login" or "Sign In"

### 4.4 Verify Success

**Expected Behavior:**
- Redirected to dashboard
- User data loaded in UI
- Token stored in localStorage

**Check Backend Logs:**
- Should see `POST /api/auth/login` request
- Status: 200 OK

---

## Step 5: Test Protected Routes

### 5.1 Access Protected Page

While logged in, go to:
- http://localhost:3000/dashboard
- http://localhost:3000/tutor
- http://localhost:3000/settings

**Expected:** Pages load successfully with user data

### 5.2 Test Without Token

1. Open DevTools → Application → Local Storage
2. Delete `auth-store` item
3. Try accessing: http://localhost:3000/dashboard

**Expected:** Redirected to login page

---

## Step 6: Test API Endpoints Directly

### 6.1 Test Registration API

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test User",
    "email": "apitest@example.com",
    "password": "ApiPass123!"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "name": "API Test User",
    "email": "apitest@example.com",
    "role": "TEST_TAKER",
    "tier": "STARTER"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "..."
}
```

### 6.2 Test Login API

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "ApiPass123!"
  }'
```

**Expected Response:** Same as registration (with tokens)

### 6.3 Test Protected Endpoint

```bash
# Replace <TOKEN> with access_token from login response
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected Response:**
```json
{
  "id": "...",
  "name": "API Test User",
  "email": "apitest@example.com",
  "role": "TEST_TAKER",
  "tier": "STARTER"
}
```

---

## Step 7: Test Edge Cases

### 7.1 Duplicate Email Registration

Try registering with same email twice.

**Expected:** Error message "Email already exists" or 409 Conflict

### 7.2 Invalid Login Credentials

Try logging in with wrong password.

**Expected:** Error message "Invalid credentials" or 401 Unauthorized

### 7.3 Weak Password

Try registering with password "123".

**Expected:** Validation error "Password must be at least 8 characters"

### 7.4 Invalid Email Format

Try registering with email "notanemail".

**Expected:** Validation error "Invalid email format"

---

## Step 8: Test with Vercel Frontend + Local Backend

If your frontend is already deployed on Vercel:

### 8.1 Update Frontend Environment Variable

In Vercel dashboard:
- Add environment variable: `NEXT_PUBLIC_API_URL=http://localhost:4000`
- Redeploy

### 8.2 Update Backend CORS

In `dev/backend/.env`:
```bash
CORS_ORIGIN="https://answly.vercel.app"
```

Restart backend: `npm run start:dev`

### 8.3 Test from Vercel

Go to your Vercel URL and test signup/login.

**Note:** If your backend is on localhost, you'll need to:
- Use ngrok to expose localhost: `ngrok http 4000`
- Update `NEXT_PUBLIC_API_URL` to ngrok URL

---

## Step 9: Create Real Test Users

Create multiple test users for different scenarios:

### Test User Accounts

```bash
# Student (Free Tier)
Name: John Student
Email: john.student@example.com
Password: StudentPass123!
Role: TEST_TAKER
Tier: STARTER

# Premium Student (Paid Tier)
Name: Jane Premium
Email: jane.premium@example.com
Password: PremiumPass123!
Role: TEST_TAKER
Tier: GROW

# Admin User (Already seeded)
Email: admin@answly.com
Password: admin123
Role: ADMIN
Tier: SCALE
```

### Create via Frontend

Register each user through the UI.

### Or Create via Prisma Studio

```bash
npx prisma studio
```

Add users manually in `users` table (password needs to be hashed with bcrypt).

---

## Step 10: Verify Authentication Features

### ✅ Checklist

- [ ] User can register with valid credentials
- [ ] User receives JWT tokens after registration
- [ ] User can login with correct credentials
- [ ] User cannot login with wrong credentials
- [ ] Duplicate email registration is prevented
- [ ] Password validation works (min length, strength)
- [ ] Email validation works
- [ ] JWT tokens are stored in localStorage
- [ ] Protected routes require authentication
- [ ] Logout clears tokens and redirects to home
- [ ] Token refresh works (if implemented)
- [ ] User data persists across page reloads
- [ ] CORS allows frontend to access backend
- [ ] API returns proper error messages

---

## Common Issues & Fixes

### Issue: CORS Error

**Error:** "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Fix:**
1. Check `CORS_ORIGIN` in backend `.env` matches frontend URL exactly
2. No trailing slash: `http://localhost:3000` ✅, `http://localhost:3000/` ❌
3. Restart backend after changing

### Issue: Database Connection Failed

**Error:** "Can't reach database server at `localhost:5432`"

**Fix:**
1. Start PostgreSQL: `docker-compose up -d postgres`
2. Verify `DATABASE_URL` in `.env` is correct
3. Test connection: `psql $DATABASE_URL`

### Issue: Prisma Client Not Generated

**Error:** "Cannot find module '@prisma/client'"

**Fix:**
```bash
npx prisma generate
```

### Issue: Migrations Out of Sync

**Error:** "Your database is not in sync with your Prisma schema"

**Fix:**
```bash
npx prisma migrate dev
# or
npx prisma db push
```

### Issue: 401 Unauthorized on Protected Routes

**Error:** API returns 401 when accessing protected endpoints

**Fix:**
1. Check token is in Authorization header: `Bearer <token>`
2. Verify token hasn't expired
3. Check JWT_SECRET matches between frontend and backend

---

## Next Steps After Authentication Works

Once authentication is tested and working:

1. ✅ **Deploy to Render** (follow `RENDER-DEPLOYMENT-GUIDE.md`)
2. ✅ **Update frontend to use Render backend URL**
3. ✅ **Test authentication with production URLs**
4. ✅ **Create missing pages** (see `MISSING-PAGES-SUMMARY.md`)
5. 📈 **Build new features** for menu items

---

## API Endpoints Reference

### Authentication Endpoints

```
POST   /api/auth/register      - Create new user
POST   /api/auth/login         - Login user
GET    /api/auth/me            - Get current user (protected)
POST   /api/auth/refresh       - Refresh access token
POST   /api/auth/logout        - Logout user
```

### User Endpoints

```
GET    /api/users/:id          - Get user by ID (protected)
PUT    /api/users/:id          - Update user (protected)
DELETE /api/users/:id          - Delete user (protected)
```

### Protected Routes (Require JWT)

All routes except `/api/auth/register` and `/api/auth/login` require authentication.

---

## Testing Checklist Summary

Before proceeding with feature development:

✅ **Backend Running:** http://localhost:4000  
✅ **Frontend Running:** http://localhost:3000  
✅ **Database Connected:** PostgreSQL + Redis  
✅ **User Registration Works:** Can create new users  
✅ **User Login Works:** Can authenticate existing users  
✅ **Protected Routes Work:** Dashboard, settings, etc. accessible when logged in  
✅ **API Endpoints Work:** Direct API calls return expected responses  
✅ **CORS Configured:** No CORS errors in browser console  
✅ **Tokens Persist:** User stays logged in after page reload  
✅ **Error Handling:** Proper error messages for invalid inputs  

**Status:** ✅ **Ready for feature development!**

---

Good luck with testing! 🚀
