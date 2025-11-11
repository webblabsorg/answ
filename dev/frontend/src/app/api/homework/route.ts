import { NextResponse } from 'next/server'

// Minimal in-frontend API to replace mock data while backend endpoints are pending
// NOTE: Replace with real backend calls later and remove this route.

export async function GET() {
  const overdue = [
    {
      id: 'hw-1',
      subject: 'Math',
      title: 'Quadratic Equations Problem Set',
      due: 'Nov 8, 2025 11:59 PM (2 days ago)',
      status: 'Not Started',
      items: '10 problems',
      estimate: 'Est. 45 min',
    },
  ];

  const dueToday = [
    {
      id: 'hw-2',
      subject: 'English',
      title: 'Essay Draft: "To Kill a Mockingbird"',
      due: 'Today 11:59 PM',
      status: 'In Progress (60%)',
      note: 'Last saved: 2 hours ago',
    },
    {
      id: 'hw-3',
      subject: 'Physics',
      title: "Lab Report: Newton's Laws",
      due: 'Today 11:59 PM',
      status: 'Not Started',
      note: 'Requires: File upload (data sheets)',
    },
  ];

  const upcoming = [
    { when: 'Tomorrow', items: [{ id: 'hw-4', title: 'Chemistry - Balance Chemical Equations (15 problems)', meta: 'Due: Nov 12 • Not Started' }] },
    {
      when: 'This Week',
      items: [
        { id: 'hw-5', title: 'History - Primary Source Analysis', meta: 'Due: Nov 14 • 500-800 words' },
        { id: 'hw-6', title: 'SAT Math Practice Set 3', meta: 'Due: Nov 15 • 20 questions' },
      ],
    },
  ];

  const completed = [
    { id: 'hw-7', title: 'Biology - Cell Structure Quiz', meta: 'Submitted Nov 9 • Score: 92% (23/25) • View Feedback' },
    { id: 'hw-8', title: 'Algebra - Polynomial Functions', meta: 'Submitted Nov 8 • Score: 85% (17/20) • Review Mistakes' },
  ];

  const stats = [
    { label: 'Pending', value: 5 },
    { label: 'Due Today', value: 2 },
    { label: 'Completed', value: 12 },
    { label: 'Avg Score', value: '87%' },
  ];

  return NextResponse.json({ stats, overdue, dueToday, upcoming, completed });
}
