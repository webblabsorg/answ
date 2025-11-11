Admin Dashboard
APIs
Backend setup - Railway



are phases 1 and 2 thoroughly done? Are they approriately linked to the homepage and dashboard? Each of the menu items in
   the sidebar  when clicked should open it's page in the center of the page? Is that done?

1. Add Library and Projects under Tools. These are two different menu items. Sure to add icons in front of each and down arrow to open it and show it's sub menu items. Library will integrated educational apps the user can add to dashboard. You can suggest some of these apps. The Projects will be homeworks, essays, thesis, project works, etc. Reduce the font size to H5 for all the content in the sidebar

2.  Move the Chat menu item under Projects. Add Recent chats to show history of chats. Reduce the font size of all the menu items and content in the sidebar to H5. Let's have 4 recent chats.

3.The 'recent chats'  should have a scrollable feature to scroll downward and first previous chats. There should be three
   horizontal dots, when clicked open a small modal popup menu box with the option to Share, Rename, Archive, and Delete.
   Each of these options should have an icon in front of it and the 'Delete' text option should be in red color.

3.   Update the github with the updates.

Please keep all doc files in the notes/ folder.

------

verify and validate the outcome below. Ensure All the features implemented are production-ready and fully functional on the homepage, dashboard, etc. No demos and simulations. Identify any mismatches, issues, etc if any.

---------

review phase4-spec-parity in the notes\phases\addenda\ folder and implement it

----------

Here’s an **enhanced and structured prompt** version of your instruction for **Claude Code**, making it clearer, goal-driven, and aligned with documentation and UI/UX generation standards:

---

Review the **Projects → Homework** menu item in the sidebar of the homepage, and propose a detailed **layout, structure, and feature set** for the **Homework page or section**.

Your proposal should include:

* A **page layout description** (sections, components, and user flow).
* A list of **core and advanced features** specific to Homework management, submission, and tracking.
* Integration ideas with existing Answly components (e.g., Projects, Exams, Notes).
* **User roles** (student, teacher, school, and admin) and what each can do within this section.
* Any **AI-powered or automation features** that can enhance user experience (e.g., homework auto-grading, plagiarism detection, feedback generation).
* Comparison and inspiration drawn from **competitors** (refer to the *competitors-take* file).
* Clear **UI/UX guidelines** aligned with the platform’s overall design system.

Ensure the concept aligns with:

* The **platform scope and goals** (Answly.com is the go-to academic platform for students, test-takers, teachers, schools, and related online use cases).
* The **to-dos file** in the `notes/` folder for current development priorities.

Finally, **save your generated document** as:

```
notes/essay-page-spec.md

-------

Got it — here’s the **refined and enhanced prompt** for **Claude Code**, this time focused on the **Projects → Essay** menu item:

---
Review the **Projects → Essay** menu item in the sidebar of the homepage, and propose a comprehensive **layout, feature set, and user experience design** for the **Essay page or section**.

Your deliverable should include:

### 1. Layout & Structure

* Detailed breakdown of the **Essay page layout** (main sections, subsections, and sidebar components).
* Suggested **UI elements** (editor, upload fields, rubric view, feedback panel, progress bar, etc.).
* **Navigation flow** between related sections like Projects, Homework, Notes, and Exams.

### 2. Core & Advanced Features

* Essay creation, editing, saving, and submission tools.
* AI-assisted writing (outline generation, grammar and tone enhancement, content expansion).
* Feedback and grading system for teachers and peers.
* Plagiarism detection, citation assistance, and readability scoring.
* Support for different essay formats (argumentative, narrative, analytical, academic research).
* Version control and draft history.

### 3. User Roles & Permissions

* **Students:** create, edit, submit, and track essay progress.
* **Teachers:** review, comment, grade, and provide structured feedback.
* **Schools/Admins:** manage essay templates, evaluation rubrics, and track analytics.

### 4. AI & Automation

* Smart topic suggestions based on syllabus or previous work.
* AI grading assistant for draft evaluation.
* Personalized writing improvement tips using NLP.
* Citation generator (APA, MLA, etc.) and plagiarism summary.

### 5. Competitor Insights

* Review and incorporate ideas from the **competitors-take** file (essay platforms, AI writing tools, academic project systems).
* Highlight **unique differentiators** that will make Answly’s Essay module the most advanced and student-friendly.

### 6. Alignment & Integration

* Ensure all suggestions align with the **scope and objectives** of Answly.com — the go-to academic platform for students, test-takers, teachers, and schools.
* Integrate recommendations with current goals in the **to-dos** file located in the `notes/` folder.

### 7. Output

Save your detailed specification document as:

```
notes/essay-page-spec.md
```

------------------------

Review the **Projects → Deep Research** menu item in the sidebar of the homepage, and design a comprehensive **layout, feature set, and interactive experience** for the **Deep Research** page or section.

This section should model **Consensus AI’s research interface**, integrating chat-based exploration, document summarization, and academic insight generation — tailored for **Answly.com**, the go-to academic platform for students, test-takers, teachers, and schools.

---

### 1. Layout & Structure

Design a clear, modern research workspace that includes:

* **Left Panel / Sidebar:** query history, saved research threads, and topic filters (subject, difficulty, date range).
* **Main Area:**

  * **Chat interface** (AI research assistant that responds with cited academic insights).
  * **Context viewer** showing linked references, abstracts, and key findings.
  * **Summaries panel** that aggregates AI-written overviews of research results.
* **Right Sidebar (optional):** citation generator, export options (PDF, DOCX), and reference management tools.
* Responsive layout optimized for both desktop and mobile research experiences.

---

### 2. Core Features

* **AI Chatbot for Research Queries:**
  Users can ask complex research questions and receive summarized, referenced answers using AI.
* **Source Transparency:**
  Each AI response should display inline citations with expandable links to verified sources.
* **Advanced Search Filters:**
  Filter by publication type, date, topic, and source credibility.
* **Multi-document Analysis:**
  Upload or link to PDFs; the AI reads and synthesizes findings across documents.
* **Summarization Modes:**

  * “Academic Summary” — for formal reports.
  * “Quick Insights” — for fast reading.
  * “Critical Review” — for bias and methodology assessment.
* **Export & Collaboration:**
  Save research sessions, export results, or share projects with peers or instructors.

---

### 3. Advanced / AI-Powered Capabilities

* **Conversational AI Research Assistant:** contextual memory, citation tracking, and source clustering.
* **Paper Comparison Tool:** compares findings from multiple sources to find consensus or contradiction.
* **AI-driven Question Refinement:** suggests smarter search queries for more accurate literature discovery.
* **Research Trend Visualization:** simple charts summarizing data frequency or recurring keywords.
* **Citation Builder:** automatic formatting (APA, MLA, Chicago).

---

### 4. User Roles

* **Students:** ask research questions, explore summaries, and save insights.
* **Teachers/Researchers:** verify sources, add annotations, and review summaries.
* **Admins:** manage research API integrations, citation rules, and moderation tools.

---

### 5. Integration & Alignment

* Must align with the **Answly.com** academic ecosystem — linking seamlessly with **Projects**, **Notes**, and **Essay** tools.
* Integrate with priorities listed in the **to-dos** file in the `notes/` folder.
* Reference the **competitors-take** file to extract inspiration from Consensus AI, Elicit, Scite, and ScholarAI.

---

### 6. Deliverable

Generate and save the finalized document as:

```
notes/deep-research-spec.md
```

The file should include:

* Page layout diagram (in text/wireframe format).
* Detailed feature breakdowns.
* Suggested data flow and API integration notes.
* Example user journeys (e.g., “student asks a research question and refines the answer”).

---

--------------------------

