# Phase 5 (Optional): On‑Prem & Self‑Hosted Deployment
## Packaging, Installers, Operations, Support

**Duration:** 4 weeks (2 sessions)  
**Track Type:** Optional (can run after Phase 4 or in parallel with enterprise pilots)  
**Goal:** Enable customers to deploy Answly in their own infrastructure (air‑gapped or managed)

---

## Scope

- Kubernetes-first delivery (Helm charts, Terraform IaC)
- Pluggable cloud dependencies (S3 ↔ MinIO, ElasticSearch ↔ OpenSearch, Pinecone ↔ Weaviate/Milvus)
- Secure secrets management (Sealed Secrets/Vault)
- Observability bundle (Prometheus/Grafana, Loki/ELK, Sentry self-host)
- Backup/restore, DR, and update channels
- Licensing, telemetry opt‑in/out, and support runbook

---

## Session 17: Packaging & Environment Parity (Weeks 33–34)

### Objectives
- Produce reproducible, versioned installer artifacts
- Provide IaC for core infra + app deployment
- Document minimal and recommended sizing

### Tasks
- **Helm Charts**
  - Charts for: api (NestJS), web (Next.js), worker (BullMQ), postgres, redis
  - Values for: domains, TLS, rate‑limits, tiers, providers
  - Probes, HPA, PodDisruptionBudgets, SecurityContext
- **Terraform Modules**
  - Base cluster (EKS/AKS/GKE) or generic K8s target
  - Networking (Ingress/Nginx/Cloudflare), storage classes, cert‑manager
- **Data Services (Pluggable)**
  - Object storage: S3 (cloud) or MinIO (on‑prem)
  - Search: ElasticSearch or OpenSearch
  - Vector store: Pinecone (managed) or Weaviate/Milvus (self‑host)
  - DB: Postgres Operator or Helm (primary + read replicas)
- **Secrets & Config**
  - Sealed Secrets/Vault, external secrets for KMS/HSM
  - Twelve‑factor env; config overrides by env

### Deliverables
- Helm charts repo with versioned releases
- Terraform modules and reference architecture
- Example values files: small/medium/large clusters
- Install guide: online and air‑gapped modes
- Sizing guide (CPU/RAM/storage/IOPS)

### Checkpoints
- [ ] Helm install passes conformance tests
- [ ] App boots with managed and self‑hosted dependencies
- [ ] Blue/green deploy supported (canary optional)
- [ ] Documentation: install, upgrade, rollback

---

## Session 18: Security, DR, Licensing & Support (Weeks 35–36)

### Objectives
- Harden security posture for on‑prem
- Provide robust backup/restore and DR path
- Implement license checks and support channels

### Tasks
- **Security Hardening**
  - Network policies, mTLS between services (service mesh optional)
  - CSP, HSTS, WAF config (Nginx/Cloudflare rulesets)
  - Secrets rotation playbooks; audit logging sinks
- **Backup/DR**
  - Postgres PITR (WAL archiving), snapshot schedules
  - Object storage versioning + lifecycle
  - Run DR drill: RTO ≤ 1h, RPO ≤ 15m
- **Upgrades**
  - Version channels: stable, LTS, hotfix
  - Pre‑flight validations, migration hooks, data backups
- **Licensing & Telemetry (Opt‑in)**
  - License server/keys (online/offline)
  - Optional anonymized usage telemetry
- **Support**
  - Runbook (SLOs, escalation), health dashboards
  - Support bundle collector (logs, metrics, config)

### Deliverables
- Security baseline document for on‑prem
- Backup/restore scripts and DR runbook
- License validation service & admin UI
- Support bundle CLI and docs

### Checkpoints
- [ ] DR drill executed and documented
- [ ] Vulnerability scan passes baseline (no criticals)
- [ ] Upgrade/rollback verified on staging cluster
- [ ] License enforcement active; telemetry toggle documented

---

## Configuration Matrix (Managed vs On‑Prem)

| Capability | Managed Cloud | On‑Prem Option |
|---|---|---|
| Object Storage | AWS S3 | MinIO |
| Search | ElasticSearch | OpenSearch |
| Vector DB | Pinecone | Weaviate/Milvus |
| CDN | CloudFront/Cloudflare | Customer CDN or Nginx cache |
| Auth | Hosted OAuth/OIDC | Keycloak/ADFS/OIDC |
| Secrets | AWS Secrets Manager | Vault/Sealed Secrets |
| Monitoring | Datadog/Sentry | Prometheus/Grafana + Sentry On‑Prem |

---

## Documentation
- Install & Upgrade Guide (air‑gapped included)
- Sizing & Capacity Planning
- Security hardening checklist
- DR & Backup Playbook
- Support Runbook

---

## Success Criteria
- Customer can deploy in <1 day with provided charts
- Upgrades & rollbacks work predictably
- DR targets met (RTO ≤ 1h, RPO ≤ 15m)
- Security posture meets enterprise thresholds
