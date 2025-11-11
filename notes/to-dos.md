# Answly platform growth and product to-dos

This document outlines improvements to make Answly the go-to academic platform for students, test-takers, teachers, schools, and related online use cases.

## 0) Product vision and principles
- Student outcomes first: measurable score gains, skill mastery, confidence.
- Trust + integrity: provenance, citations, anti-cheat tooling, auditability.
- Personalization at scale: adaptive study plans, IEP support, accessibility.
- Educator empowerment: authoring tools, grading workflows, analytics, LMS sync.
- Global-first: localization, currencies, compliance, offline/PWA where possible.

## 1) Core experiences
- Home dashboard
  - Quick resume (recent tests/chats), streaks, goals, daily tasks.
  - What’s new + tips tailored by exam + proficiency gaps.
- Exams
  - Full exam catalog with filters (region, subject, difficulty, paid/free).
  - Adaptive test modes: timed/full-length, section practice, topic drills.
  - Explanations with step-by-step, alternative methods, and source references.
  - Confidence tracking + error tagging (careless, concept gap, misread, time).
  - Accommodations: extended time, large print, dyslexia fonts, color contrast.
- AI Tutor
  - Multi-turn reasoning with citations and external references.
  - “Teach me like I’m 12”, “Socratic mode”, and “Exam proctor mode”.
  - Guided solutions that require student inputs at each step.
  - Safety rails (age-appropriate, anti-cheat, bias mitigations).
- Study Plans
  - Diagnostics → dynamic plan (calendar-based) with weekly adjustments.
  - SMART goals, skill ladders, and mastery targets; automatic rescheduling.
  - Integrations with calendars (Google, iCal) and reminders.

## 2) Tools (student productivity)
- New tools
  - Citation Generator (APA/MLA/Chicago), BibTeX export.
  - Plagiarism & originality checker (local heuristics + provider integration).
  - Flashcards (SRS), decks import/export (CSV, Anki).
  - Outline and Thesis Assistant (essay planner) with coherence scoring.
  - Note Summarizer (multi-doc), highlight-to-ask from PDFs.
  - File Conversion (PDF <-> DOCX/PPTX; images <-> PDF; batch; OCR).
  - Image Editors (crop/annotate/blur/OCR; math diagram canvas).
- Collaboration
  - Shared whiteboards; study rooms; tutor/TA presence.
  - Group projects with Kanban, milestones, peer reviews, rubrics.

## 3) Library and content
- Library
  - Bookmarks, highlights, collections; course packs by instructor/school.
  - Content hub per exam: syllabus, strategies, formula sheets, cheat sheets.
  - Public/community packs (moderated) with reputation signals.
- Content quality
  - Human-in-the-loop review queue; quality scores; version history.
  - Source attribution tools; embedded references; inline glossary.

## 4) Educator/Institution features
- Authoring suite
  - Question/item bank (Blooms taxonomy tagging, difficulty calibration).
  - Exam builder (blueprints, constraints, randomization, pools).
  - Rubrics and graders (LLM-assisted; human adjudication workflows).
- Classroom & LMS
  - Roster sync (Google Classroom, Clever, ClassLink, OneRoster).
  - Assignments; deadlines; plagiarism guard; proctoring options.
  - Gradebook export to SIS/LMS; CSV and APIs.
- Analytics
  - Cohort mastery, growth percentiles, RTI/MTSS dashboards.
  - Content performance analytics; A/B tests for items.

## 5) Growth, community, and marketplace
- Community
  - Leaderboards by exam/school/region; challenges; daily questions.
  - Study buddies matching (opt-in) with safety constraints.
- Marketplace
  - Tutor marketplace (verified, rated); lesson bundles, office hours.
  - Publisher marketplace for premium content packs.

## 6) Platform quality: a11y, intl, privacy, performance
- Accessibility (WCAG 2.2 AA)
  - Keyboard-first navigation across all dialogs/menus.
  - Focus management on modals, skip-to-content, visible focus rings.
  - Labels/aria for icons, headings structure, color contrast audits.
  - Screen reader transcripts for audio/video.
- Internationalization/localization
  - next-intl or next-i18next with locale-specific route segments.
  - Language packs; RTL support; pluralization rules.
  - Regional defaults (currency, date/time, number formatting).
- Privacy/compliance
  - FERPA/COPPA/GDPR posture; parental consent flows (K–12).
  - Data retention policies, export requests, audit logs.
- Performance
  - Edge caching for static assets; CDN; image optimization; code-splitting.
  - Offline/PWA enhancements for practice mode.

## 7) Payments/monetization
- Plans: Student, Family (multi-seat), Educator, School, District.
- Vouchers/coupons, institutional invoicing, purchase orders.
- PayPal/Stripe regional routing; local wallets (Pix, UPI, M-Pesa) roadmap.

## 8) Security & integrity
- Account security: SSO (Google, Microsoft), phone OTP, TOTP 2FA.
- Academic integrity: proctoring (camera/mic optional), IP/device checks.
- Model safety: content filters; re-ranking; provenance; watermarking.

## 9) Data and ML
- Telemetry for study behaviors (privacy-aware) → insights.
- Difficulty calibration using IRT; personalized sequencing.
- Recommendation engine: next-best-question/resource.

## 10) Admin/ops
- Admin console: feature flags, outages, billing, user impersonation (safe).
- Audit trails across critical actions; SIEM hooks.

---

# Implementation to-dos (prioritized)

1) A11y & i18n foundation
- Install next-intl; create locale switcher context; extract strings for top pages.
- Add keyboard support patterns to all interactive lists/menus.
- Fix remaining jsx-a11y warnings systematically (buttons/roles/labels).

2) Exams & study improvements
- Adaptive practice sessions with mastery model + diagnostics.
- Explanations revamp (multi-step, alternative methods, citations).
- “Error type” tagging and remediation suggestions.

3) Tools expansion (MVPs)
- File Conversion and Image Editors back-end integration (serverless workers).
- Citation generator and Flashcards (import/export + SRS scheduling).
- Outline/Thesis assistant + plagiarism checker integration.

4) Educator features
- Item bank + exam builder; rubric grader; assignment workflows.
- LMS integrations (Google Classroom first), then SIS via OneRoster.

5) Growth/community
- Leaderboards; daily challenges; community packs (moderated).
- Tutor marketplace pilot (application + verification flow).

6) Payments
- Family/Educator/School plans; coupons + invoicing.
- Regional payment methods roadmap.

7) Security & integrity
- Microsoft SSO (MSAL), phone OTP, optional 2FA.
- Light proctoring options for practice mode.

8) Analytics
- Student dashboard with mastery progress; educator cohort insights.

Dependencies
- Content pipelines (review queue), currency service, exams endpoints, auth SSO providers, storage (file uploads), and worker queues for conversions.

Risks/mitigations
- Cheating/integrity → proctoring, watermarking, randomization.
- Privacy/compliance → enforce data policies and minimization.
- Quality drift → human-in-the-loop content review and analytics.
