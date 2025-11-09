# Phase 2: Quick Start Guide
## Get AI Features Running in 10 Minutes

**Last Updated:** November 9, 2025  
**Prerequisites:** Phase 1 complete, Node.js, PostgreSQL, API keys

---

## ⚡ Quick Setup

### 1. Install AI Dependencies ✅ (Already Done)

```bash
cd dev/backend
# Already installed:
# - openai, @anthropic-ai/sdk, cohere-ai
# - @pinecone-database/pinecone
# - langchain, bullmq, ioredis
```

### 2. Configure Environment

Create `.env` file:
```bash
# dev/backend/.env

# Required
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...

# Optional (for fallback)
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...

# Redis (for Session 8 job queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cost alerts
AI_DAILY_COST_THRESHOLD=100
```

### 3. Run Database Migration

```bash
cd dev/backend
npx prisma migrate dev --name add_ai_infrastructure
# ✅ Creates AI tables
```

### 4. Generate Prisma Client ✅ (Already Done)

```bash
npx prisma generate
# ✅ Updates TypeScript types
```

### 5. Start Backend

```bash
npm run start:dev
# Backend running on http://localhost:4000
```

### 6. Test AI Infrastructure

```bash
# Test provider health
curl http://localhost:4000/api/admin/ai/health

# Expected response:
# {
#   "openai": true,
#   "anthropic": true,
#   "cohere": false
# }
```

---

## 🧪 Test AI Features

### Test OpenAI Integration

```typescript
// Create test endpoint or use in controller
import { AIOrchestrator } from './ai/services/ai-orchestrator.service';

const response = await aiOrchestrator.generate({
  type: 'test',
  prompt: 'What is 2+2? Answer in one sentence.',
  priority: 'speed',
  temperature: 0.3,
});

console.log(response);
// {
//   content: '2+2 equals 4.',
//   provider: 'cohere',
//   model: 'command-r-plus',
//   tokensUsed: { prompt: 12, completion: 8, total: 20 },
//   cost: 0.00015,
//   latencyMs: 1234
// }
```

### Test Vector Search

```typescript
import { VectorStoreService } from './ai/services/vector-store.service';

// Index a question
await vectorStore.upsert('q123', 'What is the capital of France?', {
  exam_id: 'gre',
  topic: 'geography',
});

// Search for similar
const results = await vectorStore.search('French capital city', {
  topK: 3,
  filter: { exam_id: 'gre' },
});

console.log(results);
// [
//   { id: 'q123', score: 0.92, metadata: {...} },
//   ...
// ]
```

### Check Usage Stats

```typescript
import { AIUsageTrackingService } from './ai/services/ai-usage-tracking.service';

const stats = await usageTracking.getDailyStats();
console.log(`Daily cost: $${stats.totalCost.toFixed(2)}`);
console.log(`Requests: ${stats.totalRequests}`);
console.log(`Avg latency: ${stats.averageLatency}ms`);
```

---

## 📋 What's Available Now

### ✅ AI Providers
- **OpenAI** - GPT-4 Turbo, embeddings
- **Anthropic** - Claude 3.5 Sonnet
- **Cohere** - Command R+

### ✅ Core Services
- **AIOrchestrator** - Smart routing with fallback
- **AIUsageTracking** - Cost and performance monitoring
- **PromptTemplate** - Version-controlled prompts
- **VectorStore** - Semantic search (Pinecone)

### ✅ Database Models
- AIUsageLog
- PromptTemplate  
- GenerationJob
- GeneratedQuestion
- Conversation
- ConversationMessage
- IRTProfile

### ✅ Features
- Multi-provider failover
- Real-time cost tracking
- Daily cost alerts
- Prompt versioning
- Duplicate detection (vector search)

---

## 🚀 Next Steps (Session 8)

### What to Build Next

**1. Question Generator Service** (2-3 days)
```typescript
// backend/src/ai/services/question-generator.service.ts
@Injectable()
export class QuestionGeneratorService {
  async generateBatch(dto: GenerateBatchDto): Promise<GenerationJob> {
    // Create job
    // Queue for processing
    // Generate questions in batches
    // Validate each question
    // Save to review queue
  }
}
```

**2. Content Validator** (1-2 days)
```typescript
// backend/src/ai/services/content-validator.service.ts
@Injectable()
export class ContentValidatorService {
  async validate(question: GeneratedQuestion): Promise<ValidationResult> {
    // Check format
    // Check plausibility (AI)
    // Detect duplicates (vector search)
    // Estimate difficulty
    // Validate distractors
  }
}
```

**3. Review Queue UI** (2-3 days)
```typescript
// frontend/src/app/admin/review-queue/page.tsx
export default function ReviewQueuePage() {
  // List generated questions
  // Show quality scores
  // Approve/reject/revise buttons
  // Bulk actions
}
```

**4. Install Redis** (5 minutes)
```bash
# For job queue
docker run -d -p 6379:6379 redis:alpine
# or
brew install redis && redis-server
```

**Full Guide:** See [PHASE2-IMPLEMENTATION-GUIDE.md](./PHASE2-IMPLEMENTATION-GUIDE.md#-session-8-question-generation-pipeline)

---

## 📊 Monitoring Dashboard

### View Cost Stats

```bash
# Daily stats
curl http://localhost:4000/api/admin/ai/stats/daily

# Monthly stats  
curl http://localhost:4000/api/admin/ai/stats/monthly?year=2025&month=11

# Cost trends
curl http://localhost:4000/api/admin/ai/stats/costs?start=2025-11-01&end=2025-11-30
```

### Expected Daily Costs (Session 7)

| Activity | Cost |
|----------|------|
| Testing providers | $0.50-1.00 |
| Indexing 100 questions | $0.05 |
| 10 test generations | $0.80 |
| **Total** | **$1.35-1.85/day** |

---

## 🛠️ Common Commands

### Backend

```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Database

```bash
# Reset database (caution!)
npx prisma migrate reset

# View schema
npx prisma db pull

# Seed data
npx ts-node prisma/seed.ts
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🐛 Troubleshooting

### "Provider not available"

```bash
# Check API key
echo $OPENAI_API_KEY

# Test directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### "Prisma client error"

```bash
# Regenerate client
npx prisma generate

# Rebuild
npm run build
```

### "Vector store not working"

```bash
# Check Pinecone API key
echo $PINECONE_API_KEY

# Check index exists
# Login to console.pinecone.io
```

### "High costs"

```typescript
// Check usage
const stats = await usageTracking.getDailyStats();
if (stats.totalCost > 10) {
  console.warn('High usage today!');
}

// Switch to cheaper provider
await aiOrchestrator.generate({
  ...task,
  priority: 'cost', // Use Cohere
});
```

---

## 📖 Documentation

### Core Docs
- **[PHASE2-SESSION7-COMPLETE.md](./PHASE2-SESSION7-COMPLETE.md)** - What's built
- **[PHASE2-IMPLEMENTATION-GUIDE.md](./PHASE2-IMPLEMENTATION-GUIDE.md)** - Full roadmap
- **[PHASE2-SUMMARY.md](./PHASE2-SUMMARY.md)** - Executive summary

### API Docs
- Swagger UI: http://localhost:4000/api
- Endpoints: `/api/admin/ai/*`

### External
- [OpenAI Docs](https://platform.openai.com/docs)
- [Anthropic Docs](https://docs.anthropic.com)
- [Pinecone Docs](https://docs.pinecone.io)

---

## ✅ Checklist

### Session 7 (Current)
- [x] AI providers integrated
- [x] Orchestrator working
- [x] Cost tracking active
- [x] Prompt templates ready
- [x] Vector store initialized
- [x] Database migrated
- [x] Backend builds successfully

### Session 8 (Next)
- [ ] Redis installed
- [ ] Question generator service
- [ ] Content validator
- [ ] Review queue UI
- [ ] Generate first 100 questions
- [ ] Cost per question <$0.15

---

## 💡 Quick Tips

1. **Start Small** - Test with 10 questions before generating 100
2. **Monitor Costs** - Check daily stats regularly
3. **Use Fallback** - Don't rely on one provider
4. **Cache Responses** - Avoid redundant API calls
5. **Set Limits** - Configure daily cost thresholds

---

## 🎯 Success Criteria

**Session 7 Complete When:**
- ✅ All AI providers working
- ✅ Orchestrator routes requests correctly
- ✅ Cost tracking logs every request
- ✅ Vector search finds similar questions
- ✅ Backend compiles without errors

**Session 8 Complete When:**
- [ ] Can generate 100 questions in <10 minutes
- [ ] Validation catches malformed questions
- [ ] Duplicate detection works (>85% similarity)
- [ ] Review queue UI functional
- [ ] Cost per question <$0.15

---

## 📞 Need Help?

1. **Check logs**: `tail -f logs/app.log`
2. **Review documentation**: See links above
3. **Test endpoints**: Use Postman/curl
4. **Check database**: `npx prisma studio`
5. **Monitor costs**: Check usage tracking

---

**Status:** ✅ Session 7 Complete | Ready for Session 8  
**Estimated Time to Session 8 Completion:** 1-2 weeks  
**Next Milestone:** Generate and approve first 100 AI questions

---

**Pro Tip:** Keep [PHASE2-IMPLEMENTATION-GUIDE.md](./PHASE2-IMPLEMENTATION-GUIDE.md) open while implementing Session 8. It has all the code examples you need!
