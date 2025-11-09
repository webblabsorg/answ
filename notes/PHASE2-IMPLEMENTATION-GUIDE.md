# Phase 2 Implementation Guide
## AI Integration - Complete Roadmap

**Date:** November 9, 2025  
**Current Status:** Session 7 Complete ✅  
**Remaining:** Sessions 8, 9, 10  

---

## Phase 2 Overview

**Duration:** 8 weeks (4 sessions)  
**Goal:** AI-powered question generation, tutoring, and personalization  

**Success Criteria:**
- 1000+ AI-generated questions per exam
- >90% approval rate from human reviewers
- AI tutor responds in <5s
- IRT calibration working with 30+ attempts per question
- Question generation cost <$0.10/question

---

## Session Status

| Session | Status | Progress |
|---------|--------|----------|
| **Session 7: AI Infrastructure** | ✅ Complete | 100% |
| **Session 8: Question Generation** | 📝 Ready to Start | 0% |
| **Session 9: AI Tutor & RAG** | ⏳ Pending | 0% |
| **Session 10: IRT & Personalization** | ⏳ Pending | 0% |

---

## ✅ Session 7: AI Infrastructure (COMPLETE)

**What Was Built:**
- ✅ AI Provider integrations (OpenAI, Anthropic, Cohere)
- ✅ AI Orchestrator with intelligent fallback
- ✅ Cost tracking & analytics
- ✅ Prompt template system
- ✅ Vector store (Pinecone)
- ✅ Database schema for AI features

**Details:** See [PHASE2-SESSION7-COMPLETE.md](./PHASE2-SESSION7-COMPLETE.md)

---

## 📝 Session 8: Question Generation Pipeline

**Duration:** 2 weeks  
**Story Points:** 61 total (Backend: 28, Frontend: 18, ML: 15)

### Tasks

#### Backend (28 pts)

**1. Question Generator Service (12 pts)**
```typescript
// backend/src/ai/services/question-generator.service.ts

@Injectable()
export class QuestionGeneratorService {
  async generateBatch(dto: GenerateBatchDto): Promise<GenerationJob> {
    // Create job in database
    const job = await this.prisma.generationJob.create({
      data: {
        exam_id: dto.examId,
        topic: dto.topic,
        difficulty: dto.difficulty,
        count: dto.count,
        status: 'PENDING',
        created_by_id: dto.userId,
      },
    });

    // Queue for async processing
    await this.queue.add('generate-questions', {
      jobId: job.id,
      ...dto,
    });

    return job;
  }

  @Process('generate-questions')
  async processGeneration(job: Job): Promise<void> {
    const { jobId, examId, topic, difficulty, count } = job.data;

    // Update status
    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'IN_PROGRESS', started_at: new Date() },
    });

    // Get prompt template and examples
    const template = await this.promptTemplate.getTemplate('gre_text_completion');
    const examples = await this.promptTemplate.getFewShotExamples(examId, topic, 5);

    const generated = [];
    const failed = [];

    // Generate in batches of 10
    for (let i = 0; i < count; i += 10) {
      const batchSize = Math.min(10, count - i);
      
      const promises = Array.from({ length: batchSize }, async () => {
        try {
          // Render prompt
          const prompt = await this.promptTemplate.render(template, {
            difficulty,
            topic,
            examples: JSON.stringify(examples),
          });

          // Call AI
          const response = await this.aiOrchestrator.generate({
            type: 'question_generation',
            prompt,
            temperature: 0.8,
            responseFormat: { type: 'json_object' },
            priority: 'quality',
          });

          // Parse response
          const question = JSON.parse(response.content);

          // Validate
          const validation = await this.validator.validate(question);

          if (validation.isValid && validation.score > 0.7) {
            generated.push({
              ...question,
              quality_score: validation.score,
              ai_provider: response.provider,
              ai_model: response.model,
              generation_cost: response.cost,
            });
          } else {
            failed.push({ question, errors: validation.errors });
          }
        } catch (error) {
          failed.push({ error: error.message });
        }
      });

      await Promise.all(promises);

      // Update progress
      const progress = (i + batchSize) / count;
      await this.prisma.generationJob.update({
        where: { id: jobId },
        data: { progress, generated_count: generated.length, failed_count: failed.length },
      });
    }

    // Save to review queue
    await this.saveToReviewQueue(generated, jobId);

    // Mark complete
    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        generated_count: generated.length,
        failed_count: failed.length,
        total_cost: generated.reduce((sum, q) => sum + q.generation_cost, 0),
      },
    });
  }

  private async saveToReviewQueue(questions: any[], jobId: string) {
    await this.prisma.generatedQuestion.createMany({
      data: questions.map(q => ({
        generation_job_id: jobId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty_level: q.difficulty_level,
        quality_score: q.quality_score,
        validation_errors: q.validation_errors || [],
        validation_warnings: q.validation_warnings || [],
        ai_provider: q.ai_provider,
        ai_model: q.ai_model,
        generation_cost: q.generation_cost,
        prompt_template_id: q.prompt_template_id,
      })),
    });
  }
}
```

**2. Content Validator (8 pts)**
```typescript
// backend/src/ai/services/content-validator.service.ts

@Injectable()
export class ContentValidatorService {
  async validate(question: GeneratedQuestion): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.validateFormat(question),
      this.checkPlausibility(question),
      this.detectDuplicates(question),
      this.estimateDifficulty(question),
      this.validateDistractors(question),
    ]);

    const score = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const errors = checks.flatMap(c => c.errors);
    const warnings = checks.flatMap(c => c.warnings);

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
    };
  }

  private async validateFormat(q: GeneratedQuestion): Promise<ValidationCheck> {
    const errors = [];
    
    if (!q.question_text || q.question_text.length < 10) {
      errors.push('Question text too short');
    }
    
    if (q.question_type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push('Multiple choice needs at least 2 options');
      }
      
      const correctCount = q.options.filter(o => o.correct).length;
      if (correctCount === 0) {
        errors.push('No correct answer marked');
      } else if (correctCount > 1) {
        errors.push('Multiple correct answers (use MULTIPLE_SELECT type)');
      }
    }

    return {
      score: errors.length === 0 ? 1 : 0,
      errors,
      warnings: [],
    };
  }

  private async detectDuplicates(q: GeneratedQuestion): Promise<ValidationCheck> {
    // Generate embedding
    const embedding = await this.vectorStore.embed(q.question_text);

    // Search for similar
    const similar = await this.vectorStore.search(q.question_text, {
      topK: 5,
      filter: { exam_id: q.exam_id },
    });

    const duplicates = similar.filter(s => s.score > 0.85);
    const nearDuplicates = similar.filter(s => s.score > 0.75 && s.score <= 0.85);

    return {
      score: duplicates.length === 0 ? 1 : 0,
      errors: duplicates.map(d => `Too similar to Q${d.id} (${d.score.toFixed(2)})`),
      warnings: nearDuplicates.map(d => `Similar to Q${d.id} (${d.score.toFixed(2)})`),
    };
  }

  private async checkPlausibility(q: GeneratedQuestion): Promise<ValidationCheck> {
    // Use AI to check if question makes sense
    const prompt = `
Review this test question for plausibility and correctness:

${JSON.stringify(q, null, 2)}

Does this question:
1. Have a clear, unambiguous answer?
2. Make logical sense?
3. Have plausible distractors (if multiple choice)?
4. Match the stated difficulty level?

Respond with JSON: { "plausible": true/false, "issues": [] }
`;

    try {
      const response = await this.aiOrchestrator.generate({
        type: 'validation',
        prompt,
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
        priority: 'cost', // Use cheaper model
      });

      const result = JSON.parse(response.content);
      
      return {
        score: result.plausible ? 1 : 0,
        errors: result.plausible ? [] : result.issues,
        warnings: [],
      };
    } catch (error) {
      return { score: 0.5, errors: [], warnings: ['Could not verify plausibility'] };
    }
  }
}
```

**3. Generation Job Queue (5 pts)**
```bash
# Install BullMQ and Redis
npm install bullmq ioredis
```

```typescript
// backend/src/ai/queue/generation-queue.module.ts

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'question-generation',
    }),
  ],
})
export class GenerationQueueModule {}
```

**4. API Endpoints (3 pts)**
```typescript
// backend/src/ai/controllers/generation.controller.ts

@Controller('admin/generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class GenerationController {
  @Post('start')
  async startGeneration(@Body() dto: GenerateBatchDto, @CurrentUser() user: User) {
    return this.generatorService.generateBatch(dto);
  }

  @Get('jobs')
  async listJobs(@Query() query: ListJobsQuery) {
    return this.prisma.generationJob.findMany({
      where: { status: query.status },
      include: { exam: true, created_by: true },
      orderBy: { created_at: 'desc' },
      take: query.limit || 50,
    });
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.prisma.generationJob.findUnique({
      where: { id },
      include: {
        generated_questions: {
          where: { status: 'PENDING' },
          orderBy: { quality_score: 'desc' },
        },
      },
    });
  }
}
```

#### Frontend (18 pts)

**1. Review Queue UI (10 pts)**
```typescript
// frontend/src/app/admin/review-queue/page.tsx

export default function ReviewQueuePage() {
  const { data: questions, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => apiClient.get('/admin/generation/review-queue'),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <div className="flex gap-2">
          <Button onClick={() => setBulkMode(!bulkMode)}>
            Bulk Review
          </Button>
          <select onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="high-quality">High Quality (>0.8)</option>
            <option value="needs-review">Needs Review (<0.7)</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {questions?.map(question => (
          <QuestionCard
            key={question.id}
            question={question}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestRevision={handleRequestRevision}
          />
        ))}
      </div>
    </div>
  );
}
```

**2. Question Card Component (5 pts)**
```typescript
// frontend/src/app/admin/review-queue/components/QuestionCard.tsx

export function QuestionCard({ question, onApprove, onReject }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <Badge>{question.topic}</Badge>
            <Badge variant="outline">Difficulty: {question.difficulty_level}</Badge>
          </div>
          <QualityScore score={question.quality_score} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Question:</h3>
            <p>{question.question_text}</p>
          </div>

          {question.question_type === 'MULTIPLE_CHOICE' && (
            <div>
              <h4 className="font-semibold">Options:</h4>
              <ul>
                {question.options.map(opt => (
                  <li key={opt.id} className={opt.correct ? 'text-green-600 font-bold' : ''}>
                    {opt.id}. {opt.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-semibold">Explanation:</h4>
            <p>{question.explanation}</p>
          </div>

          {question.validation_warnings.length > 0 && (
            <Alert>
              <AlertTitle>Warnings</AlertTitle>
              <ul>
                {question.validation_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Edit
          </Button>
          <Button variant="outline" size="sm">
            Regenerate
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => onReject(question.id)}>
            Reject
          </Button>
          <Button variant="secondary" onClick={() => onRequestRevision(question.id)}>
            Request Revision
          </Button>
          <Button onClick={() => onApprove(question.id)}>
            Approve & Publish
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

**3. Quality Metrics Dashboard (3 pts)**
```typescript
// frontend/src/app/admin/review-queue/components/QualityMetrics.tsx

export function QualityMetrics() {
  const { data } = useQuery({
    queryKey: ['generation-metrics'],
    queryFn: () => apiClient.get('/admin/generation/metrics'),
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Approval Rate"
        value={`${(data?.approvalRate * 100).toFixed(1)}%`}
        target=">90%"
        status={data?.approvalRate > 0.9 ? 'good' : 'warning'}
      />
      <MetricCard
        title="Avg Quality Score"
        value={data?.avgQualityScore.toFixed(2)}
        target=">0.80"
      />
      <MetricCard
        title="Generation Cost"
        value={`$${data?.avgCostPerQuestion.toFixed(3)}`}
        target="<$0.10"
      />
      <MetricCard
        title="Pending Review"
        value={data?.pendingCount}
      />
    </div>
  );
}
```

#### ML/AI (15 pts)

**1. Difficulty Estimation (8 pts)**
```typescript
// backend/src/ai/services/difficulty-estimator.service.ts

@Injectable()
export class DifficultyEstimatorService {
  async estimate(question: GeneratedQuestion): Promise<number> {
    // Factors to consider:
    // 1. Question length
    // 2. Vocabulary complexity
    // 3. Number of reasoning steps
    // 4. Distractor quality

    const factors = {
      length: this.analyzeLength(question.question_text),
      vocabulary: await this.analyzeVocabulary(question.question_text),
      complexity: await this.analyzeComplexity(question),
      distractors: this.analyzeDistractors(question.options),
    };

    // Weighted average
    const difficulty = 
      factors.length * 0.1 +
      factors.vocabulary * 0.4 +
      factors.complexity * 0.3 +
      factors.distractors * 0.2;

    return Math.round(Math.max(1, Math.min(5, difficulty)));
  }

  private analyzeLength(text: string): number {
    const words = text.split(/\s+/).length;
    // 1-5 scale based on word count
    if (words < 20) return 1;
    if (words < 30) return 2;
    if (words < 40) return 3;
    if (words < 50) return 4;
    return 5;
  }

  private async analyzeVocabulary(text: string): Promise<number> {
    // Use AI to assess vocabulary level
    const prompt = `
Rate the vocabulary difficulty of this text on a scale of 1-5:
1 = Elementary
2 = Middle School
3 = High School
4 = College
5 = Graduate/Advanced

Text: "${text}"

Respond with just the number.
`;

    const response = await this.aiOrchestrator.generate({
      type: 'difficulty_estimation',
      prompt,
      temperature: 0.1,
      maxTokens: 10,
      priority: 'cost',
    });

    return parseInt(response.content.trim());
  }
}
```

**2. Distractor Quality Checker (5 pts)**
```typescript
private analyzeDistractors(options: any[]): number {
  if (!options || options.length < 2) return 1;

  // Check if distractors are:
  // 1. Plausible (not obviously wrong)
  // 2. Distinct from each other
  // 3. Related to the topic

  let quality = 3; // Start at average

  const correct = options.find(o => o.correct);
  const distractors = options.filter(o => !o.correct);

  // Check distinctness
  const distinctness = this.calculateDistinctness(distractors);
  if (distinctness < 0.5) quality -= 1; // Too similar
  if (distinctness > 0.9) quality += 1; // Well-differentiated

  return Math.max(1, Math.min(5, quality));
}

private calculateDistinctness(distractors: any[]): number {
  // Calculate pairwise similarity
  // Use word overlap or embeddings
  return 0.75; // Simplified
}
```

**3. Few-Shot Example Selection (2 pts)**
```typescript
async selectBestExamples(examId: string, topic: string, targetDifficulty: number, count = 5) {
  // Get candidate questions
  const candidates = await this.prisma.question.findMany({
    where: {
      exam_id: examId,
      topic,
      difficulty_level: {
        gte: targetDifficulty - 1,
        lte: targetDifficulty + 1,
      },
      quality_score: { gte: 0.8 },
    },
    take: count * 3,
  });

  // Rank by:
  // 1. Closeness to target difficulty
  // 2. Quality score
  // 3. Diversity (not too similar to each other)

  return candidates
    .sort((a, b) => {
      const diffA = Math.abs(a.difficulty_level - targetDifficulty);
      const diffB = Math.abs(b.difficulty_level - targetDifficulty);
      return diffA - diffB || b.quality_score - a.quality_score;
    })
    .slice(0, count);
}
```

### Checkpoint 8 Criteria

Before proceeding to Session 9:
- [ ] Can generate 100 questions in <10 minutes
- [ ] Validation catches malformed questions (test with bad data)
- [ ] Duplicate detection prevents similar questions (>85% similarity)
- [ ] Generation jobs tracked in database
- [ ] Review queue populated automatically
- [ ] Cost per question <$0.15
- [ ] Approval rate >70% (will improve to >90% with tuning)

---

## ⏳ Session 9: AI Tutor & Explanations

**Duration:** 2 weeks  
**Story Points:** 59 total (Backend: 25, Frontend: 22, ML: 12)

### Overview

Build an AI-powered tutor that:
- Answers student questions about exam content
- Provides personalized explanations
- Uses RAG (Retrieval Augmented Generation) for accurate responses
- Maintains conversation context
- Generates step-by-step explanations

### Key Components

**1. AI Tutor Service with RAG (10 pts)**
```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

@Injectable()
export class AITutorService {
  private chain: RetrievalQAChain;

  async ask(userId: string, question: string, context?: Context) {
    // Get user profile for personalization
    const userProfile = await this.getUserProfile(userId);

    // Build personalized prompt
    const prompt = this.buildPrompt(userProfile, question, context);

    // Query chain (retrieves + generates)
    const response = await this.chain.call({ query: prompt });

    // Track interaction
    await this.logInteraction(userId, question, response.text);

    return {
      answer: response.text,
      sources: response.sourceDocuments,
      followUpPrompts: await this.generateFollowUps(question, response.text),
    };
  }
}
```

**2. Explanation Generator (8 pts)**
- Generate step-by-step explanations
- Three difficulty levels (simplified, standard, advanced)
- Visual aids suggestions

**3. Chat Interface (10 pts)**
- Real-time messaging
- Conversation history
- Source citations
- Follow-up suggestions

**4. Context Retrieval (6 pts)**
- Index all questions and explanations
- Topic-based filtering
- User history integration

### Checkpoint 9 Criteria

- [ ] AI tutor responds to queries in <5s
- [ ] Conversations maintain context across messages
- [ ] RAG retrieves relevant content (test with specific questions)
- [ ] Explanations generated for 100 test questions
- [ ] Rate limiting prevents abuse
- [ ] User satisfaction >4/5 (survey)

---

## ⏳ Session 10: IRT & Personalization

**Duration:** 2 weeks  
**Story Points:** 62 total (Backend: 30, ML: 20, Frontend: 12)

### Overview

Implement:
- **IRT (Item Response Theory)** for question difficulty calibration
- **Adaptive question selection** based on user ability
- **Personalized recommendations**
- **User ability estimation** (theta parameter)

### Key Components

**1. IRT Implementation (12 pts)**
```typescript
@Injectable()
export class IRTService {
  /**
   * 3-Parameter Logistic Model
   * P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
   */
  
  async calibrateQuestion(questionId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { question_id: questionId },
      include: { user: { include: { irtProfile: true } } },
    });

    if (attempts.length < 30) {
      throw new Error('Need at least 30 attempts for calibration');
    }

    // Maximum Likelihood Estimation
    const params = this.estimate3PL(attempts);

    // Save parameters
    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        irt_a: params.a, // Discrimination
        irt_b: params.b, // Difficulty
        irt_c: params.c, // Guessing
        calibration_sample: attempts.length,
      },
    });

    return params;
  }

  async estimateUserAbility(userId: string, examId: string): Promise<number> {
    // Calculate theta using MLE
    // Returns value between -4 and +4
  }
}
```

**2. Adaptive Question Selection (10 pts)**
```typescript
async selectAdaptiveQuestions(params: {
  userId: string;
  examId: string;
  topic: string;
  count: number;
}) {
  // Get user's current theta
  const theta = await this.irtService.getUserTheta(params.userId, params.examId);

  // Select questions where difficulty ≈ user ability
  return this.prisma.question.findMany({
    where: {
      exam_id: params.examId,
      topic: params.topic,
      irt_b: {
        gte: theta - 0.5,
        lte: theta + 0.5,
      },
    },
    orderBy: {
      irt_a: 'desc', // Prefer high discrimination
    },
    take: params.count,
  });
}
```

**3. Personalized Recommendations (8 pts)**
- Identify weak topics
- Suggest practice questions
- Learning path generation

**4. Performance Analytics (10 pts)**
- User progress tracking
- Percentile rankings
- Predicted scores

### Checkpoint 10 Criteria

- [ ] IRT parameters calculated for 500+ questions
- [ ] User ability estimates correlate with scores (r > 0.8)
- [ ] Adaptive selection shows improvement over random
- [ ] Personalized recommendations relevant (user feedback)
- [ ] Percentile rankings accurate

---

## Addenda Items

### High Priority
- [ ] **Safety Controls** - Content filtering, hallucination detection
- [ ] **Multilingual Generation** - Support for 5+ languages
- [ ] **Content Provenance** - Track AI model/version for each question

### Medium Priority
- [ ] **Evaluation Metrics** - BLEU/ROUGE for explanations
- [ ] **Search Indexing** - Auto-index approved questions to ElasticSearch
- [ ] **DIF Analysis** - Detect bias across cohorts

### Low Priority
- [ ] **Listening Comprehension UI** - Audio playback controls
- [ ] **Coding Interface** - Monaco editor integration
- [ ] **Fine-tuning Pipeline** - PEFT/LoRA adapters

---

## Testing Strategy

### Unit Tests
```typescript
describe('QuestionGeneratorService', () => {
  it('should generate valid questions', async () => {
    const job = await service.generateBatch({
      examId: 'gre',
      topic: 'verbal',
      difficulty: 3,
      count: 10,
    });

    expect(job.status).toBe('PENDING');
  });
});
```

### Integration Tests
```typescript
describe('AI Orchestrator Integration', () => {
  it('should fallback to alternate provider on failure', async () => {
    // Mock OpenAI failure
    jest.spyOn(openai, 'generate').mockRejectedValue(new Error('Rate limit'));

    const response = await orchestrator.generate(task);
    
    expect(response.provider).toBe('anthropic'); // Fallback
  });
});
```

### E2E Tests
```typescript
describe('Question Generation Flow', () => {
  it('should generate, validate, and publish questions', async () => {
    // Start generation
    const job = await request(app)
      .post('/admin/generation/start')
      .send({ examId: 'gre', topic: 'verbal', count: 5 })
      .expect(201);

    // Wait for completion
    await waitForJobCompletion(job.id);

    // Check review queue
    const questions = await request(app)
      .get('/admin/generation/review-queue')
      .expect(200);

    expect(questions.body.length).toBeGreaterThan(0);

    // Approve a question
    await request(app)
      .post(`/admin/generation/approve/${questions.body[0].id}`)
      .expect(200);

    // Verify it's published
    const published = await request(app)
      .get(`/questions/${questions.body[0].id}`)
      .expect(200);

    expect(published.body.ai_generated).toBe(true);
  });
});
```

---

## Deployment Checklist

### Infrastructure
- [ ] Redis installed for BullMQ
- [ ] Pinecone index created
- [ ] AI provider API keys configured
- [ ] Monitoring alerts set up

### Database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed prompt templates
- [ ] Index existing questions in vector store

### Security
- [ ] Rate limiting on AI endpoints
- [ ] Content moderation enabled
- [ ] API key rotation policy
- [ ] Cost alerts configured ($100/day threshold)

### Performance
- [ ] AI response caching
- [ ] Vector store pre-warmed
- [ ] Queue workers scaled (3-5 workers)

---

## Cost Projections

| Feature | Monthly Cost Estimate |
|---------|----------------------|
| Question Generation (1000 questions) | $80-100 |
| AI Tutor (1000 conversations) | $150-200 |
| Embeddings (all questions) | $20-30 |
| Vector Store (Pinecone) | $70-100 |
| **Total** | **$320-430/month** |

**Break-even:** ~100 paid users ($5/month)

---

## Support & Resources

### Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Pinecone Docs](https://docs.pinecone.io)
- [BullMQ Docs](https://docs.bullmq.io)
- [LangChain Docs](https://js.langchain.com/docs)

### Internal Docs
- [PHASE2-SESSION7-COMPLETE.md](./PHASE2-SESSION7-COMPLETE.md) - Infrastructure guide
- [AI-ORCHESTRATOR-GUIDE.md](./AI-ORCHESTRATOR-GUIDE.md) - Orchestrator usage
- [PROMPT-ENGINEERING.md](./PROMPT-ENGINEERING.md) - Prompt best practices

---

**Last Updated:** November 9, 2025  
**Next Review:** After Session 8 completion  
**Status:** Ready for Session 8 implementation
