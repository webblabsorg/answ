# Answly Technical Specification - Part 3
# AI/ML Architecture

---

## 6. AI/ML System Overview

### 6.1 Core AI Pipelines

1. **Question Generation**: Creates exam-like questions using LLMs
2. **Explanation Generation**: Step-by-step solutions and hints
3. **Difficulty Calibration**: IRT-based difficulty estimation
4. **Validation & QC**: Automated quality checks + human review
5. **Personalization**: ML-based recommendations
6. **AI Tutor Bot**: Conversational study assistant

### 6.2 Multi-Provider Architecture

**Providers & Selection Logic:**

```typescript
// Primary: OpenAI (best reasoning, fine-tuning)
// Secondary: Anthropic Claude (safety, instruction-following)
// Tertiary: Cohere (cost-effective, embeddings)
// Backup: HuggingFace (self-hosted fallback)

interface AIProvider {
  name: 'openai' | 'anthropic' | 'cohere' | 'huggingface';
  models: string[];
  costPer1M: { input: number; output: number };
  latencyP95: number;
}

class AIOrchestrator {
  selectProvider(task: AITask) {
    if (task.priority === 'quality') return 'openai'; // GPT-4
    if (task.priority === 'speed') return 'cohere'; // Command-R
    if (task.priority === 'cost') return 'huggingface'; // Local
    return this.leastLoaded(); // Load balance
  }
  
  async executeWithFallback(task, providers) {
    for (const provider of providers) {
      try {
        return await this.call(provider, task);
      } catch (e) {
        console.error(`${provider} failed, trying next...`);
      }
    }
    throw new Error('All providers failed');
  }
}
```

### 6.3 Question Generation Pipeline

**Flow:**
```
Input (topic, difficulty) 
  → Template Selection 
  → Prompt Construction (few-shot examples)
  → LLM Call (GPT-4 / Claude, JSON mode)
  → Format Validation
  → Content Validation (plausibility, duplicates)
  → Quality Scoring
  → Human Review Queue (if score < 0.9)
  → Approved → Question Bank
```

**Example Prompts:**

```markdown
GRE Text Completion Prompt:
"Generate a GRE-level vocabulary question.
Topic: {topic}, Difficulty: {difficulty}/5
Requirements: Advanced vocab, plausible distractors, 20-40 words.
Output JSON: {question, options[], correct_answer, explanation, difficulty_estimate}"

SAT Math Prompt:
"Generate SAT Math question for {section}.
Topic: {topic}, Calculator: {yes/no}, Difficulty: {difficulty}/5.
Output JSON with solution_steps[]. Distractors should reflect common errors."
```

**Generator Service:**
```typescript
@Injectable()
export class QuestionGeneratorService {
  async generateQuestions(dto: GenerateDto) {
    const job = await this.createJob(dto);
    await this.queue.add('generate', job.id);
    return job;
  }

  @Process('generate')
  async process(job: Job) {
    const { examId, topic, difficulty, count } = job.data;
    const template = await this.getTemplate(examId, topic);
    const examples = await this.getFewShot(examId, topic, 5);
    
    const generated = [];
    for (let i = 0; i < count; i++) {
      const prompt = this.buildPrompt(template, examples, difficulty);
      const response = await this.ai.call({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });
      
      const question = JSON.parse(response.content);
      const validation = await this.validate(question);
      
      if (validation.score > 0.7) {
        generated.push(question);
      }
    }
    
    await this.saveToReviewQueue(generated);
  }
}
```

### 6.4 Content Validation

**Automated Checks:**

1. **Format**: Required fields, option count, answer format
2. **Plausibility**: Word count, option length variance, giveaway words
3. **Duplicates**: Vector similarity search (threshold: 0.85)
4. **Difficulty**: Readability (Flesch-Kincaid), vocab complexity, steps
5. **Distractors**: Type consistency, numeric distance from correct answer

```typescript
@Injectable()
export class ContentValidatorService {
  async validate(question: GeneratedQuestion) {
    const checks = await Promise.all([
      this.validateFormat(question),
      this.checkPlausibility(question),
      this.detectDuplicates(question), // Vector search
      this.estimateDifficulty(question),
      this.checkDistractors(question),
    ]);
    
    const score = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const errors = checks.flatMap(c => c.errors);
    
    return { isValid: errors.length === 0, score, errors };
  }
  
  async detectDuplicates(q: GeneratedQuestion) {
    const embedding = await this.embeddings.embed(q.question);
    const similar = await this.vectorDB.search({
      vector: embedding,
      topK: 5,
      filter: { exam_id: q.exam_id }
    });
    
    const tooSimilar = similar.filter(s => s.score > 0.85);
    return {
      score: tooSimilar.length > 0 ? 0 : 1,
      errors: tooSimilar.map(s => `Similar to Q${s.id} (${s.score})`)
    };
  }
}
```

### 6.5 Item Response Theory (IRT)

**3-Parameter Logistic Model:**
```
P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))

θ = ability level
a = discrimination (0.5-2.5, how well it differentiates)
b = difficulty (-3 to +3 logit scale)
c = guessing (typically 0.25 for 4-option MCQ)
```

**Implementation:**
```typescript
@Injectable()
export class IRTService {
  // Calibrate question parameters from user data
  async calibrateQuestion(questionId: string) {
    const attempts = await this.getAttempts(questionId);
    if (attempts.length < 30) throw new Error('Need >= 30 attempts');
    
    // Maximum Likelihood Estimation
    const params = this.estimate3PL(attempts);
    
    await this.prisma.question.update({
      where: { id: questionId },
      data: { irt_a: params.a, irt_b: params.b, irt_c: params.c }
    });
  }
  
  // Estimate user ability
  async estimateAbility(userId: string, examId: string) {
    const attempts = await this.getUserAttempts(userId, examId);
    let theta = 0; // Start at average ability
    
    // Iterative MLE
    for (let i = 0; i < 50; i++) {
      let gradient = 0;
      attempts.forEach(a => {
        const p = this.prob3PL(theta, a.question.irt_a, a.question.irt_b, a.question.irt_c);
        gradient += a.question.irt_a * (a.is_correct ? (1-p) : -p);
      });
      theta += 0.1 * gradient / attempts.length;
    }
    
    await this.saveUserTheta(userId, examId, theta);
    return theta;
  }
  
  prob3PL(theta, a, b, c) {
    return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
  }
  
  thetaToPercentile(theta) {
    return this.normalCDF(theta) * 100;
  }
}
```

---

## 7. AI Tools & API Matrix

### 7.1 Provider Recommendations

| Provider | Best For | Models | Cost/1M tokens | Integration |
|----------|----------|--------|----------------|-------------|
| **OpenAI** | Question generation, reasoning | GPT-4 Turbo, GPT-4o | $10/$30 | SDK: `openai` |
| **Anthropic** | Safety, instruction-following | Claude 3 Opus/Sonnet | $15/$75 | SDK: `@anthropic-ai/sdk` |
| **Cohere** | Cost-effective, embeddings | Command-R, Embed-v3 | $3/$15 | SDK: `cohere-ai` |
| **HuggingFace** | Self-hosted, fine-tuning | Llama, Mistral, custom | Infrastructure cost | `@huggingface/inference` |

### 7.2 Specialized Tools

**Orchestration:**
- **LangChain**: Prompt chaining, agents, RAG pipelines
- **LlamaIndex**: Context augmentation, data connectors

**Vector Storage:**
- **Pinecone**: Managed, 10ms p95 latency, $70/mo (100k vectors)
- **Weaviate**: Self-hosted, hybrid search, open-source
- **Milvus**: High-scale, GPU-accelerated

**Fine-tuning:**
- **OpenAI Fine-tuning API**: $8/1M training tokens, $12/$36 inference
- **AWS SageMaker**: Custom models, Llama/Mistral adapters
- **LoRA/QLoRA**: Parameter-efficient fine-tuning (HuggingFace PEFT)

**Evaluation:**
- **Custom test suite**: 500+ labeled questions per exam
- **BLEU/ROUGE**: Explanation quality metrics
- **Human eval**: 10% sample, inter-rater reliability > 0.85
- **IRT calibration**: Post-launch using real user data

### 7.3 Implementation Examples

**LangChain RAG for AI Tutor:**
```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

export class AITutorService {
  private chain: RetrievalQAChain;
  
  async initialize() {
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex: this.pinecone.Index('answly-content') }
    );
    
    this.chain = RetrievalQAChain.fromLLM(
      new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.7 }),
      vectorStore.asRetriever(4) // Retrieve 4 relevant docs
    );
  }
  
  async ask(userId: string, question: string, context?: string) {
    const userProfile = await this.getUserProfile(userId);
    
    const prompt = `
    User: ${userProfile.name} (Level: ${userProfile.level})
    Question: ${question}
    ${context ? `Context: ${context}` : ''}
    
    Provide a helpful, concise answer tailored to the user's level.
    Use examples from their weak areas: ${userProfile.weakAreas.join(', ')}.
    `;
    
    const response = await this.chain.call({ query: prompt });
    
    await this.logInteraction(userId, question, response.text);
    return response.text;
  }
}
```

**Fine-tuning Pipeline:**
```typescript
// 1. Prepare training data
const trainingData = await this.prepareFineTuneData({
  exam: 'GRE',
  count: 1000,
  format: 'jsonl'
});

// 2. Upload to OpenAI
const file = await openai.files.create({
  file: fs.createReadStream(trainingData),
  purpose: 'fine-tune'
});

// 3. Create fine-tune job
const fineTune = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: 'gpt-3.5-turbo',
  hyperparameters: {
    n_epochs: 3,
    learning_rate_multiplier: 0.3
  }
});

// 4. Monitor and deploy
await this.monitorFineTune(fineTune.id);
await this.updateModelConfig('gre-question-gen', fineTune.fine_tuned_model);
```

---

**Continue to Part 4 for Database Schema and API Design...**
