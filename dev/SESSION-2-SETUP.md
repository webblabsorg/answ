# Session 2 Setup & Testing Guide

Quick guide to get Session 2 features up and running.

## Prerequisites

Make sure you completed Session 1 setup:
- Backend running on port 4000
- Frontend running on port 3000
- PostgreSQL database connected

## Step 1: Update Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Step 2: Run Database Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

When prompted, name the migration: `add_exams_and_questions`

## Step 3: Seed Sample Data

```bash
cd backend
npx prisma db seed
```

You should see:
```
🌱 Starting database seed...
✅ Created GRE exam
✅ Created GRE sections
✅ Created 6 GRE questions
✅ Created SAT exam
✅ Created SAT sections
✅ Created 3 SAT questions
✅ Created GMAT exam
✅ Created GMAT sections
✅ Created 2 GMAT questions

🎉 Seed complete!
📊 Summary:
   - Exams: 3
   - Sections: 8
   - Questions: 11
```

## Step 4: Restart Services

### Backend
```bash
cd backend
npm run start:dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## Step 5: Test the Features

### 1. Browse Exams
1. Open http://localhost:3000
2. Login/Register if needed
3. Click "Browse Exams" or go to http://localhost:3000/exams
4. You should see 3 exam cards (GRE, SAT, GMAT)

### 2. View Exam Details
1. Click on any exam card
2. You should see:
   - Exam name and description
   - Quick stats (duration, sections, questions, passing score)
   - Section breakdown
   - Practice options (placeholder)

### 3. Search Exams
1. On the catalog page, use the search box
2. Type "GRE" - should filter to show only GRE
3. Type "graduate" - should show GRE and GMAT

### 4. Test API Endpoints

**List all exams (public):**
```bash
curl http://localhost:4000/exams
```

**Get GRE details (public):**
```bash
curl http://localhost:4000/exams/code/GRE
```

**Search questions (requires auth):**
```bash
# First login to get token
TOKEN=$(curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Then search
curl "http://localhost:4000/questions/search?q=algebra" \
  -H "Authorization: Bearer $TOKEN"
```

**Get questions for an exam:**
```bash
curl "http://localhost:4000/questions?exam_id=YOUR_EXAM_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### "Exam not found" error
- Make sure seed script ran successfully
- Check database: `npx prisma studio` and look at Exam table

### "Cannot connect to API"
- Verify backend is running on port 4000
- Check NEXT_PUBLIC_API_URL in frontend/.env.local

### No exams showing in UI
- Open browser console for errors
- Check network tab - is `/exams` request succeeding?
- Verify CORS is enabled in backend

### Database errors
```bash
# Reset and reseed if needed
cd backend
npx prisma migrate reset
npx prisma db seed
```

## What's Working

✅ Exam catalog display  
✅ Exam detail pages  
✅ Search functionality  
✅ Section information  
✅ Question database (backend)  
✅ RESTful API endpoints  

## What's Not Implemented Yet

❌ Test-taking interface (Session 3)  
❌ Question preview (Session 3)  
❌ Ability to start tests (Session 3)  
❌ Progress tracking (Session 4)  
❌ Admin panel (Session 5)  

## Next Steps

Once Session 2 is working:
1. Explore the exam catalog
2. View exam details
3. Check the API documentation at http://localhost:4000/api
4. Ready to start Session 3: Test-Taking UI

## Adding More Sample Questions

To add more questions to the seed:

1. Edit `backend/prisma/seed.ts`
2. Add more questions to the arrays (greVerbalQuestions, satMathQuestions, etc.)
3. Run: `npx prisma db seed`

Example question format:
```typescript
{
  exam_id: gre.id,
  section_id: greVerbal.id,
  question_text: 'Your question text here',
  question_type: QuestionType.MULTIPLE_CHOICE,
  options: [
    { id: 'A', text: 'Option A', correct: false },
    { id: 'B', text: 'Option B', correct: true },
    // ...
  ],
  correct_answer: { answer: 'B' },
  difficulty_level: 2,
  topic: 'Your Topic',
  skills: ['skill1', 'skill2'],
  explanation: 'Why B is correct...',
  time_estimate_seconds: 60,
}
```

## Documentation

- [Session 2 Completion Report](../notes/SESSION-2-COMPLETE.md)
- [API Documentation](http://localhost:4000/api)
- [Phase 1 Guide](../notes/implementation/01-phase1-foundation.md)
