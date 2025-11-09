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
