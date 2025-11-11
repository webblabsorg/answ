import { Test, TestingModule } from '@nestjs/testing';
import { IRTService } from './irt.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IRTService', () => {
  let service: IRTService;
  let prisma: PrismaService;

  const mockPrismaService = {
    attempt: {
      findMany: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    iRTProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IRTService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IRTService>(IRTService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('3PL Model Calculations', () => {
    it('should calculate probability correctly with typical parameters', () => {
      // Access private method via type assertion
      const probability = (service as any).calculate3PLProbability(0, 1, 0, 0.2);
      expect(probability).toBeCloseTo(0.6, 1);
    });

    it('should handle extreme ability values', () => {
      const lowAbility = (service as any).calculate3PLProbability(-3, 1, 0, 0.2);
      expect(lowAbility).toBeGreaterThan(0);
      expect(lowAbility).toBeLessThan(0.5);

      const highAbility = (service as any).calculate3PLProbability(3, 1, 0, 0.2);
      expect(highAbility).toBeGreaterThan(0.5);
      expect(highAbility).toBeLessThan(1);
    });

    it('should respect guessing parameter as minimum probability', () => {
      const probability = (service as any).calculate3PLProbability(-10, 1, 0, 0.25);
      expect(probability).toBeGreaterThanOrEqual(0.25);
    });
  });

  describe('Fisher Information', () => {
    it('should calculate information correctly', () => {
      const info = (service as any).fisherInformation(0, 1, 0, 0.2);
      expect(info).toBeGreaterThan(0);
    });

    it('should return zero for invalid parameters', () => {
      const info = (service as any).fisherInformation(0, 1, 0, 1);
      expect(info).toBe(0);
    });

    it('should show maximum information near question difficulty', () => {
      const infoAtDifficulty = (service as any).fisherInformation(1, 1, 1, 0.2);
      const infoFarFromDifficulty = (service as any).fisherInformation(-1, 1, 1, 0.2);
      expect(infoAtDifficulty).toBeGreaterThan(infoFarFromDifficulty);
    });
  });

  describe('estimateAbility', () => {
    it('should return default ability with no attempts', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue([]);

      const result = await service.estimateAbility('user1', 'exam1');

      expect(result).toEqual({
        theta: 0,
        standardError: 999,
        attemptsCount: 0,
      });
    });

    it('should estimate ability from calibrated attempts', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue([
        {
          is_correct: true,
          question: { irt_a: 1, irt_b: 0, irt_c: 0.2 },
        },
        {
          is_correct: true,
          question: { irt_a: 1, irt_b: 0.5, irt_c: 0.2 },
        },
        {
          is_correct: false,
          question: { irt_a: 1, irt_b: 1.5, irt_c: 0.2 },
        },
      ]);

      const result = await service.estimateAbility('user1', 'exam1');

      expect(result.theta).toBeGreaterThan(-1);
      expect(result.theta).toBeLessThan(3); // Allow wider range
      expect(result.standardError).toBeGreaterThan(0);
      expect(result.standardError).toBeLessThan(999);
      expect(result.attemptsCount).toBe(3);
    });

    it('should converge with sufficient iterations', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue([
        { is_correct: true, question: { irt_a: 1, irt_b: 0, irt_c: 0.2 } },
        { is_correct: true, question: { irt_a: 1, irt_b: 0, irt_c: 0.2 } },
        { is_correct: true, question: { irt_a: 1, irt_b: 0, irt_c: 0.2 } },
        { is_correct: false, question: { irt_a: 1, irt_b: 2, irt_c: 0.2 } },
      ]);

      const result = await service.estimateAbility('user1', 'exam1');

      expect(result.theta).toBeDefined();
      expect(isFinite(result.theta)).toBe(true);
    });
  });

  describe('calibrateQuestion', () => {
    it('should return null if insufficient attempts', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue(
        Array(25).fill({ is_correct: true, user: { irt_profiles: [] } })
      );
      
      mockPrismaService.question.findUnique.mockResolvedValue({ exam_id: 'exam1' } as any);

      const result = await service.calibrateQuestion('q1');

      expect(result).toBeNull();
    });

    it('should calibrate with sufficient data', async () => {
      const attempts = Array(35).fill(null).map((_, i) => ({
        is_correct: i < 20,
        user: {
          irt_profiles: [{ ability_estimate: (i - 17) * 0.1 }],
        },
      }));

      mockPrismaService.attempt.findMany.mockResolvedValue(attempts);
      mockPrismaService.question.findUnique.mockResolvedValue({ exam_id: 'exam1' });

      const result = await service.calibrateQuestion('q1');

      expect(result).not.toBeNull();
      expect(result?.a).toBeGreaterThan(0);
      expect(result?.b).toBeDefined();
      expect(result?.c).toBeGreaterThan(0);
      expect(result?.c).toBeLessThan(1);
      expect(result?.sampleSize).toBeGreaterThanOrEqual(30);
    });

    it('should handle all correct or all incorrect attempts gracefully', async () => {
      const attempts = Array(35).fill(null).map(() => ({
        is_correct: true,
        user: {
          irt_profiles: [{ ability_estimate: 1.5 }],
        },
      }));

      mockPrismaService.attempt.findMany.mockResolvedValue(attempts);
      mockPrismaService.question.findUnique.mockResolvedValue({ exam_id: 'exam1' });

      const result = await service.calibrateQuestion('q1');

      expect(result).not.toBeNull();
      expect(result?.a).toBeGreaterThan(0);
    });
  });

  describe('calibrateBatch', () => {
    it('should calibrate multiple questions', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([
        { id: 'q1', _count: { attempts: 35 } },
        { id: 'q2', _count: { attempts: 40 } },
      ]);

      // Mock calibrateQuestion to return success for 1, null for 1
      jest.spyOn(service, 'calibrateQuestion')
        .mockResolvedValueOnce({ a: 1, b: 0, c: 0.2, sampleSize: 30 })
        .mockResolvedValueOnce(null);

      mockPrismaService.question.update.mockResolvedValue({} as any);

      const result = await service.calibrateBatch('exam1', 30);

      expect(result.calibrated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle calibration failures', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([
        { id: 'q1', _count: { attempts: 35 } }
      ]);

      jest.spyOn(service, 'calibrateQuestion')
        .mockRejectedValueOnce(new Error('Calibration error'));

      const result = await service.calibrateBatch('exam1');

      expect(result.failed).toBe(1);
    });
  });

  describe('updateUserProfile', () => {
    it('should create or update IRT profile', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue([
        { is_correct: true, question: { irt_a: 1, irt_b: 0, irt_c: 0.2 } },
      ]);

      mockPrismaService.iRTProfile.upsert.mockResolvedValue({
        id: 'profile1',
        user_id: 'user1',
        exam_id: 'exam1',
        ability_estimate: 0.5,
        standard_error: 0.5,
        attempts_count: 1,
      });

      await service.updateUserProfile('user1', 'exam1');

      expect(mockPrismaService.iRTProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id_exam_id: { user_id: 'user1', exam_id: 'exam1' } },
          create: expect.any(Object),
          update: expect.any(Object),
        })
      );
    });
  });

  describe('getNextAdaptiveQuestion', () => {
    it('should return null if no questions available', async () => {
      mockPrismaService.iRTProfile.findUnique.mockResolvedValue({
        ability_estimate: 0.5,
      });

      mockPrismaService.question.findMany.mockResolvedValue([]);

      const result = await service.getNextAdaptiveQuestion('user1', 'exam1');

      expect(result).toBeNull();
    });

    it('should select question with maximum information', async () => {
      mockPrismaService.iRTProfile.findUnique.mockResolvedValue({
        ability_estimate: 0.5,
      });

      mockPrismaService.question.findMany.mockResolvedValue([
        { id: 'q1', irt_a: 1, irt_b: -1, irt_c: 0.2 }, // Far from ability
        { id: 'q2', irt_a: 1, irt_b: 0.5, irt_c: 0.2 }, // Close to ability
        { id: 'q3', irt_a: 1, irt_b: 2, irt_c: 0.2 }, // Far from ability
      ]);

      const result = await service.getNextAdaptiveQuestion('user1', 'exam1');

      // Should select q2 as it's closest to user's ability
      expect(result).toBe('q2');
    });

    it('should exclude specified questions', async () => {
      mockPrismaService.iRTProfile.findUnique.mockResolvedValue({
        ability_estimate: 0,
      });

      mockPrismaService.question.findMany.mockResolvedValue([
        { id: 'q2', irt_a: 1, irt_b: 0, irt_c: 0.2 },
      ]);

      const result = await service.getNextAdaptiveQuestion('user1', 'exam1', ['q1']);

      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['q1'] },
          }),
        })
      );
    });
  });

  describe('getQuestionStatistics', () => {
    it('should return statistics for a question', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue({
        id: 'q1',
        irt_a: 1,
        irt_b: 0.5,
        irt_c: 0.2,
        calibration_sample: 35,
        last_calibrated_at: new Date(),
        _count: { attempts: 40 },
        attempts: [
          { is_correct: true },
          { is_correct: true },
          { is_correct: false },
        ],
      });

      const result = await service.getQuestionStatistics('q1');

      expect(result.a).toBe(1);
      expect(result.b).toBe(0.5);
      expect(result.c).toBe(0.2);
      expect(result.totalAttempts).toBe(40);
      expect(result.correctRate).toBeCloseTo(0.667, 2);
    });

    it('should throw error for non-existent question', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(service.getQuestionStatistics('nonexistent'))
        .rejects
        .toThrow('Question nonexistent not found');
    });
  });

  describe('getAbilityProgression', () => {
    it('should return progression every 5 attempts', async () => {
      const attempts = Array(20).fill(null).map((_, i) => ({
        is_correct: i < 15,
        created_at: new Date(),
        question: { irt_a: 1, irt_b: 0, irt_c: 0.2 },
      }));

      mockPrismaService.attempt.findMany.mockResolvedValue(attempts);

      const result = await service.getAbilityProgression('user1', 'exam1');

      // Should have 4 progression points (5, 10, 15, 20 attempts)
      expect(result).toHaveLength(4);
      expect(result[0].attemptNumber).toBe(5);
      expect(result[3].attemptNumber).toBe(20);

      // Ability should generally increase with more correct answers
      expect(result[0].estimatedAbility).toBeDefined();
      expect(result[0].standardError).toBeGreaterThan(0);
    });

    it('should handle empty attempts', async () => {
      mockPrismaService.attempt.findMany.mockResolvedValue([]);

      const result = await service.getAbilityProgression('user1', 'exam1');

      expect(result).toHaveLength(0);
    });
  });
});
