import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PromptVariables {
  [key: string]: string | number | any;
}

@Injectable()
export class PromptTemplateService {
  constructor(private prisma: PrismaService) {}

  async getTemplate(name: string, version?: string): Promise<string> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: {
        name,
        version: version || undefined,
        is_active: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!template) {
      throw new Error(`Template ${name} not found`);
    }

    return template.content;
  }

  async render(templateName: string, variables: PromptVariables, version?: string): Promise<string> {
    const template = await this.getTemplate(templateName, version);
    return this.interpolate(template, variables);
  }

  private interpolate(template: string, variables: PromptVariables): string {
    let result = template;
    
    // Replace {variable} with values
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      let replacement: string;
      
      if (typeof value === 'object') {
        replacement = JSON.stringify(value, null, 2);
      } else {
        replacement = String(value);
      }
      
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return result;
  }

  async createTemplate(data: {
    name: string;
    version: string;
    content: string;
    description?: string;
    task_type: string;
  }) {
    // Deactivate old versions
    await this.prisma.promptTemplate.updateMany({
      where: { name: data.name },
      data: { is_active: false },
    });

    // Create new version
    return this.prisma.promptTemplate.create({
      data: {
        ...data,
        is_active: true,
      },
    });
  }

  async getFewShotExamples(examCode: string, topic: string, count = 5) {
    return this.prisma.question.findMany({
      where: {
        exam: { code: examCode },
        topic,
        // Only high-quality questions if quality score exists
        ...(await this.prisma.question.count({ where: { NOT: { quality_score: null } } }) > 0
          ? { quality_score: { gte: 0.8 } }
          : {}),
      },
      take: count,
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}

// Predefined prompt templates
export const PROMPT_TEMPLATES = {
  GRE_TEXT_COMPLETION: {
    name: 'gre_text_completion',
    version: '1.0',
    task_type: 'question_generation',
    content: `You are an expert GRE test creator. Generate a challenging Text Completion question.

REQUIREMENTS:
- Difficulty: {difficulty}/5
- Topic: {topic}
- Format: {blank_count}-blank sentence
- Vocabulary level: Graduate-level

STRUCTURE:
- Sentence: 25-35 words
- Test vocabulary in context
- Plausible distractors that test understanding

OUTPUT JSON:
{
  "question_text": "The scientist's lecture was so _____(i)_____ that even experts in the field found it difficult to follow.",
  "question_type": "MULTIPLE_CHOICE",
  "options": [
    {"id": "A", "text": "lucid", "correct": false},
    {"id": "B", "text": "abstruse", "correct": true},
    {"id": "C", "text": "eloquent", "correct": false},
    {"id": "D", "text": "verbose", "correct": false},
    {"id": "E", "text": "concise", "correct": false}
  ],
  "correct_answer": {"answer": "B"},
  "explanation": "The word 'abstruse' means difficult to understand. The context clue 'even experts found it difficult to follow' indicates the lecture was incomprehensible. 'Lucid' means clear, which contradicts the context.",
  "topic": "{topic}",
  "difficulty_level": {difficulty},
  "skills_tested": ["vocabulary", "context_clues"]
}

{examples}

Generate a NEW, UNIQUE question. Ensure it tests understanding and is appropriate for GRE level:`,
  },

  SAT_MATH: {
    name: 'sat_math',
    version: '1.0',
    task_type: 'question_generation',
    content: `You are an expert SAT Math test creator. Generate a challenging math question.

REQUIREMENTS:
- Difficulty: {difficulty}/5
- Topic: {topic}
- Test mathematical reasoning
- Clear, unambiguous problem statement

STRUCTURE:
- Problem: Clear scenario with given information
- Solution requires {difficulty}-step reasoning
- Answer choices are plausible distractors

OUTPUT JSON:
{
  "question_text": "If 3x + 7 = 22, what is the value of 6x + 5?",
  "question_type": "MULTIPLE_CHOICE",
  "options": [
    {"id": "A", "text": "25", "correct": false},
    {"id": "B", "text": "30", "correct": false},
    {"id": "C", "text": "35", "correct": true},
    {"id": "D", "text": "40", "correct": false}
  ],
  "correct_answer": {"answer": "C"},
  "explanation": "First solve for x: 3x + 7 = 22, so 3x = 15, x = 5. Then substitute: 6x + 5 = 6(5) + 5 = 30 + 5 = 35.",
  "topic": "{topic}",
  "difficulty_level": {difficulty}
}

{examples}

Generate a NEW, UNIQUE question:`,
  },

  GMAT_DATA_SUFFICIENCY: {
    name: 'gmat_data_sufficiency',
    version: '1.0',
    task_type: 'question_generation',
    content: `You are an expert GMAT Data Sufficiency test creator.

REQUIREMENTS:
- Difficulty: {difficulty}/5
- Topic: {topic}
- Classic GMAT DS format

STRUCTURE:
- Question asks for a specific value or relationship
- Statement (1) and Statement (2) provide information
- Standard answer choices (A-E)

OUTPUT JSON:
{
  "question_text": "Is x > y?\\n\\n(1) x + 5 > y + 5\\n(2) x - 3 > y - 3",
  "question_type": "MULTIPLE_CHOICE",
  "options": [
    {"id": "A", "text": "Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.", "correct": false},
    {"id": "B", "text": "Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.", "correct": false},
    {"id": "C", "text": "BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.", "correct": false},
    {"id": "D", "text": "EACH statement ALONE is sufficient.", "correct": true},
    {"id": "E", "text": "Statements (1) and (2) TOGETHER are NOT sufficient.", "correct": false}
  ],
  "correct_answer": {"answer": "D"},
  "explanation": "Both statements essentially state that x > y (adding or subtracting the same value from both sides doesn't change the inequality). Each statement alone is sufficient.",
  "topic": "{topic}",
  "difficulty_level": {difficulty}
}

{examples}

Generate a NEW, UNIQUE question:`,
  },

  EXPLANATION_GENERATION: {
    name: 'explanation_generation',
    version: '1.0',
    task_type: 'explanation',
    content: `Generate a clear, step-by-step explanation for the following question.

QUESTION:
{question}

CORRECT ANSWER:
{correct_answer}

EXPLANATION LEVEL: {level}
- simplified: For beginners, use simple language
- standard: For average test-takers
- advanced: For high scorers, include advanced strategies

Provide a detailed explanation that:
1. Identifies the key concept being tested
2. Explains the step-by-step solution
3. Points out common mistakes
4. Provides helpful strategies or tips

EXPLANATION:`,
  },

  AI_TUTOR_SYSTEM: {
    name: 'ai_tutor_system',
    version: '1.0',
    task_type: 'tutor',
    content: `You are an expert tutor helping students prepare for standardized tests.

STUDENT PROFILE:
- Name: {student_name}
- Target Exam: {exam}
- Current Level: {level}
- Weak Areas: {weak_areas}
- Recent Topics: {recent_topics}

CONTEXT:
{context}

Provide helpful, personalized guidance that:
- Tailors explanation to the student's level
- References their weak areas when relevant
- Is encouraging and supportive
- Suggests concrete next steps

STUDENT QUESTION:
{question}

YOUR RESPONSE:`,
  },
};
