# Answly Admin Guide

This guide covers administrative functions for managing the Answly platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Management](#user-management)
3. [Question Management](#question-management)
4. [Bulk Import](#bulk-import)
5. [Essay Review](#essay-review)
6. [Audit Logs](#audit-logs)
7. [Best Practices](#best-practices)

---

## Getting Started

### Accessing the Admin Panel

1. Log in with an admin account
2. Navigate to `/admin` in your browser
3. You'll see the admin dashboard with navigation sidebar

### Admin Dashboard

The dashboard shows:
- **Total Users:** Number of registered users
- **Active Users:** Currently active users
- **Total Questions:** Questions in the database
- **Unreviewed Essays:** Essays waiting for manual grading

Quick action links:
- Manage Questions
- Import Questions
- Review Essays

---

## User Management

Access: **Admin > Users**

### Viewing Users

The users page displays all registered users with:
- Name and email
- Current role
- Subscription tier
- Account status (Active/Suspended)
- Join date

### Searching and Filtering

**Search:**
- Type in the search box to find users by name or email
- Search is case-insensitive

**Filter by Role:**
- All Roles
- Test Taker
- Instructor
- Reviewer
- Admin

### Updating User Roles

1. Find the user in the list
2. Click the role dropdown
3. Select new role:
   - **TEST_TAKER:** Regular user
   - **INSTRUCTOR:** Can create/edit questions
   - **REVIEWER:** Can grade essays
   - **ADMIN:** Full administrative access
4. Role updates automatically

### Suspending Users

1. Find the user in the list
2. Click "Suspend" button
3. Confirm the action
4. User will be unable to log in

### Activating Users

1. Find a suspended user
2. Click "Activate" button
3. User can log in again

---

## Question Management

Access: **Admin > Questions**

### Viewing Questions

The questions page shows all questions with:
- Exam code (e.g., GRE, SAT)
- Question type
- Difficulty level (1-5)
- Question text (truncated)
- Topic
- Edit and delete actions

### Creating Questions

**Manual Creation:**
1. Click "New Question"
2. Fill in the form:
   - **Exam:** Select exam
   - **Question Text:** Enter the question
   - **Type:** Choose question type
   - **Options:** Add answer choices (if applicable)
   - **Correct Answer:** Mark/enter correct answer
   - **Topic:** Enter topic/subject
   - **Difficulty:** Select 1-5
   - **Explanation:** Add detailed explanation
3. Click "Save"

### Editing Questions

1. Click the edit icon next to a question
2. Update any field
3. Click "Save Changes"
4. Changes are logged in audit trail

### Deleting Questions

1. Click the delete icon
2. Confirm deletion
3. Question is permanently removed
4. Action is logged

⚠️ **Warning:** Deleted questions cannot be recovered!

---

## Bulk Import

Access: **Admin > Bulk Import**

### Preparing Your Data

**JSON Format:**
```json
{
  "questions": [
    {
      "exam_code": "GRE",
      "question_text": "What is 2 + 2?",
      "question_type": "MULTIPLE_CHOICE",
      "options": [
        {"id": "A", "text": "3", "correct": false},
        {"id": "B", "text": "4", "correct": true},
        {"id": "C", "text": "5", "correct": false},
        {"id": "D", "text": "6", "correct": false}
      ],
      "correct_answer": {"answer": "B"},
      "topic": "Mathematics",
      "difficulty_level": 2,
      "explanation": "2 + 2 equals 4."
    }
  ]
}
```

### Required Fields

- `exam_code` - Exam code (e.g., "GRE", "SAT", "GMAT")
- `question_text` - The question text
- `question_type` - One of: MULTIPLE_CHOICE, MULTIPLE_SELECT, NUMERIC_INPUT, TEXT_INPUT, ESSAY, TRUE_FALSE
- `correct_answer` - Correct answer in appropriate format
- `topic` - Topic/subject area

### Optional Fields

- `options` - Answer choices (for MCQ/MSQ)
- `difficulty_level` - 1-5 (default: 3)
- `explanation` - Detailed explanation
- `subtopic` - More specific topic

### Importing Questions

1. Prepare your JSON file
2. Copy the JSON content
3. Paste into the textarea
4. Click "Import Questions"
5. Review the results

### Import Results

The results panel shows:
- **Total:** Number of questions attempted
- **Success:** Successfully imported
- **Failed:** Failed to import
- **Errors:** Detailed error messages with line numbers

### Loading Example

Click "Load Example" to see a correctly formatted sample.

### Troubleshooting Imports

**Common Errors:**

1. **"Exam with code 'XXX' not found"**
   - Solution: Use valid exam code (GRE, SAT, GMAT)

2. **"Invalid JSON format"**
   - Solution: Validate your JSON syntax

3. **"Missing required field"**
   - Solution: Ensure all required fields are present

4. **"Invalid question type"**
   - Solution: Use one of the valid question types

---

## Essay Review

Access: **Admin > Essay Review**

### Reviewing Essays

The essay review page shows two panels:
- **Left:** List of unreviewed essays
- **Right:** Review form

### Essay List

Each essay shows:
- Topic badge
- Student name
- Question text (truncated)
- Submission date

Click an essay to review it.

### Grading an Essay

1. Select an essay from the list
2. Review the question
3. Read the student's answer
4. Enter a score (0-100)
5. Optionally add feedback
6. Click "Submit Grade"

**Grading Guidelines:**
- **90-100:** Excellent response
- **80-89:** Good response with minor issues
- **70-79:** Satisfactory response
- **60-69:** Below expectations
- **0-59:** Needs significant improvement

**Feedback Tips:**
- Be specific and constructive
- Highlight strengths
- Point out areas for improvement
- Provide examples when possible

### After Grading

- Essay is removed from the queue
- Student can view score and feedback
- Grade is reflected in test results

---

## Audit Logs

Access: **Admin > Audit Logs**

### Viewing Logs

The audit logs page shows all administrative actions with:
- **Action:** Type of action performed
- **Entity Type:** What was affected (User, Question, etc.)
- **User:** Admin who performed the action
- **Timestamp:** When it occurred
- **Changes:** Detailed changes (JSON)

### Action Types

Common actions logged:
- `CREATE_QUESTION` - Question created
- `UPDATE_QUESTION` - Question modified
- `DELETE_QUESTION` - Question deleted
- `UPDATE_USER_ROLE` - User role changed
- `SUSPEND_USER` - User suspended
- `ACTIVATE_USER` - User activated
- `BULK_IMPORT_QUESTIONS` - Questions imported
- `GRADE_ESSAY` - Essay graded

### Understanding Changes

The changes field shows before/after values:
```json
{
  "old_role": "TEST_TAKER",
  "new_role": "INSTRUCTOR"
}
```

### Audit Trail Benefits

- **Accountability:** Track who made what changes
- **Debugging:** Investigate issues
- **Compliance:** Maintain records
- **Security:** Detect unauthorized actions

---

## Best Practices

### Content Management

**Question Quality:**
- ✅ Write clear, unambiguous questions
- ✅ Provide detailed explanations
- ✅ Include realistic distractors (wrong answers)
- ✅ Review for accuracy before publishing
- ✅ Test questions yourself

**Topic Organization:**
- Use consistent topic naming
- Organize by difficulty
- Balance question distribution
- Update regularly

### User Management

**Role Assignment:**
- Give minimum necessary permissions
- Review admin list regularly
- Document role changes
- Use REVIEWER role for essay graders

**Account Moderation:**
- Investigate before suspending
- Document suspension reasons
- Communicate with users when appropriate
- Review suspended accounts periodically

### Essay Grading

**Consistency:**
- Use a rubric
- Grade similar essays back-to-back
- Calibrate with other reviewers
- Provide detailed feedback

**Efficiency:**
- Set aside dedicated grading time
- Use keyboard shortcuts
- Batch similar topics
- Take breaks to maintain focus

### Security

**Account Security:**
- Use strong passwords
- Don't share admin credentials
- Log out when finished
- Review audit logs regularly

**Data Protection:**
- Don't export user data unnecessarily
- Follow privacy regulations
- Report security issues immediately
- Keep software updated

### Bulk Operations

**Before Importing:**
- Validate data format
- Start with small batches
- Review example carefully
- Keep backup of source data

**After Importing:**
- Review success/failure counts
- Spot-check imported questions
- Fix errors and re-import
- Update documentation

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Search | `/` |
| Navigate Users | `Ctrl + U` |
| Navigate Questions | `Ctrl + Q` |
| Navigate Import | `Ctrl + I` |
| Refresh Page | `F5` |

---

## API Access

Admins can also use the API directly:

**Base URL:** `http://localhost:4000`  
**Documentation:** `http://localhost:4000/api`

**Authentication:**
Include Bearer token in requests:
```
Authorization: Bearer <your-token>
```

---

## Troubleshooting

### Can't access admin panel

- Verify your account has ADMIN or INSTRUCTOR role
- Try logging out and back in
- Clear browser cache
- Check with system administrator

### Bulk import failing

- Validate JSON syntax
- Check exam codes exist
- Review error messages
- Try smaller batches
- Contact support with error details

### Changes not appearing

- Refresh the page
- Clear cache
- Check audit logs
- Verify action was successful

---

## Support

For admin-related issues:
- Email: admin-support@answly.com
- Documentation: Check API docs at `/api`
- Emergency: Contact system administrator

---

## Changelog

### Version 1.0
- Initial admin panel release
- User management
- Question CRUD
- Bulk import
- Essay review
- Audit logging

---

**Remember:** With great power comes great responsibility. Always double-check before making changes that affect users or content.
