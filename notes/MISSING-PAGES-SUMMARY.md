# Answly - Missing Pages Summary

This document lists all sidebar menu items that need corresponding pages created.

---

## Overview

Based on the sidebar menu structure (`CollapsibleSidebar.tsx` and `AppSidebar.tsx`), the following pages need to be created:

**Total Missing Pages:** 9
- Tools: 2 pages
- Library: 4 pages
- Projects: 3 pages

---

## 1. Tools Section

### 1.1 Grammar Checker
**Path:** `/tools/grammar`  
**Status:** ❌ Missing  
**Priority:** Medium  

**Features to Implement:**
- Grammar and spelling checker
- Style suggestions
- Readability analysis
- Tone detection
- Export corrected text
- Integration with essays

**Tech Stack:**
- Frontend: Text editor with highlighting
- Backend: LanguageTool API or Grammarly API
- AI: OpenAI for advanced suggestions

**Estimated Time:** 1-2 weeks

---

### 1.2 Calculators
**Path:** `/tools/calculators`  
**Status:** ❌ Missing  
**Priority:** Medium  

**Features to Implement:**
- Scientific calculator
- Graphing calculator
- Statistics calculator
- GPA calculator
- Loan/finance calculator
- Unit converter
- Formula reference sheets

**Tech Stack:**
- Frontend: React calculator components
- Libraries: Math.js, Chart.js (for graphing)

**Estimated Time:** 1 week

---

## 2. Library Section

### 2.1 Flashcards
**Path:** `/library/flashcards`  
**Status:** ❌ Missing  
**Priority:** High  

**Features to Implement:**
- Create flashcard decks
- Spaced repetition system (SRS)
- Study mode with flip animation
- Import/export (Anki format, CSV)
- AI-generated flashcards from notes
- Progress tracking
- Review schedule

**Tech Stack:**
- Frontend: React card components with animations
- Backend: Flashcard CRUD API
- Algorithm: SM-2 spaced repetition
- Database: Flashcard and Review tables

**Estimated Time:** 2-3 weeks

---

### 2.2 Vocabulary Builder
**Path:** `/library/vocabulary`  
**Status:** ❌ Missing  
**Priority:** High  

**Features to Implement:**
- Word lists by exam type (GRE, SAT, TOEFL)
- Word definitions, synonyms, antonyms
- Example sentences
- Audio pronunciation
- Quizzes and games
- Personal word lists
- Progress tracking

**Tech Stack:**
- Frontend: Word cards, quiz components
- Backend: Vocabulary API (Oxford, Merriam-Webster)
- Database: Word lists, user progress

**Estimated Time:** 2 weeks

---

### 2.3 Formula Sheets
**Path:** `/library/formulas`  
**Status:** ❌ Missing  
**Priority:** Medium  

**Features to Implement:**
- Formula sheets by subject (Math, Physics, Chemistry)
- Search and filter formulas
- Copy to clipboard
- Print/export as PDF
- Favorites/bookmarks
- Interactive formula calculator

**Tech Stack:**
- Frontend: Formula display with LaTeX (KaTeX)
- Backend: Formula database
- Libraries: React-KaTeX for math rendering

**Estimated Time:** 1 week

---

### 2.4 Note Taker
**Path:** `/library/notes`  
**Status:** ❌ Missing  
**Priority:** Medium  

**Features to Implement:**
- Rich text editor (Markdown support)
- Create, edit, delete notes
- Organize by folders/tags
- Search notes
- Attach to questions or exams
- Export as PDF/Markdown
- Sync across devices

**Tech Stack:**
- Frontend: Rich text editor (Tiptap, Slate, or Quill)
- Backend: Notes CRUD API
- Database: Notes table

**Estimated Time:** 1-2 weeks

---

## 3. Projects Section

### 3.1 Homeworks
**Path:** `/projects/homeworks`  
**Status:** ❌ Missing  
**Priority:** Medium  

**Features to Implement:**
- Create homework assignments
- Due dates and reminders
- File uploads (PDFs, images)
- Submission status tracking
- AI help for homework questions
- Collaboration (optional)

**Tech Stack:**
- Frontend: Assignment list, detail pages
- Backend: Homework CRUD API
- Storage: AWS S3 or Cloudinary for file uploads

**Estimated Time:** 1-2 weeks

---

### 3.2 Essays
**Path:** `/projects/essays`  
**Status:** ❌ Missing (Different from `/admin/essays`)  
**Priority:** High  

**Features to Implement:**
- Essay editor (rich text)
- AI writing assistant
- Grammar and style checker
- Outline generator
- Citation management
- Version history
- AI grading and feedback
- Export as PDF/DOCX

**Tech Stack:**
- Frontend: Rich text editor (Tiptap)
- Backend: Essay CRUD API, AI integration
- AI: OpenAI for suggestions and grading

**Estimated Time:** 2-3 weeks

---

### 3.3 Deep Research
**Path:** `/projects/research`  
**Status:** ❌ Missing  
**Priority:** Low  

**Features to Implement:**
- Research project management
- Source collection (URLs, PDFs)
- AI-powered research assistant
- Summarization of sources
- Citation generation
- Outline and draft creation
- Collaboration tools

**Tech Stack:**
- Frontend: Project dashboard, source manager
- Backend: Research project API
- AI: RAG for source analysis
- Storage: File uploads for PDFs

**Estimated Time:** 3-4 weeks

---

## Implementation Priority

### Phase 1: High Priority (Critical for User Engagement)
1. ✅ **Flashcards** - Popular study tool
2. ✅ **Vocabulary Builder** - Essential for test prep
3. ✅ **Essays** - Writing is core to many exams

**Timeline:** 4-6 weeks

---

### Phase 2: Medium Priority (Enhanced Features)
4. ✅ **Grammar Checker** - Supports essay writing
5. ✅ **Calculators** - Useful for math sections
6. ✅ **Note Taker** - Study organization
7. ✅ **Homeworks** - Student workflow

**Timeline:** 3-4 weeks

---

### Phase 3: Low Priority (Advanced Features)
8. ✅ **Formula Sheets** - Reference tool
9. ✅ **Deep Research** - Advanced project management

**Timeline:** 2-3 weeks

---

## Development Approach

### Step 1: Database Schema Updates

Create new tables in `prisma/schema.prisma`:

```prisma
// Flashcards
model Flashcard {
  id          String   @id @default(cuid())
  user_id     String
  deck_id     String
  front       String   @db.Text
  back        String   @db.Text
  created_at  DateTime @default(now())
  user        User     @relation(fields: [user_id], references: [id])
  deck        Deck     @relation(fields: [deck_id], references: [id])
}

model Deck {
  id          String      @id @default(cuid())
  user_id     String
  name        String
  description String?
  flashcards  Flashcard[]
  user        User        @relation(fields: [user_id], references: [id])
}

// Vocabulary
model VocabularyWord {
  id          String   @id @default(cuid())
  word        String
  definition  String   @db.Text
  example     String?  @db.Text
  synonyms    String[]
  antonyms    String[]
}

model UserVocabulary {
  id          String   @id @default(cuid())
  user_id     String
  word_id     String
  learned     Boolean  @default(false)
  user        User     @relation(fields: [user_id], references: [id])
}

// Notes
model Note {
  id          String   @id @default(cuid())
  user_id     String
  title       String
  content     String   @db.Text
  tags        String[]
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  user        User     @relation(fields: [user_id], references: [id])
}

// Homeworks
model Homework {
  id          String   @id @default(cuid())
  user_id     String
  title       String
  description String?  @db.Text
  due_date    DateTime
  status      String   @default("pending")
  files       Json?
  user        User     @relation(fields: [user_id], references: [id])
}

// Essays
model Essay {
  id          String   @id @default(cuid())
  user_id     String
  title       String
  content     String   @db.Text
  outline     String?  @db.Text
  grade       Float?
  feedback    String?  @db.Text
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  user        User     @relation(fields: [user_id], references: [id])
}
```

### Step 2: Backend API Development

For each feature, create:
- NestJS module
- Service (business logic)
- Controller (endpoints)
- DTOs (validation)

**Example structure:**
```
src/
├── flashcards/
│   ├── flashcards.module.ts
│   ├── flashcards.service.ts
│   ├── flashcards.controller.ts
│   └── dto/
│       ├── create-flashcard.dto.ts
│       └── update-flashcard.dto.ts
```

### Step 3: Frontend Page Development

For each page, create:
- Next.js page component
- API client functions
- UI components
- State management (React Query)

**Example structure:**
```
src/app/
├── library/
│   └── flashcards/
│       ├── page.tsx
│       ├── [id]/
│       │   └── page.tsx
│       └── components/
│           ├── FlashcardDeck.tsx
│           ├── StudyMode.tsx
│           └── CreateDeck.tsx
```

---

## Resource Estimates

### Development Time (Solo Developer)
- **Phase 1:** 4-6 weeks (Flashcards, Vocabulary, Essays)
- **Phase 2:** 3-4 weeks (Grammar, Calculators, Notes, Homeworks)
- **Phase 3:** 2-3 weeks (Formula Sheets, Deep Research)

**Total:** 9-13 weeks (~3 months)

### Team of 3 Developers
- **Phase 1:** 2-3 weeks
- **Phase 2:** 1-2 weeks
- **Phase 3:** 1 week

**Total:** 4-6 weeks (~1.5 months)

---

## Technical Dependencies

### Third-Party APIs/Services
- **Grammar:** LanguageTool API (free tier available)
- **Vocabulary:** Oxford Dictionary API or Merriam-Webster API
- **File Storage:** AWS S3, Cloudinary, or Vercel Blob Storage
- **PDF Generation:** jsPDF or Puppeteer
- **Audio:** Web Speech API or ElevenLabs API

### NPM Packages
```json
{
  "tiptap": "^2.x", // Rich text editor
  "katex": "^0.16", // Math formulas
  "react-katex": "^3.x",
  "mathjs": "^12.x", // Calculator math
  "chart.js": "^4.x", // Graphing
  "jspdf": "^2.x", // PDF export
  "file-saver": "^2.x" // File downloads
}
```

---

## Testing Requirements

For each new page:
- [ ] Unit tests for backend services
- [ ] E2E tests for frontend flows
- [ ] API endpoint tests
- [ ] Accessibility tests (WCAG 2.2 AA)
- [ ] Mobile responsiveness
- [ ] Performance testing (Lighthouse)

---

## Documentation Needed

For each feature:
- [ ] API endpoint documentation (Swagger)
- [ ] User guide (how to use)
- [ ] Developer documentation (architecture)
- [ ] Database schema documentation

---

## Next Steps

1. ✅ **Complete Authentication Testing** (follow `AUTHENTICATION-SETUP-GUIDE.md`)
2. ✅ **Deploy Backend to Render** (follow `RENDER-DEPLOYMENT-GUIDE.md`)
3. ✅ **Choose Feature Priority** (recommend Phase 1 first)
4. 🚀 **Start Building!**

**Recommended Start:** Flashcards (most requested feature, clear scope)

---

## Questions to Answer Before Building

1. **Which feature should we build first?**
   - Recommendation: Flashcards (high demand, clear value)

2. **Do we need all features for MVP launch?**
   - Recommendation: Start with Phase 1 (3 features), launch, then iterate

3. **Should we use third-party services or build in-house?**
   - Grammar: Use LanguageTool API (faster)
   - Vocabulary: Use dictionary API (data already exists)
   - File storage: Use Vercel Blob or AWS S3 (reliable)

4. **What's the budget for third-party services?**
   - LanguageTool: Free tier (20 requests/min)
   - Dictionary APIs: Free with attribution
   - File storage: ~$5-20/month

---

**Total Missing Features:** 9 pages  
**Estimated Time:** 3 months (solo) or 1.5 months (team of 3)  
**Recommended Priority:** Phase 1 → Phase 2 → Phase 3

Ready to start building! 🚀
