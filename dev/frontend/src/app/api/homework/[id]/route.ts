import { NextResponse } from 'next/server'

const DETAILS: Record<string, any> = {
  'hw-1': {
    subject: 'Math',
    title: 'Quadratic Equations Problem Set',
    due: 'Nov 8, 2025 11:59 PM (2 days ago)',
    status: 'Not Started',
    instructions:
      'Solve all problems showing work. Include factoring and quadratic formula methods where appropriate.',
    requirements: [
      'Show work for each step',
      'Check solutions',
      'Label all answers clearly',
    ],
  },
  'hw-2': {
    subject: 'English',
    title: 'Essay Draft: "To Kill a Mockingbird"',
    due: 'Today 11:59 PM',
    status: 'In Progress (60%)',
    instructions:
      'Write a 1000-1500 word essay analyzing the theme of racial injustice focusing on Atticus Finch and Tom Robinson.',
    requirements: [
      'Thesis statement',
      '3-5 body paragraphs with evidence',
      'Minimum 5 quotes',
      'MLA format with Works Cited',
      'Original analysis (plagiarism check enabled)',
    ],
  },
  'hw-3': {
    subject: 'Physics',
    title: "Lab Report: Newton's Laws",
    due: 'Today 11:59 PM',
    status: 'Not Started',
    instructions:
      'Prepare a lab report covering Newton\'s three laws; include methodology, results, and analysis.',
    requirements: [
      'Upload data sheets',
      'Graphs embedded',
      'Discussion and conclusion',
    ],
  },
};

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = ctx.params.id;
  const detail = DETAILS[id] || null;
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = {
    id,
    ...detail,
    autosave: { enabled: true, lastSaved: '2 hours ago' },
    attachments: [
      { name: 'Essay Rubric.pdf', size: 125_000 },
      { name: 'MLA Format Guide.pdf', size: 89_000 },
    ],
    history: [
      { at: 'Nov 10, 3:45 PM', note: 'Draft saved (620 words)' },
      { at: 'Nov 10, 1:22 PM', note: 'Draft saved (450 words)' },
      { at: 'Nov 9, 6:00 PM', note: 'Started' },
    ],
  };

  return NextResponse.json(payload);
}
