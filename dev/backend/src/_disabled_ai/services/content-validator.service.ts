import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestrator } from './ai-orchestrator.service';
import { VectorStoreService } from './vector-store.service';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  errors: string[];
  warnings: string[];
}

interface ValidationCheck {
  score: number;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ContentValidatorService {
  private readonly logger = new Logger(ContentValidatorService.name);

  constructor(
    private aiOrchestrator: AIOrchestrator,
    private vectorStore: VectorStoreService,
  ) {}

  async validate(question: any): Promise<ValidationResult> {
    this.logger.log(`Validating question: ${question.question_text?.substring(0, 50)}...`);

    const checks = await Promise.all([
      this.validateFormat(question),
      this.checkPlausibility(question),
      this.detectDuplicates(question),
      this.estimateDifficulty(question),
      this.validateDistractors(question),
    ]);

    const score = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const errors = checks.flatMap(c => c.errors);
    const warnings = checks.flatMap(c => c.warnings);

    this.logger.log(`Validation complete: score=${score.toFixed(2)}, errors=${errors.length}, warnings=${warnings.length}`);

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
    };
  }

  private async validateFormat(question: any): Promise<ValidationCheck> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check question text
    if (!question.question_text || question.question_text.length < 10) {
      errors.push('Question text too short (minimum 10 characters)');
    }

    if (question.question_text?.length > 2000) {
      warnings.push('Question text very long (over 2000 characters)');
    }

    // Check question type
    const validTypes = ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'NUMERIC_INPUT', 'TEXT_INPUT', 'ESSAY', 'TRUE_FALSE'];
    if (!question.question_type || !validTypes.includes(question.question_type)) {
      errors.push(`Invalid question type: ${question.question_type}`);
    }

    // Check options for multiple choice
    if (question.question_type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push('Multiple choice needs at least 2 options');
      }

      if (question.options) {
        const correctCount = question.options.filter(o => o.correct).length;
        if (correctCount === 0) {
          errors.push('No correct answer marked');
        } else if (correctCount > 1) {
          errors.push('Multiple correct answers (use MULTIPLE_SELECT type)');
        }

        // Check option format
        question.options.forEach((opt, idx) => {
          if (!opt.id || !opt.text) {
            errors.push(`Option ${idx + 1} missing id or text`);
          }
        });
      }
    }

    // Check correct answer
    if (!question.correct_answer) {
      errors.push('Correct answer is required');
    }

    // Check topic
    if (!question.topic || question.topic.length < 2) {
      errors.push('Topic is required');
    }

    // Check difficulty level
    if (!question.difficulty_level || question.difficulty_level < 1 || question.difficulty_level > 5) {
      errors.push('Difficulty level must be 1-5');
    }

    // Check explanation
    if (!question.explanation || question.explanation.length < 20) {
      warnings.push('Explanation is very short or missing');
    }

    const score = errors.length === 0 ? 1 : 0;
    return { score, errors, warnings };
  }

  private async checkPlausibility(question: any): Promise<ValidationCheck> {
    try {
      // Use AI to check if question makes sense
      const prompt = `Review this test question for plausibility and correctness:

Question: ${question.question_text}
Type: ${question.question_type}
${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}
Correct Answer: ${JSON.stringify(question.correct_answer)}

Evaluate:
1. Does this question have a clear, unambiguous answer?
2. Does it make logical sense?
3. Are the distractors plausible (if applicable)?
4. Is the difficulty appropriate?
5. Is the explanation accurate?

Respond with JSON:
{
  "plausible": true/false,
  "confidence": 0.0-1.0,
  "issues": ["list any issues found"]
}`;

      const response = await this.aiOrchestrator.generate({
        type: 'question_generation',
        prompt,
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
        priority: 'cost', // Use cheaper model for validation
        maxTokens: 300,
      });

      const result = JSON.parse(response.content);
      
      return {
        score: result.plausible && result.confidence > 0.7 ? 1 : 0.5,
        errors: result.plausible ? [] : result.issues || ['AI flagged as implausible'],
        warnings: result.confidence < 0.8 ? ['Low confidence in plausibility check'] : [],
      };
    } catch (error) {
      this.logger.warn(`Plausibility check failed: ${error.message}`);
      return {
        score: 0.5,
        errors: [],
        warnings: ['Could not verify plausibility'],
      };
    }
  }

  private async detectDuplicates(question: any): Promise<ValidationCheck> {
    try {
      // Search for similar questions
      const similar = await this.vectorStore.search(question.question_text, {
        topK: 5,
        filter: question.exam_id ? { exam_id: question.exam_id } : undefined,
      });

      const duplicates = similar.filter(s => s.score > 0.85);
      const nearDuplicates = similar.filter(s => s.score > 0.75 && s.score <= 0.85);

      return {
        score: duplicates.length === 0 ? 1 : 0,
        errors: duplicates.map(d => `Too similar to question ${d.id} (${(d.score * 100).toFixed(0)}% match)`),
        warnings: nearDuplicates.map(d => `Similar to question ${d.id} (${(d.score * 100).toFixed(0)}% match)`),
      };
    } catch (error) {
      this.logger.warn(`Duplicate detection failed: ${error.message}`);
      return {
        score: 0.8,
        errors: [],
        warnings: ['Could not check for duplicates'],
      };
    }
  }

  private async estimateDifficulty(question: any): Promise<ValidationCheck> {
    // Simple heuristic-based difficulty estimation
    let estimatedDifficulty = 3; // Default to medium

    // Adjust based on question length
    const wordCount = question.question_text.split(/\s+/).length;
    if (wordCount > 50) estimatedDifficulty += 0.5;
    if (wordCount < 20) estimatedDifficulty -= 0.5;

    // Adjust based on option count (if applicable)
    if (question.options && question.options.length > 4) {
      estimatedDifficulty += 0.5;
    }

    estimatedDifficulty = Math.max(1, Math.min(5, Math.round(estimatedDifficulty)));

    const difference = Math.abs(estimatedDifficulty - (question.difficulty_level || 3));
    
    return {
      score: difference <= 1 ? 1 : 0.7,
      errors: [],
      warnings: difference > 1 
        ? [`Estimated difficulty (${estimatedDifficulty}) differs from stated (${question.difficulty_level})`]
        : [],
    };
  }

  private async validateDistractors(question: any): Promise<ValidationCheck> {
    if (question.question_type !== 'MULTIPLE_CHOICE' || !question.options) {
      return { score: 1, errors: [], warnings: [] };
    }

    const warnings: string[] = [];

    const correct = question.options.find(o => o.correct);
    const distractors = question.options.filter(o => !o.correct);

    if (distractors.length < 2) {
      warnings.push('Few distractors (best practice: 3-4)');
    }

    // Check for very short distractors
    const shortDistractors = distractors.filter(d => d.text.length < 3);
    if (shortDistractors.length > 0) {
      warnings.push('Some distractors are very short');
    }

    // Check for very similar distractors
    if (distractors.length >= 2) {
      for (let i = 0; i < distractors.length; i++) {
        for (let j = i + 1; j < distractors.length; j++) {
          const similarity = this.calculateSimilarity(
            distractors[i].text,
            distractors[j].text
          );
          if (similarity > 0.8) {
            warnings.push(`Distractors "${distractors[i].text}" and "${distractors[j].text}" are very similar`);
          }
        }
      }
    }

    return {
      score: warnings.length === 0 ? 1 : 0.8,
      errors: [],
      warnings,
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
