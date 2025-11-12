import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeerReviewDto, AssignPeerReviewsDto } from './dto/peer-review.dto';

@Injectable()
export class PeerReviewService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Peer Review Assignment
  // ============================================================================

  async assignPeerReviews(dto: AssignPeerReviewsDto, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homework_id },
      include: {
        submissions: {
          where: {
            status: 'SUBMITTED',
          },
          include: {
            student: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!homework || homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    if (!homework.requires_peer_review) {
      throw new BadRequestException('This homework does not require peer reviews');
    }

    const submissions = homework.submissions;
    if (submissions.length < 2) {
      throw new BadRequestException('Not enough submissions for peer review');
    }

    const reviews: any[] = [];

    // Assign reviews in a round-robin fashion
    for (let i = 0; i < submissions.length; i++) {
      const reviewer = submissions[i];

      for (let j = 1; j <= dto.reviews_per_student; j++) {
        const revieweeIndex = (i + j) % submissions.length;
        const reviewee = submissions[revieweeIndex];

        // Don't assign self-reviews
        if (reviewer.student_id === reviewee.student_id) continue;

        reviews.push({
          homework_id: dto.homework_id,
          reviewer_id: reviewer.student_id!,
          submission_id: reviewee.id,
          reviewer_submission_id: reviewer.id,
          status: 'pending',
        });
      }
    }

    // Create peer review assignments
    await this.prisma.peerReview.createMany({
      data: reviews,
      skipDuplicates: true,
    });

    return {
      assigned: reviews.length,
      reviewsPerStudent: dto.reviews_per_student,
    };
  }

  // ============================================================================
  // Peer Review Submission
  // ============================================================================

  async createReview(reviewerId: string, dto: CreatePeerReviewDto) {
    // Find the peer review assignment
    const assignment = await this.prisma.peerReview.findUnique({
      where: {
        reviewer_id_submission_id: {
          reviewer_id: reviewerId,
          submission_id: dto.submission_id,
        },
      },
      include: {
        submission: {
          include: {
            homework: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Peer review assignment not found');
    }

    // Check if reviewer has submitted their own work
    const reviewerSubmission = await this.prisma.homeworkSubmission.findUnique({
      where: {
        homework_id_student_id: {
          homework_id: dto.homework_id,
          student_id: reviewerId,
        },
      },
    });

    if (!reviewerSubmission || reviewerSubmission.status !== 'SUBMITTED') {
      throw new BadRequestException('You must submit your own work before reviewing others');
    }

    // Update the peer review
    return this.prisma.peerReview.update({
      where: { id: assignment.id },
      data: {
        rating: dto.rating,
        feedback: dto.feedback,
        rubric_scores: dto.rubric_scores,
        strengths: dto.strengths,
        improvements: dto.improvements,
        status: 'completed',
        submitted_at: new Date(),
      },
    });
  }

  async findReviewsForStudent(studentId: string, homeworkId: string) {
    // Reviews the student needs to complete
    const toComplete = await this.prisma.peerReview.findMany({
      where: {
        reviewer_id: studentId,
        homework_id: homeworkId,
      },
      include: {
        submission: {
          select: {
            id: true,
            content: true,
            files: true,
            student: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Reviews received for student's submission
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: {
        homework_id_student_id: {
          homework_id: homeworkId,
          student_id: studentId,
        },
      },
    });

    const received = submission
      ? await this.prisma.peerReview.findMany({
          where: {
            submission_id: submission.id,
            status: 'completed',
          },
          include: {
            reviewer: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

    return {
      toComplete,
      received,
      summary: {
        totalAssigned: toComplete.length,
        completed: toComplete.filter((r) => r.status === 'completed').length,
        averageRating:
          received.length > 0
            ? received.reduce((sum, r) => sum + (r.rating || 0), 0) / received.length
            : null,
      },
    };
  }

  // ============================================================================
  // Teacher View
  // ============================================================================

  async getPeerReviewStatus(homeworkId: string, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });

    if (!homework || homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    const reviews = await this.prisma.peerReview.findMany({
      where: { homework_id: homeworkId },
      include: {
        reviewer: {
          select: { id: true, name: true },
        },
        submission: {
          select: {
            student: {
              select: { name: true },
            },
          },
        },
      },
    });

    const total = reviews.length;
    const completed = reviews.filter((r) => r.status === 'completed').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Group by reviewer
    const byReviewer = reviews.reduce((acc, review) => {
      const reviewerId = review.reviewer_id;
      if (!acc[reviewerId]) {
        acc[reviewerId] = {
          reviewerId,
          reviewerName: review.reviewer.name,
          assigned: 0,
          completed: 0,
        };
      }
      acc[reviewerId].assigned++;
      if (review.status === 'completed') {
        acc[reviewerId].completed++;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      total,
      completed,
      completionRate: Math.round(completionRate),
      byReviewer: Object.values(byReviewer),
    };
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getReviewQuality(submissionId: string) {
    const reviews = await this.prisma.peerReview.findMany({
      where: {
        submission_id: submissionId,
        status: 'completed',
      },
    });

    if (reviews.length === 0) {
      return null;
    }

    const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;

    // Calculate variance in ratings (consistency)
    const variance =
      reviews.reduce((sum, r) => sum + Math.pow((r.rating || 0) - avgRating, 2), 0) /
      reviews.length;

    const feedbackLength = reviews.reduce(
      (sum, r) => sum + (r.feedback?.length || 0),
      0,
    ) / reviews.length;

    return {
      reviewCount: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingVariance: Math.round(variance * 100) / 100,
      averageFeedbackLength: Math.round(feedbackLength),
      consistency: variance < 1 ? 'high' : variance < 2 ? 'medium' : 'low',
    };
  }
}
