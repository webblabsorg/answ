# Session 8: Quick Start Guide

**5-Minute Setup for Question Generation Pipeline**

---

## Prerequisites

```bash
# 1. Start Redis
docker-compose up -d redis

# 2. Start Postgres
docker-compose up -d postgres

# 3. Migrate database
cd dev/backend
npx prisma migrate dev
```

## Environment Variables

```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/answly"
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Provider Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional
COHERE_API_KEY=...            # Optional

# Vector Store (optional)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=answly-questions
```

---

## Start Services

```bash
# Terminal 1: Backend
cd dev/backend
npm run start:dev

# Terminal 2: Frontend
cd dev/frontend
npm run dev
```

---

## Generate Questions (3 Ways)

### 1. Via Test Script (Recommended)
```bash
cd dev/backend
npx ts-node scripts/test-generation.ts
```

### 2. Via API
```bash
# Login
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.access_token')

# Start generation
curl -X POST http://localhost:4000/api/admin/generation/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "gre-exam-id",
    "topic": "Verbal Reasoning",
    "subtopic": "Text Completion",
    "difficulty": 4,
    "count": 20
  }'
```

### 3. Via UI
1. Open http://localhost:3000/admin/generate
2. Fill form (exam, topic, difficulty, count)
3. Click "Generate"

---

## Review Questions

1. **Open Review Queue**
   - http://localhost:3000/admin/review-queue

2. **Filter Questions**
   - All Questions
   - High Quality (≥0.8)
   - Needs Review (<0.7)

3. **Review Actions**
   - **Approve** - Publishes to question bank
   - **Reject** - Removes from queue
   - **Revise** - Flags for regeneration

4. **Bulk Review**
   - Click "Bulk Review" button
   - Select multiple questions with checkboxes
   - Approve or reject in batch

---

## API Endpoints

### Generation
```bash
POST   /admin/generation/start         # Start generation job
GET    /admin/generation/jobs          # List all jobs
GET    /admin/generation/jobs/:id      # Get job details
```

### Review Queue
```bash
GET    /admin/generation/review-queue  # List pending questions
POST   /admin/generation/review-queue/:id/approve
POST   /admin/generation/review-queue/:id/reject
POST   /admin/generation/review-queue/:id/revise
```

### Metrics
```bash
GET    /admin/generation/metrics       # Quality & cost stats
```

---

## Monitoring

### Check Queue Status
```bash
# Redis CLI
redis-cli
> KEYS bull:question-generation:*
> LLEN bull:question-generation:waiting
> LLEN bull:question-generation:active
```

### Check Database
```sql
-- Active jobs
SELECT id, status, progress, generated_count, total_cost 
FROM "GenerationJob" 
WHERE status IN ('PENDING', 'IN_PROGRESS')
ORDER BY created_at DESC;

-- Review queue
SELECT status, COUNT(*) as count, AVG(quality_score) as avg_quality
FROM "GeneratedQuestion"
GROUP BY status;
```

### Check Costs
```bash
# Get today's costs
curl http://localhost:4000/api/admin/ai/usage-stats/daily \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Build Fails
```bash
# Reinstall dependencies
cd dev/backend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Queue Not Processing
```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check backend logs
npm run start:dev
# Look for: "BullMQ connection established"
```

### Generation Fails
```bash
# Check API keys
echo $OPENAI_API_KEY

# Check database connection
npx prisma studio

# Check logs for errors
tail -f logs/error.log
```

### Low Quality Scores
- Improve prompt templates (PromptTemplateService)
- Add more few-shot examples
- Adjust difficulty level
- Use better AI model (GPT-4 vs GPT-3.5)

---

## Configuration

### Batch Size
```typescript
// question-generator.service.ts
const BATCH_SIZE = 10; // Adjust for performance
```

### Quality Threshold
```typescript
// question-generator.service.ts
const MIN_QUALITY_SCORE = 0.7; // Adjust for approval rate
```

### Cost Limits
```typescript
// ai-usage-tracking.service.ts
const DAILY_LIMIT = 100; // Dollars
```

---

## Performance Tips

1. **Parallel Processing**
   - Increase batch size (10 → 20)
   - Add more BullMQ workers

2. **Cost Optimization**
   - Use GPT-3.5 for validation
   - Cache common prompts
   - Reuse embeddings

3. **Quality Improvement**
   - Add domain-specific examples
   - Fine-tune validation rules
   - Improve prompt templates

---

## Support

- **Documentation:** `/notes/PHASE2-SESSION8-FULLY-COMPLETE.md`
- **API Docs:** http://localhost:4000/api/docs (if Swagger enabled)
- **Database Schema:** `prisma/schema.prisma`

---

**Ready to generate questions!** 🚀
