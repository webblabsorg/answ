import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IRTService } from './irt.service';

interface WeakTopic {
  topic: string;
  subtopic?: string;
  correctRate: number;
  questionsAttempted: number;
  averageDifficulty: number;
  recommendedPractice: number;
}

interface StudyPlan {
  userId: string;
  examId: string;
  currentAbility: number;
  targetScore: number;
  estimatedHoursNeeded: number;
  weakTopics: WeakTopic[];
  recommendedDailyMinutes: number;
  projectedCompletionDate: Date;
  milestones: Array<{
    week: number;
    targetAbility: number;
    topics: string[];
    questionsToComplete: number;
  }>;
}

interface Recommendation {
  questionId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImprovement: number;
  difficulty: number;
  topic: string;
}

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(
    private prisma: PrismaService,
    private irtService: IRTService,
  ) {}

  /**
   * Generate personalized study plan
   */
  async generateStudyPlan(
    userId: string,
    examId: string,
    targetScore?: number,
  ): Promise<StudyPlan> {
    this.logger.log(`Generating study plan for user ${userId}, exam ${examId}`);

    // Get user's current ability
    const profile = await this.prisma.iRTProfile.findUnique({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
    });

    const currentAbility = profile?.ability_estimate ?? 0;

    // Analyze weak topics
    const weakTopics = await this.identifyWeakTopics(userId, examId);

    // Calculate study time needed
    const estimatedHours = this.calculateStudyHours(
      currentAbility,
      targetScore ?? 0,
      weakTopics,
    );

    // Generate milestones
    const milestones = this.generateMilestones(
      currentAbility,
      targetScore ?? 0,
      weakTopics,
      estimatedHours,
    );

    // Recommended daily practice
    const recommendedDailyMinutes = Math.min(120, Math.max(30, estimatedHours * 60 / 30)); // 30 days default

    const projectedCompletionDate = new Date();
    projectedCompletionDate.setDate(
      projectedCompletionDate.getDate() + Math.ceil((estimatedHours * 60) / recommendedDailyMinutes),
    );

    return {
      userId,
      examId,
      currentAbility,
      targetScore: targetScore ?? currentAbility + 1,
      estimatedHoursNeeded: estimatedHours,
      weakTopics,
      recommendedDailyMinutes,
      projectedCompletionDate,
      milestones,
    };
  }

  /**
   * Identify weak topics based on performance
   */
  async identifyWeakTopics(userId: string, examId: string): Promise<WeakTopic[]> {
    // Get all attempts grouped by topic
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: { exam_id: examId },
        is_correct: { not: null },
      },
      include: {
        question: {
          select: {
            topic: true,
            subtopic: true,
            difficulty_level: true,
          },
        },
      },
    });

    // Group by topic
    const topicMap = new Map<string, {
      correct: number;
      total: number;
      difficulties: number[];
      subtopics: Set<string>;
    }>();

    for (const attempt of attempts) {
      const topic = attempt.question.topic;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          correct: 0,
          total: 0,
          difficulties: [],
          subtopics: new Set(),
        });
      }

      const data = topicMap.get(topic)!;
      data.total++;
      if (attempt.is_correct) data.correct++;
      data.difficulties.push(attempt.question.difficulty_level);
      if (attempt.question.subtopic) {
        data.subtopics.add(attempt.question.subtopic);
      }
    }

    // Convert to weak topics (correct rate < 70%)
    const weakTopics: WeakTopic[] = [];

    for (const [topic, data] of topicMap) {
      const correctRate = data.correct / data.total;
      if (correctRate < 0.7) {
        const avgDifficulty = data.difficulties.reduce((a, b) => a + b, 0) / data.difficulties.length;
        
        // Recommend more practice for weaker topics
        const practiceNeeded = Math.ceil((0.7 - correctRate) * 50);

        weakTopics.push({
          topic,
          correctRate,
          questionsAttempted: data.total,
          averageDifficulty: avgDifficulty,
          recommendedPractice: practiceNeeded,
        });
      }
    }

    // Sort by correct rate (worst first)
    weakTopics.sort((a, b) => a.correctRate - b.correctRate);

    return weakTopics;
  }

  /**
   * Get personalized question recommendations
   */
  async getRecommendations(
    userId: string,
    examId: string,
    limit = 10,
  ): Promise<Recommendation[]> {
    // Get user's ability and weak topics
    const profile = await this.prisma.iRTProfile.findUnique({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
    });

    const currentAbility = profile?.ability_estimate ?? 0;
    const weakTopics = await this.identifyWeakTopics(userId, examId);

    // Get attempted question IDs to exclude
    const attemptedIds = await this.prisma.attempt
      .findMany({
        where: { user_id: userId, question: { exam_id: examId } },
        select: { question_id: true },
      })
      .then((attempts) => attempts.map((a) => a.question_id));

    const recommendations: Recommendation[] = [];

    // Prioritize weak topics
    for (const weakTopic of weakTopics.slice(0, 3)) {
      // Get questions from this weak topic
      const questions = await this.prisma.question.findMany({
        where: {
          exam_id: examId,
          topic: weakTopic.topic,
          is_active: true,
          irt_a: { not: null },
          irt_b: { not: null },
          irt_c: { not: null },
          id: { notIn: attemptedIds },
        },
        select: {
          id: true,
          topic: true,
          difficulty_level: true,
          irt_b: true,
        },
        take: Math.ceil(limit / 3),
      });

      for (const question of questions) {
        // Calculate expected improvement
        const difficultyGap = Math.abs(question.irt_b - currentAbility);
        const expectedImprovement = Math.max(0, 0.2 - difficultyGap * 0.1);

        // Priority based on how weak the topic is
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (weakTopic.correctRate < 0.5) priority = 'high';
        else if (weakTopic.correctRate > 0.6) priority = 'low';

        recommendations.push({
          questionId: question.id,
          reason: `Practice weak topic: ${question.topic} (${(weakTopic.correctRate * 100).toFixed(0)}% correct rate)`,
          priority,
          expectedImprovement,
          difficulty: question.difficulty_level,
          topic: question.topic,
        });
      }
    }

    // Add adaptive questions for balanced practice
    const adaptiveQuestionId = await this.irtService.getNextAdaptiveQuestion(
      userId,
      examId,
      attemptedIds,
    );

    if (adaptiveQuestionId && !recommendations.find((r) => r.questionId === adaptiveQuestionId)) {
      const question = await this.prisma.question.findUnique({
        where: { id: adaptiveQuestionId },
        select: { topic: true, difficulty_level: true },
      });

      if (question) {
        recommendations.push({
          questionId: adaptiveQuestionId,
          reason: 'Adaptive recommendation based on your ability level',
          priority: 'medium',
          expectedImprovement: 0.15,
          difficulty: question.difficulty_level,
          topic: question.topic,
        });
      }
    }

    // Sort by priority and expected improvement
    recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const scoreDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (scoreDiff !== 0) return scoreDiff;
      return b.expectedImprovement - a.expectedImprovement;
    });

    return recommendations.slice(0, limit);
  }

  /**
   * Calculate estimated study hours needed
   */
  private calculateStudyHours(
    currentAbility: number,
    targetScore: number,
    weakTopics: WeakTopic[],
  ): number {
    // Base hours per ability point improvement
    const hoursPerPoint = 15;

    // Additional hours for weak topics
    const weakTopicPenalty = weakTopics.reduce((sum, topic) => {
      return sum + (0.7 - topic.correctRate) * 10;
    }, 0);

    const abilityGap = Math.max(0, targetScore - currentAbility);
    const totalHours = abilityGap * hoursPerPoint + weakTopicPenalty;

    return Math.ceil(totalHours);
  }

  /**
   * Generate study milestones
   */
  private generateMilestones(
    currentAbility: number,
    targetScore: number,
    weakTopics: WeakTopic[],
    totalHours: number,
  ): Array<{
    week: number;
    targetAbility: number;
    topics: string[];
    questionsToComplete: number;
  }> {
    const weeks = Math.ceil(totalHours / 10); // Assuming 10 hours per week
    const abilityGap = targetScore - currentAbility;
    const abilityPerWeek = abilityGap / weeks;

    const milestones: Array<{
      week: number;
      targetAbility: number;
      topics: string[];
      questionsToComplete: number;
    }> = [];

    for (let week = 1; week <= weeks; week++) {
      const targetAbility = currentAbility + abilityPerWeek * week;
      
      // Focus on 2-3 weak topics per week
      const topicsThisWeek = weakTopics
        .slice((week - 1) % weakTopics.length, ((week - 1) % weakTopics.length) + 3)
        .map((t) => t.topic);

      milestones.push({
        week,
        targetAbility,
        topics: topicsThisWeek,
        questionsToComplete: 30, // ~30 questions per week
      });
    }

    return milestones;
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(userId: string, examId: string): Promise<{
    overallProgress: number;
    strengths: string[];
    weaknesses: string[];
    recentTrend: 'improving' | 'stable' | 'declining';
    nextMilestone: string;
    daysActive: number;
    totalQuestionsAttempted: number;
    averageAccuracy: number;
  }> {
    // Get all attempts
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: { exam_id: examId },
        is_correct: { not: null },
      },
      include: {
        question: { select: { topic: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    if (attempts.length === 0) {
      return {
        overallProgress: 0,
        strengths: [],
        weaknesses: [],
        recentTrend: 'stable',
        nextMilestone: 'Start practicing to see insights',
        daysActive: 0,
        totalQuestionsAttempted: 0,
        averageAccuracy: 0,
      };
    }

    // Calculate metrics
    const totalAttempted = attempts.length;
    const totalCorrect = attempts.filter((a) => a.is_correct).length;
    const averageAccuracy = totalCorrect / totalAttempted;

    // Days active
    const firstAttempt = attempts[0].created_at;
    const lastAttempt = attempts[attempts.length - 1].created_at;
    const daysActive = Math.ceil(
      (lastAttempt.getTime() - firstAttempt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Recent trend (last 20 questions vs previous 20)
    const recent20 = attempts.slice(-20);
    const previous20 = attempts.slice(-40, -20);

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (previous20.length >= 10) {
      const recentAccuracy = recent20.filter((a) => a.is_correct).length / recent20.length;
      const previousAccuracy = previous20.filter((a) => a.is_correct).length / previous20.length;
      
      if (recentAccuracy > previousAccuracy + 0.1) recentTrend = 'improving';
      else if (recentAccuracy < previousAccuracy - 0.1) recentTrend = 'declining';
    }

    // Strengths and weaknesses
    const topicPerformance = new Map<string, { correct: number; total: number }>();
    for (const attempt of attempts) {
      const topic = attempt.question.topic;
      if (!topicPerformance.has(topic)) {
        topicPerformance.set(topic, { correct: 0, total: 0 });
      }
      const perf = topicPerformance.get(topic)!;
      perf.total++;
      if (attempt.is_correct) perf.correct++;
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [topic, perf] of topicPerformance) {
      if (perf.total >= 5) {
        const rate = perf.correct / perf.total;
        if (rate >= 0.75) strengths.push(topic);
        else if (rate < 0.6) weaknesses.push(topic);
      }
    }

    // Overall progress (based on ability estimate)
    const profile = await this.prisma.iRTProfile.findUnique({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
    });

    // Map ability (-3 to 3) to progress (0 to 100)
    const overallProgress = Math.min(100, Math.max(0, ((profile?.ability_estimate ?? 0) + 3) / 6 * 100));

    // Next milestone
    let nextMilestone = 'Complete 50 questions to unlock insights';
    if (totalAttempted >= 50) {
      if (weaknesses.length > 0) {
        nextMilestone = `Improve ${weaknesses[0]} to 70% accuracy`;
      } else {
        nextMilestone = 'Maintain your performance and explore new topics';
      }
    }

    return {
      overallProgress,
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
      recentTrend,
      nextMilestone,
      daysActive: Math.max(1, daysActive),
      totalQuestionsAttempted: totalAttempted,
      averageAccuracy,
    };
  }

  /**
   * Get optimal study time recommendation
   */
  async getOptimalStudyTime(userId: string, examId: string): Promise<{
    recommendedMinutesPerDay: number;
    bestTimeOfDay: string;
    studyStreak: number;
    projectedReadinessDate: Date;
  }> {
    // Analyze user's attempt patterns
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: { exam_id: examId },
      },
      select: {
        created_at: true,
        is_correct: true,
        time_spent_seconds: true,
      },
      orderBy: { created_at: 'asc' },
    });

    // Calculate study streak
    let studyStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set<string>();
    for (const attempt of attempts) {
      const attemptDate = new Date(attempt.created_at);
      attemptDate.setHours(0, 0, 0, 0);
      uniqueDays.add(attemptDate.toISOString());
    }

    // Count consecutive days from today backwards
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (uniqueDays.has(checkDate.toISOString())) {
        studyStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Determine best time of day based on performance
    const hourPerformance = new Map<number, { correct: number; total: number }>();
    for (const attempt of attempts) {
      if (attempt.is_correct === null) continue;
      const hour = attempt.created_at.getHours();
      if (!hourPerformance.has(hour)) {
        hourPerformance.set(hour, { correct: 0, total: 0 });
      }
      const perf = hourPerformance.get(hour)!;
      perf.total++;
      if (attempt.is_correct) perf.correct++;
    }

    let bestHour = 9; // Default to 9 AM
    let bestRate = 0;
    for (const [hour, perf] of hourPerformance) {
      if (perf.total >= 5) {
        const rate = perf.correct / perf.total;
        if (rate > bestRate) {
          bestRate = rate;
          bestHour = hour;
        }
      }
    }

    const bestTimeOfDay =
      bestHour < 12 ? 'Morning (9-12 AM)' :
      bestHour < 17 ? 'Afternoon (12-5 PM)' :
      'Evening (5-9 PM)';

    // Recommended minutes based on current performance
    const profile = await this.prisma.iRTProfile.findUnique({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
    });

    const ability = profile?.ability_estimate ?? 0;
    const recommendedMinutesPerDay = ability < -1 ? 60 : ability < 0 ? 45 : 30;

    // Project readiness (when ability reaches 0.5)
    const targetAbility = 0.5;
    const abilityGap = Math.max(0, targetAbility - ability);
    const hoursNeeded = abilityGap * 15; // 15 hours per ability point
    const daysNeeded = Math.ceil((hoursNeeded * 60) / recommendedMinutesPerDay);

    const projectedReadinessDate = new Date();
    projectedReadinessDate.setDate(projectedReadinessDate.getDate() + daysNeeded);

    return {
      recommendedMinutesPerDay,
      bestTimeOfDay,
      studyStreak,
      projectedReadinessDate,
    };
  }
}
