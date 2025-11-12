import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, AddGroupMemberDto, UpdateContributionDto } from './dto/group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Group Management
  // ============================================================================

  async createGroup(dto: CreateGroupDto) {
    // Verify homework allows groups
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homework_id },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    if (!homework.is_group_assignment) {
      throw new BadRequestException('This homework does not allow group submissions');
    }

    // Validate group size
    if (homework.group_size_min && dto.member_ids.length < homework.group_size_min) {
      throw new BadRequestException(
        `Group must have at least ${homework.group_size_min} members`,
      );
    }

    if (homework.group_size_max && dto.member_ids.length > homework.group_size_max) {
      throw new BadRequestException(
        `Group cannot exceed ${homework.group_size_max} members`,
      );
    }

    // Create group
    const group = await this.prisma.homeworkGroup.create({
      data: {
        homework_id: dto.homework_id,
        name: dto.name,
      },
    });

    // Add members
    const members = dto.member_ids.map((student_id, index) => ({
      group_id: group.id,
      student_id,
      role: index === 0 ? 'leader' : 'member', // First member is leader
    }));

    await this.prisma.homeworkGroupMember.createMany({
      data: members,
    });

    // Create group submission
    await this.prisma.homeworkSubmission.create({
      data: {
        homework_id: dto.homework_id,
        group_id: group.id,
        status: 'NOT_STARTED',
        max_score: homework.points,
      },
    });

    return this.findGroupById(group.id);
  }

  async findGroupById(id: string) {
    const group = await this.prisma.homeworkGroup.findUnique({
      where: { id },
      include: {
        homework: true,
        members: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        submission: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async findGroupsByHomework(homeworkId: string) {
    return this.prisma.homeworkGroup.findMany({
      where: { homework_id: homeworkId },
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            score: true,
            submitted_at: true,
          },
        },
      },
    });
  }

  async addMember(groupId: string, dto: AddGroupMemberDto) {
    const group = await this.findGroupById(groupId);

    // Check group size limits
    const homework = group.homework;
    if (homework.group_size_max && group.members.length >= homework.group_size_max) {
      throw new BadRequestException(
        `Group has reached maximum size of ${homework.group_size_max}`,
      );
    }

    // Check if student already in a group for this homework
    const existing = await this.prisma.homeworkGroupMember.findFirst({
      where: {
        student_id: dto.student_id,
        group: {
          homework_id: group.homework_id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Student is already in a group for this homework');
    }

    return this.prisma.homeworkGroupMember.create({
      data: {
        group_id: groupId,
        student_id: dto.student_id,
        role: dto.role || 'member',
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async removeMember(groupId: string, studentId: string) {
    const member = await this.prisma.homeworkGroupMember.findFirst({
      where: {
        group_id: groupId,
        student_id: studentId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    return this.prisma.homeworkGroupMember.delete({
      where: { id: member.id },
    });
  }

  async updateContribution(dto: UpdateContributionDto) {
    const member = await this.prisma.homeworkGroupMember.findFirst({
      where: {
        group_id: dto.group_id,
        student_id: dto.student_id,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    return this.prisma.homeworkGroupMember.update({
      where: { id: member.id },
      data: {
        contribution_score: dto.contribution_score,
      },
    });
  }

  // ============================================================================
  // Auto Group Formation
  // ============================================================================

  async autoFormGroups(homeworkId: string, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!homework || homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    if (!homework.is_group_assignment || !homework.class) {
      throw new BadRequestException('Invalid homework for auto-grouping');
    }

    const students = homework.class.enrollments.map((e) => e.student);
    const groupSize = homework.group_size_max || 4;
    const numGroups = Math.ceil(students.length / groupSize);

    // Shuffle students for random grouping
    const shuffled = students.sort(() => Math.random() - 0.5);

    const groups = [];
    for (let i = 0; i < numGroups; i++) {
      const start = i * groupSize;
      const end = Math.min(start + groupSize, students.length);
      const groupMembers = shuffled.slice(start, end);

      if (groupMembers.length > 0) {
        const group = await this.createGroup({
          homework_id: homeworkId,
          name: `Group ${i + 1}`,
          member_ids: groupMembers.map((s) => s.id),
        });
        groups.push(group);
      }
    }

    return groups;
  }

  // ============================================================================
  // Collaboration Analytics
  // ============================================================================

  async getGroupAnalytics(groupId: string) {
    const group = await this.findGroupById(groupId);
    const submission = group.submission;

    if (!submission || !submission.edit_history) {
      return {
        groupId,
        totalEdits: 0,
        memberContributions: [],
        collaborationScore: 0,
      };
    }

    const editHistory = submission.edit_history as any[];
    const contributions = new Map<string, number>();

    // Count edits per member
    editHistory.forEach((edit) => {
      const userId = edit.userId;
      contributions.set(userId, (contributions.get(userId) || 0) + 1);
    });

    const memberContributions = group.members.map((member) => ({
      studentId: member.student_id,
      studentName: member.student.name,
      editCount: contributions.get(member.student_id) || 0,
      contributionScore: member.contribution_score,
    }));

    // Calculate collaboration score (0-100)
    // Higher score means more equal participation
    const editCounts = memberContributions.map((m) => m.editCount);
    const avg = editCounts.reduce((a, b) => a + b, 0) / editCounts.length;
    const variance =
      editCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) /
      editCounts.length;
    const stdDev = Math.sqrt(variance);
    const collaborationScore = Math.max(0, 100 - stdDev * 10);

    return {
      groupId,
      groupName: group.name,
      totalEdits: editHistory.length,
      memberContributions,
      collaborationScore: Math.round(collaborationScore),
    };
  }
}
