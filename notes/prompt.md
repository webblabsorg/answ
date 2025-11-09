Develop a comprehensive, production-ready **technical specification and implementation blueprint** for **Answly** — a web platform that provides high‑fidelity, exam‑like practice for standardized and professional tests (e.g., **SAT, GRE, GMAT, AMCAT, VAT, CFA, CPA**, and many others).

The output will be used by engineering teams to build Answly; exclude marketing, timelines, and fundraising material. Focus purely on technical design, architecture, data models, APIs, UX wireframes/layouts, and AI/ML pipelines.

---

## High-level requirements (additions)

1. **Exam fidelity**: Each exam offered by Answly must *mimic the exact format, difficulty, timing, section order, question types, mark scheme, and UI layout* of the real exam. The goal is to reproduce the real exam atmosphere so test‑takers have an indistinguishable practice experience.

2. **AI-powered content**: AI will be used to generate questions (multiple choice, numeric, short answer, essay prompts), answers, explanations, adaptive hints, and study tutorials. Provide a robust AI pipeline that includes generation, automatic validation, difficulty calibration, human review (HITL), and continuous quality monitoring.

3. **Multi-AI support**: Use multiple AI providers for redundancy, specialty strengths, and cost optimization (e.g., OpenAI, Anthropic/Claude, Cohere, Hugging Face models, and optionally Google Vertex AI). Include an AI selection layer and fallbacks with routing logic.

4. **Multilingual & Multicurrency**: Support the core examination languages (e.g., English, French, Spanish, Hindi, Mandarin where applicable) and regional UI localization. Support multiple currencies for payments and pricing display based on user location and selectable currency.

5. **PWA & Mobile**: Provide a Progressive Web App (PWA) and native mobile app readiness (React Native / Expo) plans. Ensure offline capability for cached practice questions, local progress sync, and resume testing.

6. **Homepage & Main Layout**: Desktop/web homepage and app should follow the ChatGPT layout: a static left sidebar with exam categories (smart categorization by exam, age, country, difficulty, and language), a prominent centered chatbox-like main area for conversational features and quick test launching, and a right/secondary panel for contextual tools, insights, and shortcuts.

---

## Deliverable structure (what Claude Code should generate)

Produce a full technical document containing the following sections and detailed content for each:

1. **Platform overview** — mission, supported exams, key non-functional requirements (scalability, availability, latency, security, compliance), and a short prioritized feature matrix.

2. **Detailed feature list** — free vs Pro vs Professional; admin & instructor capabilities; AI features (auto-generation, difficulty tagging, auto‑explanations, hinting, personalized study plans); analytic features (item analysis, IRT / psychometric insights, cohort benchmarking); accessibility, localization, and currency handling.

3. **User roles & RBAC** — exact permission matrix for Test‑taker (Free/Pro/Professional), Instructor/Content Creator, Content Reviewer, Admin, Support Agent, and Organization (institution) accounts.

4. **UX wireframes & layout specifications** (pixel/design notes):

   * Homepage (ChatGPT‑style layout): left static sidebar (menu, categories, filters), central chat/test launcher box (search, start mock test, ask study‑bot), secondary right panel (quick stats, saved items, recommended tests). Include responsive/mobile/PWA behavior.
   * Test‑taking UI: exact layout for each exam type (section navigation, question panel, timer, flagging, calculator support, answer review modal, accessibility controls, keyboard shortcuts). Provide separate wireframes for exams with special interfaces (essay, coding, listening comprehension).
   * Dashboard, Results & Analytics pages (charts, tables, exportable CSV/PDF, question‑level breakdowns).

5. **System architecture & components** — component diagrams and textual explanation for frontend (Next.js + Tailwind + ShadCN), backend (NestJS), DB (Postgres + Prisma), caching (Redis), vector store (Pinecone/Weaviate/Milvus), file storage (S3 or Supabase), analytics pipeline (Kafka or AWS Kinesis), and search (ElasticSearch or OpenSearch). Include API gateway, rate limiting, and CDN logic.

6. **AI/ML architecture** —

   * *Generation pipeline*: prompt engineering templates for question generation per exam, batching, and temperature/seed control.
   * *Validation & calibration*: automatic checks (plausibility, format, duplication), difficulty scoring (ML model + heuristics), answer correctness verification, and human-in-loop workflows for manual QA.
   * *Personalization engine*: student embeddings, performance vectors, session histories, and recommendation engine using vector DB + ranking model.
   * *Model orchestration*: multi‑provider routing (OpenAI / Anthropic / Cohere / HF), local fine‑tuning options (LoRA / adapters) and cost-aware fallback rules.

7. **Suggested AI/ML tools & APIs** — include recommended providers and roles:

   * **OpenAI**: best for general reasoning, explanations, and text generation (GPT family).
   * **Anthropic (Claude)**: strong for instruction following and safety / hallucination mitigation.
   * **Cohere / Hugging Face**: on‑premise or lower‑cost embeddings and local model deployment; HF for access to fine‑tunable models.
   * **Vertex AI / AWS SageMaker**: for managed model hosting, fine‑tuning, and MLOps pipelines.
   * **LangChain (or similar orchestration)**: for prompt chaining, agent flows, retrieval augmentation (RAG).
   * **Pinecone / Weaviate / Milvus**: for vector search for user history, question bank retrieval, and personalization.
   * **Evaluation tools**: custom unit tests, BLEU/ROUGE for explanation quality, difficulty calibration using Item Response Theory (IRT) tooling, and automated statistical QA.

8. **Database schema & data models** — detailed tables/entities with fields (User, Exam, Section, Question, Option, TestSession, Attempt, ItemStat, Subscription, Payment, InstructorContribution, ReviewRecord, LocalizationStrings). Include indexes and relationships.

9. **API surface** — sample REST or GraphQL endpoints for core flows (auth, exam catalog, start test, submit answer, fetch results, generate question via AI, admin moderation, subscription billing). Provide request/response shape examples.

10. **Workflows** — concrete step‑by‑step flows: user signup/onboarding, adaptive test flow, AI question generation + moderation, subscription upgrade, institution provisioning, content reporting & moderation.

11. **Dev practices & file structure** — Next.js app layout, ShadCN component library organization, NestJS modules (Auth, Exams, AI, Billing, Analytics), code examples for DTOs, services, and middlewares. Include environment configuration and secrets management.

12. **Security, compliance & proctoring** — auth flow (JWT + refresh tokens), secure config, encryption at rest/in transit, GDPR considerations, exam integrity options (IP throttling, secure browser, remote proctoring integrations), and abuse prevention.

13. **Testing & QA** — unit, integration, E2E (Cypress / Playwright), AI output validation tests, load testing (k6), and continuous monitoring.

14. **Pricing & access logic** — a clear feature matrix for Free / Pro / Professional, per‑exam limits, batch upload limits, AI usage quotas, and metering rules for AI generation costs.

15. **Scalability & ops** — suggestions for horizontal scaling, observability (Prometheus, Grafana, Sentry), disaster recovery, and DB partitioning/sharding strategy for large question banks.

16. **Appendices** — sample prompts for each major exam category (SAT, GRE, CFA, CPA, etc.) that instruct the AI how to generate exam‑like questions, example data payloads, swagger sketches, and role matrix.

---

## Output format & tone

* Provide the document as a hierarchical technical spec with headers, subsections, diagrams (described textually), and code snippets where useful.
* Use precise tech vocabulary; where tradeoffs exist, list options and recommended default.
* Output must be actionable and sufficiently detailed for a 3–6 engineer team to begin implementation.

---

## Final request

Produce the complete technical document described above.

<!-- End of prompt -->
