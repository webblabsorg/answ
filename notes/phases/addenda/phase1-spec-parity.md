# Phase 1 Spec Parity Addendum

This addendum augments Phase 1 with tasks from the technical specification to ensure full coverage.

## Session 1: Infrastructure & Auth (Weeks 1-2)

- **PWA Baseline**
  - Configure Next.js PWA (next-pwa), service worker scaffold
  - App Shell pattern; offline fallback route `/offline`
- **Accessibility Foundations**
  - Install ESLint a11y rules, axe-core dev checks
  - Define WCAG 2.1 AA acceptance criteria in PR template
- **Design System**
  - ShadCN tokens (colors/spacing) with high-contrast variants

## Session 2: Exam Catalog & Data Models (Weeks 3-4)

- **Homepage (ChatGPT-style layout)**
  - Left sidebar (categories, saved, recent)
  - Center chat/test launcher
  - Right panel (stats/recommendations)
- **Search (ElasticSearch/OpenSearch) Bootstrap**
  - Provision cluster (dev/staging)
  - Create `questions` index mappings (text + keyword + dense_vector)
  - ETL job to sync Questions → ES
- **Asset Storage (S3/Supabase)**
  - Buckets: `question-media/`, `explanations/`, `org-branding/`
  - Signed URL helper; upload policies

## Session 3: Test-Taking UI - Part 1 (Weeks 5-6)

- **Keyboard Shortcuts & a11y**
  - Next (N), Previous (P), Flag (F), Submit (S)
  - Focus management between options and grid
- **Localization/i18n**
  - Integrate `next-intl` with language switcher
  - Load translations from `/locales/{lang}.json`
  - RTL support (Arabic/Hebrew) via `dir="rtl"`

## Session 4: Test-Taking UI - Part 2 (Weeks 7-8)

- **Essay & Math Enhancements**
  - Essay: word count, print-safe styling
  - Math: KaTeX, copy protection (optional), equation alt-text
- **Offline Test Flow**
  - Cache next N questions in IndexedDB
  - Local answer queue; background sync on reconnect

## Session 5: Admin Panel & Content Management (Weeks 9-10)

- **Bulk Media Import**
  - CSV + ZIP (images/audio) import validation
- **Search Admin Tools**
  - Reindex button, index health status, field analyzer

## Session 6: Polish, Testing & Launch Prep (Weeks 11-12)

- **PWA Verification**
  - Lighthouse PWA: >90 score
  - Install prompt + app icons
- **Localization QA**
  - Snapshot tests for LTR/RTL
- **Accessibility Audit**
  - axe violations: 0 critical, 0 serious
- **Monitoring**
  - Sentry + basic Web Vitals reporting (LCP, FID, CLS)

---

## Acceptance Criteria Additions

- PWA offline works for practice sessions (read-only)
- Homepage matches wireframe layout components
- ES index populated and query API returns results
- i18n switch toggles languages; RTL renders correctly
- Keyboard shortcuts functional and documented
- a11y checks pass (WCAG 2.1 AA baseline)
