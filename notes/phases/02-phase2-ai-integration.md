# Phase 2: AI Integration
## AI-Powered Content & Personalization

**Duration:** 8 weeks (4 sessions)  
**Team:** 4-6 engineers (+ ML engineer)  
**Goal:** Implement AI question generation, tutoring, and difficulty calibration

---

## Phase Overview

By the end of Phase 2, the platform will:
- Auto-generate high-quality exam questions using AI
- Provide AI-powered tutoring and explanations
- Calibrate question difficulty using IRT
- Personalize study recommendations
- Support human review workflow for AI content

**Success Criteria:**
- 1000+ AI-generated questions per exam
- >90% approval rate from human reviewers
- AI tutor responds in <5s
- IRT calibration working with 30+ attempts per question
- Question generation cost <$0.10/question

---

## Session 7: AI Infrastructure & Providers (Weeks 13-14)

### Objectives
- Set up AI provider integrations
- Build AI orchestration layer
- Implement prompt management

### Tasks & Story Points

**Backend (25 pts)**
- [10] Integrate OpenAI SDK
- [6] Integrate Anthropic Claude SDK
- [5] Build AI orchestrator with fallback logic
- [4] Create prompt template system

**ML/AI (20 pts)**
- [8] Design question generation prompts
- [6] Create few-shot example database
- [4] Build prompt testing framework
- [2] Set up API cost tracking

**Infrastructure (8 pts)**
- [4] Set up vector database (Pinecone)
- [3] Configure embeddings pipeline
- [1] Add AI provider monitoring

### Deliverables

**AI Orchestrator:**
```typescript
@Injectable()
export class AIOrchestrator {
  private providers = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    cohere: new CohereProvider(),
  };
  
  async generate(task: AITask): Promise<AIResponse> {
    const provider = this.selectProvider(task);
    const startTime = Date.now();
    
    try {
      const response = await provider.call(task);
      await this.trackCost(provider.name, task, response);
      return response;
    } catch (error) {
      // Fallback to next provider
      console.warn(`${provider.name} failed, trying fallback`);
      return this.executeWithFallback(task, [
        this.providers.anthropic,
        this.providers.cohere,
      ]);
    }
  }
  
  private selectProvider(task: AITask): AIProvider {
    if (task.priority === 'quality') return this.providers.openai;
    if (task.priority === 'speed') return this.providers.cohere;
    return this.leastLoaded();
  }
}
```

**Prompt Templates:**
```typescript
export const QUESTION_GENERATION_PROMPTS = {
  GRE_TEXT_COMPLETION: `
You are an expert GRE test creator. Generate a challenging Text Completion question.

REQUIREMENTS:
- Difficulty: {difficulty}/5
- Topic: {topic}
- Format: {blank_count}-blank sentence
- Vocabulary level: Graduate-level

STRUCTURE:
- Sentence: 25-35 words
- Test vocabulary in context
- Plausible distractors

OUTPUT JSON:
{
  "question": "The scientist's lecture was so _____(i)_____ that...",
  "options": [
    {"id": "A", "text": "lucid", "correct": false},
    {"id": "B", "text": "abstruse", "correct": true},
    ...
  ],
  "correct_answer": ["B"],
  "explanation": "Detailed reasoning...",
  "difficulty_estimate": 4,
  "skills_tested": ["vocabulary", "context_clues"]
}

EXAMPLES:
{examples}

Generate a NEW question:
`,
  
  SAT_MATH: `...`,
  GMAT_DATA_SUFFICIENCY: `...`,
};
```

**Checkpoint 2.1: AI Providers Ready** ✅
- [ ] OpenAI integration working
- [ ] Claude integration working
- [ ] Fallback logic tested
- [ ] Cost tracking operational
- [ ] Prompt templates for 3 exams created
- [ ] Vector database operational

---

## Session 8: Question Generation Pipeline (Weeks 15-16)

### Objectives
- Build question generation service
- Implement validation pipeline
- Create review queue

### Tasks & Story Points

**Backend (28 pts)**
- [12] Build question generator service
- [8] Create content validator (5 checks)
- [5] Implement duplicate detection (vector search)
- [3] Build generation job queue (BullMQ)

**Frontend (18 pts)**
- [10] Build review queue UI
- [5] Create question approval interface
- [3] Add quality metrics dashboard

**ML/AI (15 pts)**
- [8] Implement difficulty estimation algorithm
- [5] Build readability scorer
- [2] Create distractor quality checker

### Deliverables

**Question Generator:**
```typescript
@Injectable()
export class QuestionGeneratorService {
  async generateBatch(dto: GenerateBatchDto) {
    // Create job
    const job = await this.prisma.generationJob.create({
      data: {
        exam_id: dto.examId,
        topic: dto.topic,
        difficulty: dto.difficulty,
        count: dto.count,
        status: 'pending',
      },
    });
    
    // Queue for processing
    await this.queue.add('generate-questions', {
      jobId: job.id,
      ...dto,
    });
    
    return job;
  }
  
  @Process('generate-questions')
  async processGeneration(job: Job) {
    const { examId, topic, difficulty, count } = job.data;
    
    // Fetch template and examples
    const template = await this.getTemplate(examId, topic);
    const examples = await this.getFewShotExamples(examId, topic, 5);
    
    const generated = [];
    const failed = [];
    
    // Generate in batches of 10
    for (let i = 0; i < count; i += 10) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(10, count - i) }, async () => {
          try {
            // Build prompt
            const prompt = this.buildPrompt(template, examples, difficulty);
            
            // Call AI
            const response = await this.aiOrchestrator.generate({
              type: 'question_generation',
              prompt,
              temperature: 0.8,
              response_format: { type: 'json_object' },
            });
            
            // Parse
            const question = JSON.parse(response.content);
            
            // Validate
            const validation = await this.validator.validate(question);
            
            if (validation.score > 0.7) {
              generated.push({ ...question, quality_score: validation.score });
            } else {
              failed.push({ question, errors: validation.errors });
            }
          } catch (error) {
            failed.push({ error: error.message });
          }
        })
      );
      
      // Update progress
      await this.updateJobProgress(job.data.jobId, (i + 10) / count);
    }
    
    // Save to review queue
    await this.saveToReviewQueue(generated, job.data.jobId);
    
    return { generated: generated.length, failed: failed.length };
  }
}
```

**Content Validator:**
```typescript
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
    
    return { isValid: errors.length === 0, score, errors, warnings };
  }
  
  private async detectDuplicates(q: GeneratedQuestion) {
    // Embed question
    const embedding = await this.embeddingService.embed(q.question);
    
    // Search vector DB
    const similar = await this.vectorStore.search({
      vector: embedding,
      topK: 5,
      filter: { exam_id: q.exam_id },
    });
    
    const duplicates = similar.filter(s => s.score > 0.85);
    
    return {
      score: duplicates.length > 0 ? 0 : 1,
      errors: duplicates.map(d => `Too similar to Q${d.id} (${d.score})`),
      warnings: similar.filter(s => s.score > 0.75 && s.score <= 0.85)
        .map(s => `Similar to Q${s.id} (${s.score})`),
    };
  }
}
```

**Checkpoint 2.2: Generation Pipeline Working** ✅
- [ ] Can generate 100 questions in <10 minutes
- [ ] Validation catches malformed questions
- [ ] Duplicate detection prevents similar questions
- [ ] Generation jobs tracked in database
- [ ] Review queue populated automatically
- [ ] Cost per question <$0.15

---

## Session 9: AI Tutor & Explanations (Weeks 17-18)

### Objectives
- Build AI tutor chatbot
- Generate explanations for existing questions
- Implement RAG (Retrieval Augmented Generation)

### Tasks & Story Points

**Backend (25 pts)**
- [10] Build AI tutor service with conversation context
- [8] Implement RAG pipeline (LangChain)
- [5] Create explanation generator
- [2] Add rate limiting for AI queries

**Frontend (22 pts)**
- [10] Build AI chat interface
- [8] Create explanation viewer (step-by-step)
- [4] Add conversation history

**ML/AI (12 pts)**
- [6] Build context retrieval system
- [4] Create user profile embeddings
- [2] Optimize prompt chaining

### Deliverables

**AI Tutor with RAG:**
```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

@Injectable()
export class AITutorService {
  private chain: RetrievalQAChain;
  
  async initialize() {
    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex: this.pinecone.Index('answly-content') }
    );
    
    // Create chain
    this.chain = RetrievalQAChain.fromLLM(
      new ChatOpenAI({ 
        modelName: 'gpt-4-turbo', 
        temperature: 0.7 
      }),
      vectorStore.asRetriever(4) // Retrieve top 4 relevant docs
    );
  }
  
  async ask(userId: string, question: string, context?: Context) {
    // Get user profile for personalization
    const userProfile = await this.getUserProfile(userId);
    
    // Build prompt with context
    const prompt = `
User Profile:
- Name: ${userProfile.name}
- Level: ${userProfile.level}
- Weak Areas: ${userProfile.weakAreas.join(', ')}
- Recent Topics: ${userProfile.recentTopics.join(', ')}

${context ? `Test Context: ${JSON.stringify(context)}` : ''}

User Question: ${question}

Provide a helpful, personalized answer:
- Tailor explanation to user's level
- Reference their weak areas if relevant
- Use examples from topics they've practiced
- Be encouraging and clear
`;
    
    // Query chain (retrieves relevant content + generates answer)
    const response = await this.chain.call({ query: prompt });
    
    // Track interaction
    await this.logInteraction(userId, question, response.text);
    
    // Update user profile
    await this.updateUserContext(userId, question, response.text);
    
    return {
      answer: response.text,
      sources: response.sourceDocuments,
      followUpPrompts: await this.generateFollowUps(question, response.text),
    };
  }
  
  private async generateFollowUps(question: string, answer: string) {
    const prompt = `
Given this Q&A exchange, suggest 3 relevant follow-up questions:

Question: ${question}
Answer: ${answer}

Generate 3 follow-up questions as JSON array:
`;
    
    const response = await this.ai.generate({
      prompt,
      temperature: 0.8,
      max_tokens: 200,
    });
    
    return JSON.parse(response.content);
  }
}
```

**Explanation Generator:**
```typescript
@Injectable()
export class ExplanationGeneratorService {
  async generateExplanation(questionId: string, level: 'simplified' | 'standard' | 'advanced') {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    
    const prompt = EXPLANATION_PROMPTS[level].replace('{question}', JSON.stringify(question));
    
    const response = await this.ai.generate({
      prompt,
      temperature: 0.5,
      model: 'gpt-4-turbo',
    });
    
    // Save explanation
    await this.prisma.explanation.create({
      data: {
        question_id: questionId,
        content: response.content,
        explanation_type: level,
        ai_model: 'gpt-4-turbo',
      },
    });
    
    return response.content;
  }
}
```

**Checkpoint 2.3: AI Tutor Live** ✅
- [ ] AI tutor responds to queries in <5s
- [ ] Conversations maintain context
- [ ] RAG retrieves relevant content
- [ ] Explanations generated for 100 test questions
- [ ] Rate limiting prevents abuse
- [ ] User satisfaction >4/5 (survey)

---

## Session 10: IRT Calibration & Personalization (Weeks 19-20)

### Objectives
- Implement Item Response Theory (IRT)
- Build personalization engine
- Create adaptive test selection

### Tasks & Story Points

**Backend (30 pts)**
- [12] Implement 3PL IRT model
- [10] Build user ability estimation
- [5] Create adaptive question selection
- [3] Add personalized recommendations

**ML/AI (20 pts)**
- [10] Build IRT calibration service
- [6] Create user embedding system
- [4] Implement collaborative filtering

**Frontend (12 pts)**
- [8] Build personalized dashboard
- [4] Add adaptive test UI

### Deliverables

**IRT Implementation:**
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
    
    // Extract data
    const data = attempts.map(a => ({
      correct: a.is_correct,
      theta: a.user.irtProfile?.ability_estimate || 0,
    }));
    
    // Maximum Likelihood Estimation
    const params = this.estimate3PL(data);
    
    // Save parameters
    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        irt_a: params.a, // Discrimination
        irt_b: params.b, // Difficulty
        irt_c: params.c, // Guessing
        calibration_sample: attempts.length,
        last_calibrated_at: new Date(),
      },
    });
    
    return params;
  }
  
  async estimateUserAbility(userId: string, examId: string) {
    const attempts = await this.getUserAttempts(userId, examId);
    
    let theta = 0; // Start at average ability
    const iterations = 50;
    const learningRate = 0.1;
    
    // Iterative Maximum Likelihood Estimation
    for (let i = 0; i < iterations; i++) {
      let gradient = 0;
      
      attempts.forEach(a => {
        const { irt_a, irt_b, irt_c } = a.question;
        if (!irt_a) return; // Skip non-calibrated
        
        const p = this.probability3PL(theta, irt_a, irt_b, irt_c);
        const factor = irt_a * (p - irt_c) * (1 - p) / ((1 - irt_c) * p);
        
        gradient += a.is_correct ? factor : -factor;
      });
      
      theta += learningRate * gradient / attempts.length;
      theta = Math.max(-4, Math.min(theta, 4)); // Constrain [-4, 4]
    }
    
    // Save user's theta
    await this.prisma.irtProfile.upsert({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
      update: {
        ability_estimate: theta,
        standard_error: this.calculateSE(attempts, theta),
        last_updated: new Date(),
      },
      create: {
        user_id: userId,
        exam_id: examId,
        ability_estimate: theta,
        standard_error: this.calculateSE(attempts, theta),
      },
    });
    
    return theta;
  }
  
  probability3PL(theta: number, a: number, b: number, c: number): number {
    return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
  }
}
```

**Personalization Engine:**
```typescript
@Injectable()
export class PersonalizationService {
  async getRecommendations(userId: string, examId: string) {
    // Get user's IRT profile
    const irtProfile = await this.irtService.getUserProfile(userId, examId);
    
    // Get performance by topic
    const topicScores = await this.analyticsService.getTopicScores(userId, examId);
    
    // Identify weak areas (score < 60%)
    const weakTopics = topicScores
      .filter(t => t.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
    
    // Select questions for weak topics at appropriate difficulty
    const recommendations = [];
    
    for (const topic of weakTopics) {
      const questions = await this.selectAdaptiveQuestions({
        examId,
        topic: topic.name,
        targetTheta: irtProfile.ability_estimate,
        count: 20,
      });
      
      recommendations.push({
        type: 'practice',
        topic: topic.name,
        reason: `Your accuracy is ${(topic.accuracy * 100).toFixed(0)}%. Practice to improve!`,
        questions,
        estimatedTime: 20 * 60, // 20 questions * 60 seconds
      });
    }
    
    return recommendations;
  }
  
  private async selectAdaptiveQuestions(params: AdaptiveParams) {
    // Select questions where difficulty matches user ability
    // Prefer questions with good IRT parameters
    const questions = await this.prisma.question.findMany({
      where: {
        exam_id: params.examId,
        topic: params.topic,
        irt_a: { not: null }, // Only calibrated questions
        irt_b: {
          gte: params.targetTheta - 0.5,
          lte: params.targetTheta + 0.5,
        },
      },
      orderBy: {
        irt_a: 'desc', // Prefer high discrimination
      },
      take: params.count,
    });
    
    return questions;
  }
}
```

**Checkpoint 2.4: Personalization Working** ✅
- [ ] IRT parameters calculated for 500+ questions
- [ ] User ability estimates accurate (validated against scores)
- [ ] Adaptive question selection functional
- [ ] Personalized recommendations generated
- [ ] Difficulty matches user level
- [ ] Percentile rankings accurate

---

## Phase 2 Final Deliverables

### AI Features
✅ Question generation (1000+ questions per exam)  
✅ AI tutor with RAG  
✅ Explanation generation  
✅ Content validation pipeline  
✅ Human review workflow  

### ML Features
✅ IRT calibration (3PL model)  
✅ User ability estimation  
✅ Adaptive question selection  
✅ Personalized recommendations  
✅ Difficulty scoring  

### Quality Metrics
- **AI Approval Rate:** >90%
- **Generation Cost:** <$0.10/question
- **Tutor Response Time:** <5s (p95)
- **IRT Accuracy:** >85% (theta vs actual score correlation)
- **User Satisfaction:** >4.2/5.0

---

## Phase 2 Gate Review

Before proceeding to Phase 3:

### AI Quality
- [ ] 1000+ AI questions generated per exam
- [ ] >90% approval rate from reviewers
- [ ] Duplicate detection working (no duplicates in sample of 100)
- [ ] Generation cost <$0.10/question
- [ ] AI tutor provides helpful answers (user survey >4/5)

### ML Performance
- [ ] IRT calibration working for 500+ questions
- [ ] User ability estimates correlate with scores (r > 0.8)
- [ ] Adaptive selection shows improvement over random
- [ ] Personalized recommendations relevant (user feedback)

### Technical
- [ ] API response time maintained (<200ms for non-AI)
- [ ] AI endpoints <5s (p95)
- [ ] Cost monitoring in place
- [ ] Fallback providers tested
- [ ] Vector database performing well

---

# Phase 2 Spec Parity Addendum

This addendum augments Phase 2 with items from the technical specification to ensure full coverage.

## Session 7: AI Infrastructure & Providers (Weeks 13-14)

- **Provider Diversity & Routing**
  - Add Google Vertex AI or AWS SageMaker endpoints as optional managed hosting
  - Cost-aware routing rules per task type (generation vs. embeddings vs. tutor)
  - Health checks + circuit breaker per provider
- **Safety & Hallucination Controls**
  - Anthropic for safety scoring of generations
  - "Critic pass" for fact consistency checks
  - Guardrail prompts; refusal and redaction policies
- **Telemetry & Cost Tracking**
  - Track tokens, latency, cost per request/provider
  - Monthly budget caps with alerting
- **Fine-tuning Plan**
  - Data pipeline for supervised fine-tuning (JSONL export)
  - PEFT/LoRA adapters for Llama/Mistral (HF + PEFT)
  - Model registry (staging→prod promotion criteria)

## Session 8: Generation Pipeline & Validation (Weeks 15-16)

- **Multilingual Generation**
  - Prompt variants per locale (en, es, fr, hi, zh)
  - Locale-specific tokenization/embeddings
  - Human reviewer pool by language
- **Evaluation Metrics**
  - Automated: BLEU/ROUGE for explanations; structure/format validators
  - Statistical QA: difficulty distribution, distractor analysis, response time norms
  - Reviewer agreement: inter‑rater reliability > 0.85
- **Search Indexing**
  - On approve: index to ElasticSearch; embed to Pinecone; warm Redis cache
  - De-dup pipeline with HNSW/IVF config in vector DB
- **Content Provenance**
  - Track `ai_provider`, `ai_model`, `prompt_id`, `template_version` on items
  - Watermarking hash for AI-generated content

## Session 9: AI Tutor & Specialized UIs (Weeks 17-18)

- **Listening Comprehension UI**
  - Audio one‑time playback, controlled replays, note area, accessibility captions
  - Preload strategy; buffering tolerance; download fallback for PWA
- **Coding Interface (where applicable)**
  - Monaco editor with language modes; run sandbox (limited), test cases optional
  - Anti‑cheat: copy/paste detection, focus change logging (respect privacy)
- **Tutor Enhancements**
  - RAG multi‑index (questions, explanations, docs, user history)
  - Personalization signals: weak topics, time pressure traits, target score
  - Suggested follow‑ups; study plan draft generation

## Session 10: IRT & Personalization (Weeks 19-20)

- **IRT Data Quality**
  - Minimum attempts gating per item/topic before using parameters
  - DIF analysis to detect bias across cohorts/locales
- **Adaptive Engine**
  - Cold start strategy: use topic-level priors and CTT until IRT stabilizes
  - Exploration vs exploitation: ε‑greedy for practice recommendations
- **Privacy & Compliance**
  - Pseudonymize user identifiers in ML datasets
  - Data retention and deletion policy for ML features

## Acceptance Criteria Additions

- Providers: OpenAI + Anthropic + Cohere + (Vertex or SageMaker) configured
- Safety pass executed on all generations; flagged items routed to review
- Multilingual generation and review ready for 5 core languages
- AI evaluation dashboard (BLEU/ROUGE, approval rates, costs)
- Listening and coding UIs prototyped and testable
- IRT parameters and personalization respect data minimization


---

## Next Phase

Proceed to: **[Phase 3: Monetization](./03-phase3-monetization.md)**

Focus: Subscriptions, billing, analytics, revenue
