# Phase 4 Spec Parity Addendum

This addendum augments Phase 4 with enterprise, compliance, and scale-readiness items from the technical specification.

## Session 15: SSO & Organization Management (Weeks 29-30)

- **Advanced RBAC & Audit Logs**
  - Fine-grained org-level permissions (seat admin, instructor, reviewer)
  - Immutable audit log (append-only) for admin actions and SSO events
  - Exportable audit trail (CSV) with tamper-evident hash chain
- **Data Residency & Multi-Region**
  - Region selection per org (EU/US) with S3 buckets + RDS read replicas pinned to region
  - Geo routing at CDN (CloudFront/Cloudflare); failover plan
  - Data processing addendum (DPA) templates and SCC readiness
- **Mobile Readiness (React Native/Expo) – Plan**
  - Shared API surface and auth flows; deep linking
  - Offline cache (SQLite/AsyncStorage) for practice sessions; background sync
  - Minimum viable mobile screens (Dashboard, Practice, Results)

## Session 16: White-Label, Proctoring & API (Weeks 31-32)

- **Secure Browser / Exam Integrity**
  - Kiosk/lockdown mode support (Safe Exam Browser config, or Chromebooks managed mode)
  - Clipboard/print prevention where permitted; tab switch detection + soft warnings
  - Configurable per exam/section to preserve fidelity
- **Plagiarism Detection (Essays)**
  - Turnitin API integration (primary) with Copyscape fallback
  - Essay similarity scores stored with attempt; admin thresholds and flags
- **API Access, Quotas & WAF**
  - API keys per org; scopes and per-key rate limits (Burst/SLM by tier)
  - Global WAF rules (L7) for abuse prevention; IP allow/deny lists by org
  - Usage analytics per API key (requests, errors, latency, cost)
- **DB Scale & Archival**
  - Partition large tables (Attempts, AIInteractions) by month; indexes by (user_id, question_id)
  - Warm/cold storage policy: move >12-month data to cheaper storage + parquet in data lake
  - PITR validated; DR runbook tested (RTO 1h, RPO 15m)
- **Compliance**
  - GDPR: DSAR automated flows (export/delete)
  - Accessibility conformance statement and regression checks each release
  - FERPA/COPPA guidance where applicable (schools/minors)

## Acceptance Criteria Additions

- Audit logs present and exportable; integrity verified via hash chain
- Region pinning works (EU org data stays in EU resources)
- Secure browser mode available for supported contexts
- Plagiarism detection live in staging; flags visible in review UI
- API keys with quotas/rate limits and usage analytics
- Partitioning + archival policies implemented and tested
- DR drill executed and documented
