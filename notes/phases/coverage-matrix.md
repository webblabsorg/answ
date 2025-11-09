# Implementation Coverage Matrix

This document maps core features from the Technical Specification to implementation phases/sessions. Items marked as Added were appended to phase docs to ensure parity.

Legend:
- ✅ Covered in phase plan
- ➕ Added now to phase docs
- ⚠️ Pending future elaboration (requires scoping but placeholder added)

---

## 1) Platform & UX

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| ChatGPT-style homepage layout | Part 2 §4.1 | Phase 1 – Session 2 | ➕ | Added homepage layout tasks (Sidebar/Main/Right Panel)
| Test-taking UI (MCQ, numeric, essay) | Part 2 §4.2 | Phase 1 – Sessions 3-4 | ✅ | Essay included; coding & listening added in Phase 2
| Specialized UIs: listening, coding | Part 2 §4.2 | Phase 2 – Session 9 | ➕ | Listening player controls; Coding via Monaco editor
| Results & analytics pages | Part 2 §4.3 | Phase 1 – Session 4 | ✅ | Section breakdowns, insights placeholders
| Accessibility (WCAG 2.1 AA) | Part 1 §2.6 | Phase 1 – Session 6 | ➕ | Keyboard nav, contrast, TTS, screen reader checks
| PWA & offline (cache tests, resume) | High-level req #5 | Phase 1 – Session 6 | ➕ | Service worker, App Shell, background sync
| i18n & RTL support | Part 1 §2.6 | Phase 1 – Session 6 | ➕ | next-intl, locale switcher, RTL styles

## 2) Backend, Data & Infra

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| PostgreSQL + Prisma schema | Part 4 §8 | Phase 1 – Session 2 | ✅ | Core entities done
| Redis caching & sessions | Part 5 | Phase 1 – Session 3 | ✅ | Session cache & WS
| S3/Supabase file storage | Part 5 §Infra | Phase 1 – Session 2 | ➕ | Asset pipeline for images/audio/video
| ElasticSearch/OpenSearch | Part 5 §Search | Phase 1 – Session 2 | ➕ | Bootstrap cluster and index questions
| Vector DB (Pinecone) | Part 5 §Vector | Phase 2 – Session 7 | ✅ | Retrieval and duplicates
| Event pipeline (Kafka/Kinesis) | Part 5 §Analytics pipeline | Phase 3 – Session 13 | ➕ | Stream events → aggregations
| Monitoring/Observability | Part 6 §14 | Phase 1 – Session 6 | ➕ | Prometheus/Grafana, Sentry, logs

## 3) AI/ML

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| Multi-provider orchestration | Part 3 §6.2 | Phase 2 – Session 7 | ✅ | OpenAI/Anthropic/Cohere + fallback
| Generation pipeline + HITL | Part 3 §6.3 | Phase 2 – Session 8 | ✅ | Validation pipeline complete
| AI evaluation (BLEU/ROUGE) | Part 7 | Phase 2 – Session 8 | ➕ | Auto metrics + human eval sampling
| IRT calibration (3PL) | Part 3 §6.5 | Phase 2 – Session 10 | ✅ | Theta + section insights
| Personalization + RAG tutor | Part 3 §6.4 | Phase 2 – Session 9-10 | ✅ | Tutor + recommendations
| Fine-tuning (LoRA/SageMaker) | Part 6 §Model orchestration | Phase 2 – Session 7 | ➕ | Plan + pipelines placeholder
| Multilingual generation | Part 1 §2.6 / Part 7 | Phase 2 – Session 8-9 | ➕ | Prompts + embeddings per locale

## 4) Billing & Pricing

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| Stripe subscriptions | Part 4 §Payments | Phase 3 – Session 11 | ✅ | Checkout + webhooks
| Multicurrency display | High-level req #4 | Phase 3 – Session 11 | ➕ | Currency switcher + locale pricing
| Regional providers (PayPal, Razorpay, Alipay, Mercado Pago) | Part 4 §Payments | Phase 3 – Session 11 | ➕ | Provider adapters + fallbacks
| Taxes/VAT invoices | Part 4 §Payments | Phase 3 – Session 11 | ➕ | Tax IDs, invoices, dunning
| Usage metering & limits | Part 1 §4.3 | Phase 3 – Session 11 | ✅ | Redis + DB sync

## 5) Security, Compliance & Enterprise

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| JWT + refresh + rate limits | Part 6 §12.1-12.2 | Phase 1 – Session 1/6 | ✅ | Guards + limits by tier
| GDPR (export/delete) | Part 6 §12.3 | Phase 4 – Session 16 | ➕ | DSAR flows + anonymization
| Proctoring integrations | Part 6 §12.4 | Phase 4 – Session 16 | ✅ | Provider webhook
| Secure browser mode | Part 6 §12.4 | Phase 4 – Session 16 | ➕ | Kiosk/lockdown + detection
| Plagiarism detection (essays) | Part 6 §12.4 | Phase 4 – Session 16 | ➕ | Turnitin/Copyscape API
| API quotas & org limits | Part 5 §Gateway | Phase 4 – Session 16 | ➕ | API key mgmt + quotas
| Data residency & audit logs | Part 6 | Phase 4 – Session 16 | ➕ | Region pinning + immutable audits

---

## 6) Optional Track: On‑Prem (Phase 5)

| Feature | Spec Source | Phase/Session | Status | Notes |
|---|---|---|---|---|
| On‑prem/self‑hosted deployment (Helm/Terraform) | Part 5 §System arch; Part 6 §Ops | Phase 5 – Sessions 17–18 | ➕ | Air‑gapped installer, IaC, env parity |
| Pluggable services (MinIO/OpenSearch/Weaviate/Milvus) | Part 5 §Components | Phase 5 – Sessions 17–18 | ➕ | Swap managed to self‑hosted equivalents |
| Backup/DR, upgrades, licensing/telemetry | Part 6 §Scalability & ops | Phase 5 – Session 18 | ➕ | PITR, DR drill, license server, opt‑in telemetry |
 

---

## Summary of Gaps Addressed
- Added PWA/offline, i18n/RTL, accessibility to Phase 1
- Added listening & coding UIs, AI evaluation, multilingual generation, fine-tuning plan to Phase 2
- Added multicurrency, regional payments, VAT/invoicing, event pipeline to Phase 3
- Added secure browser, plagiarism detection, API quotas, audit logs, GDPR DSAR to Phase 4
- Added optional Phase 5: On‑Prem packaging/DR/licensing

All phase documents have been updated accordingly to ensure parity with the technical specification.
