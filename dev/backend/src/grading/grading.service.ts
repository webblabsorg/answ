import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GradingService {
  constructor(private prisma: PrismaService) {}

  async gradeSession(sessionId: string) {
    // Get session with all attempts and questions
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        attempts: {
          include: {
            question: true,
          },
        },
        exam: {
          include: {
            sections: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    let totalCorrect = 0;
    const sectionScores: Record<string, { correct: number; total: number }> = {};

    // Grade each attempt
    for (const attempt of session.attempts) {
      const isCorrect = this.validateAnswer(
        attempt.question,
        attempt.user_answer,
      );

      // Update attempt with grading result
      await this.prisma.attempt.update({
        where: { id: attempt.id },
        data: { is_correct: isCorrect },
      });

      if (isCorrect) {
        totalCorrect++;
      }

      // Track section scores
      if (attempt.question.section_id) {
        if (!sectionScores[attempt.question.section_id]) {
          sectionScores[attempt.question.section_id] = { correct: 0, total: 0 };
        }
        sectionScores[attempt.question.section_id].total++;
        if (isCorrect) {
          sectionScores[attempt.question.section_id].correct++;
        }
      }
    }

    // Calculate scores
    const totalQuestions = session.attempts.length;
    const rawScore = totalCorrect;
    const percentageScore = (totalCorrect / totalQuestions) * 100;
    
    // Scaled score (exam-specific scaling, simplified here)
    const scaledScore = this.calculateScaledScore(
      percentageScore,
      session.exam.code,
    );

    // Calculate percentile (simplified - would need historical data)
    const percentile = this.calculatePercentile(percentageScore);

    // Update session with results
    await this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'GRADED',
        total_correct: totalCorrect,
        raw_score: rawScore,
        scaled_score: scaledScore,
        percentile: percentile,
      },
    });

    return {
      session_id: sessionId,
      total_questions: totalQuestions,
      total_correct: totalCorrect,
      raw_score: rawScore,
      scaled_score: scaledScore,
      percentage: percentageScore,
      percentile: percentile,
      section_scores: sectionScores,
    };
  }

  validateAnswer(question: any, userAnswer: any): boolean {
    if (!userAnswer || !question.correct_answer) {
      return false;
    }

    const questionType = question.question_type;
    const correctAnswer = question.correct_answer;

    switch (questionType) {
      case 'MULTIPLE_CHOICE':
      case 'TRUE_FALSE':
        // Single answer comparison
        return userAnswer.answer === correctAnswer.answer;

      case 'MULTIPLE_SELECT':
        // Multiple answers - must match exactly
        const userAnswers = Array.isArray(userAnswer.answers)
          ? userAnswer.answers.sort()
          : [];
        const correctAnswers = Array.isArray(correctAnswer.answers)
          ? correctAnswer.answers.sort()
          : [];
        
        if (userAnswers.length !== correctAnswers.length) {
          return false;
        }
        
        return userAnswers.every((ans, idx) => ans === correctAnswers[idx]);

      case 'NUMERIC_INPUT':
        // Numeric comparison with tolerance
        const userNum = parseFloat(userAnswer.answer);
        const correctNum = parseFloat(correctAnswer.answer);
        const tolerance = correctAnswer.tolerance || 0.01;
        
        return Math.abs(userNum - correctNum) <= tolerance;

      case 'TEXT_INPUT':
        // Case-insensitive string comparison
        const userText = String(userAnswer.answer || '').trim().toLowerCase();
        const correctText = String(correctAnswer.answer || '').trim().toLowerCase();
        
        // Support multiple acceptable answers
        if (Array.isArray(correctAnswer.acceptable_answers)) {
          return correctAnswer.acceptable_answers.some(
            (ans: string) => ans.trim().toLowerCase() === userText
          );
        }
        
        return userText === correctText;

      case 'ESSAY':
        // Essays require manual grading
        // Return null to indicate manual review needed
        return false; // Will be graded manually

      default:
        return false;
    }
  }

  private calculateScaledScore(percentageScore: number, examCode: string): number {
    // Simplified scaling - in real implementation, use exam-specific curves
    switch (examCode) {
      case 'GRE':
        // GRE Verbal/Quant: 130-170 scale
        return Math.round(130 + (percentageScore / 100) * 40);
      
      case 'SAT':
        // SAT: 400-1600 scale (combined)
        return Math.round(400 + (percentageScore / 100) * 1200);
      
      case 'GMAT':
        // GMAT: 200-800 scale
        return Math.round(200 + (percentageScore / 100) * 600);
      
      default:
        return Math.round(percentageScore);
    }
  }

  private calculatePercentile(percentageScore: number): number {
    // Simplified percentile calculation
    // In real implementation, compare against historical performance data
    
    // Using a simple normal distribution approximation
    if (percentageScore >= 95) return 99;
    if (percentageScore >= 90) return 95;
    if (percentageScore >= 85) return 90;
    if (percentageScore >= 80) return 85;
    if (percentageScore >= 75) return 80;
    if (percentageScore >= 70) return 75;
    if (percentageScore >= 65) return 70;
    if (percentageScore >= 60) return 65;
    if (percentageScore >= 55) return 60;
    if (percentageScore >= 50) return 50;
    if (percentageScore >= 45) return 40;
    if (percentageScore >= 40) return 30;
    if (percentageScore >= 35) return 25;
    if (percentageScore >= 30) return 20;
    if (percentageScore >= 25) return 15;
    if (percentageScore >= 20) return 10;
    return 5;
  }

  async getSessionResults(sessionId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            sections: true,
          },
        },
        attempts: {
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                question_type: true,
                options: true,
                correct_answer: true,
                explanation: true,
                topic: true,
                difficulty_level: true,
                section_id: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate section breakdowns
    const sectionBreakdown = this.calculateSectionBreakdown(session);

    // Calculate topic performance
    const topicPerformance = this.calculateTopicPerformance(session);

    return {
      session: {
        id: session.id,
        status: session.status,
        total_questions: session.total_questions,
        total_attempted: session.total_attempted,
        total_correct: session.total_correct,
        raw_score: session.raw_score,
        scaled_score: session.scaled_score,
        percentile: session.percentile,
        started_at: session.started_at,
        completed_at: session.completed_at,
        duration_seconds: session.duration_seconds,
      },
      exam: {
        id: session.exam.id,
        name: session.exam.name,
        code: session.exam.code,
      },
      section_breakdown: sectionBreakdown,
      topic_performance: topicPerformance,
      questions: session.attempts.map((attempt) => ({
        id: attempt.question.id,
        question_text: attempt.question.question_text,
        question_type: attempt.question.question_type,
        options: attempt.question.options,
        correct_answer: attempt.question.correct_answer,
        user_answer: attempt.user_answer,
        is_correct: attempt.is_correct,
        explanation: attempt.question.explanation,
        topic: attempt.question.topic,
        difficulty_level: attempt.question.difficulty_level,
        time_spent_seconds: attempt.time_spent_seconds,
        is_flagged: attempt.is_flagged,
      })),
    };
  }

  private calculateSectionBreakdown(session: any) {
    const breakdown: Record<string, any> = {};

    for (const section of session.exam.sections) {
      const sectionAttempts = session.attempts.filter(
        (a: any) => a.question.section_id === section.id
      );

      const correct = sectionAttempts.filter((a: any) => a.is_correct).length;
      const total = sectionAttempts.length;

      breakdown[section.id] = {
        section_name: section.name,
        section_order: section.section_order,
        correct,
        total,
        percentage: total > 0 ? (correct / total) * 100 : 0,
      };
    }

    return Object.values(breakdown);
  }

  private calculateTopicPerformance(session: any) {
    const topicMap: Record<string, { correct: number; total: number }> = {};

    for (const attempt of session.attempts) {
      const topic = attempt.question.topic || 'Other';
      
      if (!topicMap[topic]) {
        topicMap[topic] = { correct: 0, total: 0 };
      }

      topicMap[topic].total++;
      if (attempt.is_correct) {
        topicMap[topic].correct++;
      }
    }

    return Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      percentage: (stats.correct / stats.total) * 100,
    }));
  }
}
