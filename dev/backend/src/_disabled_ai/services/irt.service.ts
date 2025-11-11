import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * IRT (Item Response Theory) Service
 * Implements 3-Parameter Logistic (3PL) model for adaptive testing
 * 
 * 3PL Model: P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))
 * - a: discrimination parameter (how well item differentiates ability levels)
 * - b: difficulty parameter (ability level for 50% success probability)
 * - c: guessing parameter (probability of correct answer by chance)
 * - θ (theta): ability estimate of the test taker
 */
@Injectable()
export class IRTService {
  private readonly logger = new Logger(IRTService.name);
  private readonly MIN_ATTEMPTS_FOR_CALIBRATION = 30;
  private readonly MAX_ITERATIONS = 50;
  private readonly CONVERGENCE_THRESHOLD = 0.001;

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate probability of correct response using 3PL model
   */
  private calculate3PLProbability(
    theta: number,
    a: number,
    b: number,
    c: number,
  ): number {
    const exponent = -a * (theta - b);
    return c + ((1 - c) / (1 + Math.exp(exponent)));
  }

  /**
   * Fisher information at ability level theta
   * Measures how much information a question provides about ability
   */
  private fisherInformation(
    theta: number,
    a: number,
    b: number,
    c: number,
  ): number {
    const p = this.calculate3PLProbability(theta, a, b, c);
    const q = 1 - p;
    const pMinusC = p - c;
    
    if (pMinusC <= 0 || q <= 0) return 0;
    
    return (a * a * q * pMinusC * pMinusC) / (p * (1 - c) * (1 - c));
  }

  /**
   * Estimate user's ability using Maximum Likelihood Estimation (MLE)
   */
  async estimateAbility(userId: string, examId: string): Promise<{
    theta: number;
    standardError: number;
    attemptsCount: number;
  }> {
    // Get user's attempts with calibrated questions
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: {
          exam_id: examId,
          irt_a: { not: null },
          irt_b: { not: null },
          irt_c: { not: null },
        },
      },
      include: {
        question: {
          select: {
            id: true,
            irt_a: true,
            irt_b: true,
            irt_c: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    if (attempts.length === 0) {
      return { theta: 0, standardError: 999, attemptsCount: 0 };
    }

    // Start with initial ability estimate (neutral)
    let theta = 0;
    let iteration = 0;

    // Newton-Raphson method for MLE
    while (iteration < this.MAX_ITERATIONS) {
      let firstDerivative = 0;
      let secondDerivative = 0;

      for (const attempt of attempts) {
        const { irt_a: a, irt_b: b, irt_c: c } = attempt.question;
        const p = this.calculate3PLProbability(theta, a, b, c);
        const q = 1 - p;
        const pMinusC = p - c;
        
        if (pMinusC <= 0 || q <= 0) continue;

        const u = attempt.is_correct ? 1 : 0;
        
        // First derivative of log-likelihood
        const dP = a * q * pMinusC / (1 - c);
        firstDerivative += (u - p) * dP / (p * q);
        
        // Second derivative of log-likelihood
        const d2P = -a * a * q * pMinusC * (pMinusC + c * q) / ((1 - c) * (1 - c));
        secondDerivative += ((u - p) * d2P - dP * dP * (1 - 2 * p)) / (p * q);
      }

      // Newton-Raphson update
      const delta = firstDerivative / Math.abs(secondDerivative);
      theta += delta;

      // Check convergence
      if (Math.abs(delta) < this.CONVERGENCE_THRESHOLD) {
        break;
      }

      iteration++;
    }

    // Calculate standard error using Fisher information
    let totalInformation = 0;
    for (const attempt of attempts) {
      const { irt_a: a, irt_b: b, irt_c: c } = attempt.question;
      totalInformation += this.fisherInformation(theta, a, b, c);
    }

    const standardError = totalInformation > 0 ? 1 / Math.sqrt(totalInformation) : 999;

    this.logger.log(
      `Estimated ability for user ${userId} on exam ${examId}: ` +
      `θ=${theta.toFixed(3)}, SE=${standardError.toFixed(3)}, ` +
      `attempts=${attempts.length}, iterations=${iteration}`,
    );

    return { theta, standardError, attemptsCount: attempts.length };
  }

  /**
   * Calibrate a question's IRT parameters using existing attempt data
   */
  async calibrateQuestion(questionId: string): Promise<{
    a: number;
    b: number;
    c: number;
    sampleSize: number;
  } | null> {
    // Get attempts for this question with user ability estimates
    const attempts = await this.prisma.attempt.findMany({
      where: { question_id: questionId },
      include: {
        user: {
          include: {
            irt_profiles: {
              where: {
                exam_id: {
                  equals: await this.prisma.question
                    .findUnique({ where: { id: questionId } })
                    .then((q) => q?.exam_id),
                },
              },
            },
          },
        },
      },
    });

    if (attempts.length < this.MIN_ATTEMPTS_FOR_CALIBRATION) {
      this.logger.warn(
        `Question ${questionId} has only ${attempts.length} attempts. ` +
        `Need ${this.MIN_ATTEMPTS_FOR_CALIBRATION} for calibration.`,
      );
      return null;
    }

    // Filter attempts from users with ability estimates
    const validAttempts = attempts.filter(
      (a) => a.user.irt_profiles.length > 0 && a.is_correct !== null,
    );

    if (validAttempts.length < this.MIN_ATTEMPTS_FOR_CALIBRATION) {
      return null;
    }

    // Initial parameter estimates
    const correctRate = validAttempts.filter((a) => a.is_correct).length / validAttempts.length;
    let a = 1.0; // discrimination
    let b = 0.0; // difficulty
    let c = 0.2; // guessing (typical for multiple choice)

    // Estimate b (difficulty) from correct rate
    if (correctRate > 0.2 && correctRate < 0.8) {
      b = -Math.log((1 - correctRate) / (correctRate - c)) / a;
    }

    // Simplified calibration using moment matching
    const abilities = validAttempts.map((a) => a.user.irt_profiles[0].ability_estimate);
    const meanAbility = abilities.reduce((sum, val) => sum + val, 0) / abilities.length;
    
    // Adjust b based on mean ability of those who got it correct vs incorrect
    const correctAbilities = validAttempts
      .filter((a) => a.is_correct)
      .map((a) => a.user.irt_profiles[0].ability_estimate);
    const incorrectAbilities = validAttempts
      .filter((a) => !a.is_correct)
      .map((a) => a.user.irt_profiles[0].ability_estimate);

    if (correctAbilities.length > 0 && incorrectAbilities.length > 0) {
      const meanCorrect = correctAbilities.reduce((sum, val) => sum + val, 0) / correctAbilities.length;
      const meanIncorrect = incorrectAbilities.reduce((sum, val) => sum + val, 0) / incorrectAbilities.length;
      
      b = (meanCorrect + meanIncorrect) / 2;
      
      // Estimate discrimination from spread
      const spread = Math.abs(meanCorrect - meanIncorrect);
      a = Math.max(0.5, Math.min(2.5, spread > 0 ? 1.5 / spread : 1.0));
    }

    this.logger.log(
      `Calibrated question ${questionId}: ` +
      `a=${a.toFixed(3)}, b=${b.toFixed(3)}, c=${c.toFixed(3)}, ` +
      `n=${validAttempts.length}`,
    );

    return { a, b, c, sampleSize: validAttempts.length };
  }

  /**
   * Calibrate multiple questions in batch
   */
  async calibrateBatch(examId: string, minAttempts = 30): Promise<{
    calibrated: number;
    skipped: number;
    failed: number;
  }> {
    this.logger.log(`Starting batch calibration for exam ${examId}`);

    // Get all active questions for the exam with their attempt counts
    const questions = await this.prisma.question.findMany({
      where: {
        exam_id: examId,
        is_active: true,
      },
      select: {
        id: true,
        _count: {
          select: { attempts: true },
        },
      },
    });

    // Filter questions with sufficient attempts
    const questionsToCalibrate = questions.filter(
      (q) => q._count.attempts >= minAttempts
    );

    let calibrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const question of questionsToCalibrate) {
      try {
        const params = await this.calibrateQuestion(question.id);
        
        if (params) {
          await this.prisma.question.update({
            where: { id: question.id },
            data: {
              irt_a: params.a,
              irt_b: params.b,
              irt_c: params.c,
              calibration_sample: params.sampleSize,
              last_calibrated_at: new Date(),
            },
          });
          calibrated++;
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(`Failed to calibrate question ${question.id}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(
      `Batch calibration complete: ${calibrated} calibrated, ` +
      `${skipped} skipped, ${failed} failed`,
    );

    return { calibrated, skipped, failed };
  }

  /**
   * Update or create user's IRT profile
   */
  async updateUserProfile(userId: string, examId: string): Promise<void> {
    const { theta, standardError, attemptsCount } = await this.estimateAbility(userId, examId);

    await this.prisma.iRTProfile.upsert({
      where: {
        user_id_exam_id: { user_id: userId, exam_id: examId },
      },
      create: {
        user_id: userId,
        exam_id: examId,
        ability_estimate: theta,
        standard_error: standardError,
        attempts_count: attemptsCount,
      },
      update: {
        ability_estimate: theta,
        standard_error: standardError,
        attempts_count: attemptsCount,
      },
    });
  }

  /**
   * Select next question adaptively based on maximum information
   */
  async getNextAdaptiveQuestion(
    userId: string,
    examId: string,
    excludeQuestionIds: string[] = [],
  ): Promise<string | null> {
    // Get user's current ability estimate
    const profile = await this.prisma.iRTProfile.findUnique({
      where: { user_id_exam_id: { user_id: userId, exam_id: examId } },
    });

    const theta = profile?.ability_estimate ?? 0;

    // Get calibrated questions not yet attempted
    const questions = await this.prisma.question.findMany({
      where: {
        exam_id: examId,
        is_active: true,
        irt_a: { not: null },
        irt_b: { not: null },
        irt_c: { not: null },
        id: { notIn: excludeQuestionIds },
      },
      select: {
        id: true,
        irt_a: true,
        irt_b: true,
        irt_c: true,
      },
    });

    if (questions.length === 0) {
      return null;
    }

    // Select question with maximum information at user's ability level
    let maxInfo = 0;
    let selectedQuestion: string | null = null;

    for (const question of questions) {
      const info = this.fisherInformation(
        theta,
        question.irt_a,
        question.irt_b,
        question.irt_c,
      );

      if (info > maxInfo) {
        maxInfo = info;
        selectedQuestion = question.id;
      }
    }

    this.logger.debug(
      `Selected question ${selectedQuestion} with information ${maxInfo.toFixed(3)} ` +
      `for user ability ${theta.toFixed(3)}`,
    );

    return selectedQuestion;
  }

  /**
   * Get IRT statistics for a question
   */
  async getQuestionStatistics(questionId: string): Promise<{
    a: number | null;
    b: number | null;
    c: number | null;
    calibrationSample: number | null;
    lastCalibrated: Date | null;
    totalAttempts: number;
    correctRate: number;
  }> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        _count: { select: { attempts: true } },
        attempts: {
          where: { is_correct: { not: null } },
          select: { is_correct: true },
        },
      },
    });

    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    const totalAttempts = question._count.attempts;
    const validAttempts = question.attempts.filter((a) => a.is_correct !== null);
    const correctRate = validAttempts.length > 0
      ? validAttempts.filter((a) => a.is_correct).length / validAttempts.length
      : 0;

    return {
      a: question.irt_a,
      b: question.irt_b,
      c: question.irt_c,
      calibrationSample: question.calibration_sample,
      lastCalibrated: question.last_calibrated_at,
      totalAttempts,
      correctRate,
    };
  }

  /**
   * Get user's ability progression over time
   */
  async getAbilityProgression(
    userId: string,
    examId: string,
  ): Promise<Array<{ attemptNumber: number; estimatedAbility: number; standardError: number }>> {
    const attempts = await this.prisma.attempt.findMany({
      where: {
        user_id: userId,
        question: {
          exam_id: examId,
          irt_a: { not: null },
          irt_b: { not: null },
          irt_c: { not: null },
        },
      },
      include: {
        question: {
          select: {
            irt_a: true,
            irt_b: true,
            irt_c: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const progression: Array<{ attemptNumber: number; estimatedAbility: number; standardError: number }> = [];

    // Calculate ability after every 5 attempts
    for (let i = 5; i <= attempts.length; i += 5) {
      const subset = attempts.slice(0, i);
      const { theta, standardError } = await this.calculateAbilityFromAttempts(subset);
      progression.push({
        attemptNumber: i,
        estimatedAbility: theta,
        standardError,
      });
    }

    return progression;
  }

  private async calculateAbilityFromAttempts(
    attempts: Array<{
      is_correct: boolean | null;
      question: { irt_a: number; irt_b: number; irt_c: number };
    }>,
  ): Promise<{ theta: number; standardError: number }> {
    let theta = 0;
    let iteration = 0;

    while (iteration < this.MAX_ITERATIONS) {
      let firstDerivative = 0;
      let secondDerivative = 0;

      for (const attempt of attempts) {
        if (attempt.is_correct === null) continue;

        const { irt_a: a, irt_b: b, irt_c: c } = attempt.question;
        const p = this.calculate3PLProbability(theta, a, b, c);
        const q = 1 - p;
        const pMinusC = p - c;
        
        if (pMinusC <= 0 || q <= 0) continue;

        const u = attempt.is_correct ? 1 : 0;
        const dP = a * q * pMinusC / (1 - c);
        firstDerivative += (u - p) * dP / (p * q);
        
        const d2P = -a * a * q * pMinusC * (pMinusC + c * q) / ((1 - c) * (1 - c));
        secondDerivative += ((u - p) * d2P - dP * dP * (1 - 2 * p)) / (p * q);
      }

      const delta = firstDerivative / Math.abs(secondDerivative);
      theta += delta;

      if (Math.abs(delta) < this.CONVERGENCE_THRESHOLD) break;
      iteration++;
    }

    let totalInformation = 0;
    for (const attempt of attempts) {
      if (attempt.is_correct === null) continue;
      const { irt_a: a, irt_b: b, irt_c: c } = attempt.question;
      totalInformation += this.fisherInformation(theta, a, b, c);
    }

    const standardError = totalInformation > 0 ? 1 / Math.sqrt(totalInformation) : 999;

    return { theta, standardError };
  }
}
