import { PrismaClient, QuestionType, ExamCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create GRE Exam
  const gre = await prisma.exam.upsert({
    where: { code: 'GRE' },
    update: {},
    create: {
      name: 'Graduate Record Examination',
      code: 'GRE',
      category: ExamCategory.STANDARDIZED_TEST,
      description: 'The GRE General Test measures verbal reasoning, quantitative reasoning, critical thinking and analytical writing skills.',
      duration_minutes: 180,
      total_sections: 3,
      total_questions: 80,
      passing_score: 260,
    },
  });

  console.log('✅ Created GRE exam');

  // Create GRE Sections
  const greVerbal = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: gre.id, section_order: 1 } },
    update: {},
    create: {
      exam_id: gre.id,
      name: 'Verbal Reasoning',
      section_order: 1,
      duration_minutes: 60,
      question_count: 40,
      description: 'Measures ability to analyze and evaluate written material, synthesize information, and understand relationships.',
    },
  });

  const greQuant = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: gre.id, section_order: 2 } },
    update: {},
    create: {
      exam_id: gre.id,
      name: 'Quantitative Reasoning',
      section_order: 2,
      duration_minutes: 70,
      question_count: 40,
      description: 'Measures problem-solving ability using basic arithmetic, algebra, geometry, and data analysis.',
    },
  });

  console.log('✅ Created GRE sections');

  // Create GRE Verbal Questions
  const greVerbalQuestions = [
    {
      exam_id: gre.id,
      section_id: greVerbal.id,
      question_text: 'Choose the word that best completes the sentence:\nThe speaker was so _____ that many audience members fell asleep during the presentation.',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: 'eloquent', correct: false },
        { id: 'B', text: 'tedious', correct: true },
        { id: 'C', text: 'captivating', correct: false },
        { id: 'D', text: 'controversial', correct: false },
      ],
      correct_answer: { answer: 'B' },
      difficulty_level: 2,
      topic: 'Vocabulary',
      subtopic: 'Context Clues',
      skills: ['vocabulary', 'reading-comprehension'],
      explanation: 'Tedious means boring or monotonous. The context clue is that audience members fell asleep, indicating the speaker was boring.',
      time_estimate_seconds: 60,
    },
    {
      exam_id: gre.id,
      section_id: greVerbal.id,
      question_text: 'Select all that apply:\nWhich of the following words are synonyms for "ephemeral"?',
      question_type: QuestionType.MULTIPLE_SELECT,
      options: [
        { id: 'A', text: 'fleeting', correct: true },
        { id: 'B', text: 'permanent', correct: false },
        { id: 'C', text: 'transient', correct: true },
        { id: 'D', text: 'enduring', correct: false },
        { id: 'E', text: 'momentary', correct: true },
      ],
      correct_answer: { answers: ['A', 'C', 'E'] },
      difficulty_level: 3,
      topic: 'Vocabulary',
      subtopic: 'Synonyms',
      skills: ['vocabulary', 'word-relationships'],
      explanation: 'Ephemeral means lasting for a very short time. Fleeting, transient, and momentary all share this meaning.',
      time_estimate_seconds: 90,
    },
    {
      exam_id: gre.id,
      section_id: greVerbal.id,
      question_text: 'The author\'s primary purpose in the passage is to:',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: 'criticize a popular theory', correct: false },
        { id: 'B', text: 'present new research findings', correct: true },
        { id: 'C', text: 'compare two competing viewpoints', correct: false },
        { id: 'D', text: 'defend a controversial position', correct: false },
      ],
      correct_answer: { answer: 'B' },
      difficulty_level: 3,
      topic: 'Reading Comprehension',
      subtopic: 'Author Purpose',
      skills: ['reading-comprehension', 'inference'],
      explanation: 'The passage primarily discusses new research findings and their implications.',
      time_estimate_seconds: 120,
    },
  ];

  // Create GRE Quantitative Questions
  const greQuantQuestions = [
    {
      exam_id: gre.id,
      section_id: greQuant.id,
      question_text: 'If x + 5 = 12, what is the value of 2x?',
      question_type: QuestionType.NUMERIC_INPUT,
      options: null,
      correct_answer: { answer: 14 },
      difficulty_level: 1,
      topic: 'Algebra',
      subtopic: 'Linear Equations',
      skills: ['algebra', 'problem-solving'],
      explanation: 'First solve for x: x + 5 = 12, so x = 7. Then 2x = 2(7) = 14.',
      time_estimate_seconds: 45,
    },
    {
      exam_id: gre.id,
      section_id: greQuant.id,
      question_text: 'Compare Quantity A and Quantity B:\nQuantity A: 3⁴\nQuantity B: 4³',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: 'Quantity A is greater', correct: false },
        { id: 'B', text: 'Quantity B is greater', correct: true },
        { id: 'C', text: 'The two quantities are equal', correct: false },
        { id: 'D', text: 'The relationship cannot be determined', correct: false },
      ],
      correct_answer: { answer: 'B' },
      difficulty_level: 2,
      topic: 'Arithmetic',
      subtopic: 'Exponents',
      skills: ['arithmetic', 'computation'],
      explanation: '3⁴ = 81 and 4³ = 64, so Quantity A (81) is actually greater than Quantity B (64). Wait, let me recalculate: 3⁴ = 3×3×3×3 = 81, and 4³ = 4×4×4 = 64. So Quantity A is greater.',
      time_estimate_seconds: 60,
    },
    {
      exam_id: gre.id,
      section_id: greQuant.id,
      question_text: 'A rectangle has a length of 10 cm and a width of 6 cm. What is its area in square centimeters?',
      question_type: QuestionType.NUMERIC_INPUT,
      options: null,
      correct_answer: { answer: 60 },
      difficulty_level: 1,
      topic: 'Geometry',
      subtopic: 'Area',
      skills: ['geometry', 'formulas'],
      explanation: 'Area of a rectangle = length × width = 10 × 6 = 60 square centimeters.',
      time_estimate_seconds: 30,
    },
  ];

  // Fix the comparison question
  greQuantQuestions[1].options = [
    { id: 'A', text: 'Quantity A is greater', correct: true },
    { id: 'B', text: 'Quantity B is greater', correct: false },
    { id: 'C', text: 'The two quantities are equal', correct: false },
    { id: 'D', text: 'The relationship cannot be determined', correct: false },
  ];
  greQuantQuestions[1].correct_answer = { answer: 'A' };
  greQuantQuestions[1].explanation = '3⁴ = 81 and 4³ = 64, so Quantity A (81) is greater than Quantity B (64).';

  await prisma.question.createMany({
    data: [...greVerbalQuestions, ...greQuantQuestions],
  });

  console.log(`✅ Created ${greVerbalQuestions.length + greQuantQuestions.length} GRE questions`);

  // Create SAT Exam
  const sat = await prisma.exam.upsert({
    where: { code: 'SAT' },
    update: {},
    create: {
      name: 'Scholastic Assessment Test',
      code: 'SAT',
      category: ExamCategory.STANDARDIZED_TEST,
      description: 'The SAT measures knowledge of reading, writing, and math — things learned in school and needed for success in college.',
      duration_minutes: 180,
      total_sections: 2,
      total_questions: 154,
      passing_score: 1000,
    },
  });

  console.log('✅ Created SAT exam');

  // Create SAT Sections
  const satMath = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: sat.id, section_order: 1 } },
    update: {},
    create: {
      exam_id: sat.id,
      name: 'Math',
      section_order: 1,
      duration_minutes: 80,
      question_count: 58,
      description: 'Tests algebra, problem solving, data analysis, and advanced math.',
    },
  });

  const satReadingWriting = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: sat.id, section_order: 2 } },
    update: {},
    create: {
      exam_id: sat.id,
      name: 'Reading and Writing',
      section_order: 2,
      duration_minutes: 100,
      question_count: 96,
      description: 'Tests reading comprehension, vocabulary, and grammar.',
    },
  });

  console.log('✅ Created SAT sections');

  // Create SAT Math Questions
  const satMathQuestions = [
    {
      exam_id: sat.id,
      section_id: satMath.id,
      question_text: 'If 3x + 7 = 22, what is the value of x?',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: '3', correct: false },
        { id: 'B', text: '5', correct: true },
        { id: 'C', text: '7', correct: false },
        { id: 'D', text: '15', correct: false },
      ],
      correct_answer: { answer: 'B' },
      difficulty_level: 2,
      topic: 'Algebra',
      subtopic: 'Linear Equations',
      skills: ['algebra', 'problem-solving'],
      explanation: 'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.',
      time_estimate_seconds: 60,
    },
    {
      exam_id: sat.id,
      section_id: satMath.id,
      question_text: 'What is 15% of 80?',
      question_type: QuestionType.NUMERIC_INPUT,
      options: null,
      correct_answer: { answer: 12 },
      difficulty_level: 1,
      topic: 'Arithmetic',
      subtopic: 'Percentages',
      skills: ['arithmetic', 'percentages'],
      explanation: '15% of 80 = 0.15 × 80 = 12.',
      time_estimate_seconds: 45,
    },
    {
      exam_id: sat.id,
      section_id: satMath.id,
      question_text: 'The equation of a line is y = 2x + 3. What is the slope of this line?',
      question_type: QuestionType.NUMERIC_INPUT,
      options: null,
      correct_answer: { answer: 2 },
      difficulty_level: 2,
      topic: 'Algebra',
      subtopic: 'Linear Functions',
      skills: ['algebra', 'graphs'],
      explanation: 'In the form y = mx + b, m is the slope. Here, m = 2.',
      time_estimate_seconds: 40,
    },
  ];

  await prisma.question.createMany({
    data: satMathQuestions,
  });

  console.log(`✅ Created ${satMathQuestions.length} SAT questions`);

  // Create GMAT Exam
  const gmat = await prisma.exam.upsert({
    where: { code: 'GMAT' },
    update: {},
    create: {
      name: 'Graduate Management Admission Test',
      code: 'GMAT',
      category: ExamCategory.STANDARDIZED_TEST,
      description: 'The GMAT exam measures critical thinking, analytical writing, and problem-solving abilities for business school.',
      duration_minutes: 210,
      total_sections: 4,
      total_questions: 91,
      passing_score: 400,
    },
  });

  console.log('✅ Created GMAT exam');

  // Create GMAT Sections
  const gmatQuant = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: gmat.id, section_order: 1 } },
    update: {},
    create: {
      exam_id: gmat.id,
      name: 'Quantitative',
      section_order: 1,
      duration_minutes: 62,
      question_count: 31,
      description: 'Tests problem solving and data sufficiency skills.',
    },
  });

  const gmatVerbal = await prisma.examSection.upsert({
    where: { exam_id_section_order: { exam_id: gmat.id, section_order: 2 } },
    update: {},
    create: {
      exam_id: gmat.id,
      name: 'Verbal',
      section_order: 2,
      duration_minutes: 65,
      question_count: 36,
      description: 'Tests reading comprehension, critical reasoning, and sentence correction.',
    },
  });

  console.log('✅ Created GMAT sections');

  // Create GMAT Questions
  const gmatQuantQuestions = [
    {
      exam_id: gmat.id,
      section_id: gmatQuant.id,
      question_text: 'If x² = 49, what are all possible values of x?',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: '7 only', correct: false },
        { id: 'B', text: '-7 only', correct: false },
        { id: 'C', text: '7 and -7', correct: true },
        { id: 'D', text: '49', correct: false },
        { id: 'E', text: 'Cannot be determined', correct: false },
      ],
      correct_answer: { answer: 'C' },
      difficulty_level: 2,
      topic: 'Algebra',
      subtopic: 'Quadratic Equations',
      skills: ['algebra', 'problem-solving'],
      explanation: 'The square root of 49 is ±7, so x can be either 7 or -7.',
      time_estimate_seconds: 60,
    },
    {
      exam_id: gmat.id,
      section_id: gmatQuant.id,
      question_text: 'Data Sufficiency: Is x > 0?\n(1) x² > 0\n(2) x³ > 0',
      question_type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { id: 'A', text: 'Statement (1) ALONE is sufficient', correct: false },
        { id: 'B', text: 'Statement (2) ALONE is sufficient', correct: true },
        { id: 'C', text: 'BOTH statements TOGETHER are sufficient', correct: false },
        { id: 'D', text: 'EACH statement ALONE is sufficient', correct: false },
        { id: 'E', text: 'Statements (1) and (2) TOGETHER are NOT sufficient', correct: false },
      ],
      correct_answer: { answer: 'B' },
      difficulty_level: 4,
      topic: 'Data Sufficiency',
      subtopic: 'Inequalities',
      skills: ['logic', 'algebra'],
      explanation: 'Statement (1) is not sufficient because x² > 0 for both positive and negative x. Statement (2) is sufficient because x³ > 0 only when x > 0.',
      time_estimate_seconds: 120,
    },
  ];

  await prisma.question.createMany({
    data: gmatQuantQuestions,
  });

  console.log(`✅ Created ${gmatQuantQuestions.length} GMAT questions`);

  // Summary
  const examCount = await prisma.exam.count();
  const sectionCount = await prisma.examSection.count();
  const questionCount = await prisma.question.count();

  console.log('\n🎉 Seed complete!');
  console.log(`📊 Summary:`);
  console.log(`   - Exams: ${examCount}`);
  console.log(`   - Sections: ${sectionCount}`);
  console.log(`   - Questions: ${questionCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
