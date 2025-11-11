import { Controller, Get, Post, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('calendar')
export class CalendarController {
  constructor(private prisma: PrismaService) {}

  private getSigningSecret() {
    return process.env.ICS_SIGNING_SECRET || process.env.JWT_SECRET || 'change_me';
  }

  private sign(userId: string) {
    return crypto.createHmac('sha256', this.getSigningSecret()).update(userId).digest('hex');
  }

  private verify(userId: string, token: string) {
    return this.sign(userId) === token;
  }

  @Get('ics/:userId/:token')
  async ics(@Param('userId') userId: string, @Param('token') token: string, @Res() res: Response) {
    if (!this.verify(userId, token)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: { student_id: userId },
      include: { homework: true },
      orderBy: { created_at: 'desc' },
    });

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Answly//Homework//EN',
    ];

    for (const s of submissions) {
      if (!s.homework?.due_date) continue;
      const dt = new Date(s.homework.due_date);
      const dtStr = dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${s.id}@answly`);
      lines.push(`DTSTAMP:${dtStr}`);
      lines.push(`DTSTART:${dtStr}`);
      lines.push(`SUMMARY:${s.homework.subject} - ${s.homework.title}`);
      lines.push(`DESCRIPTION:Status ${s.status}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(lines.join('\r\n'));
  }

  @Get('connect/google')
  async connectGoogle() {
    throw new HttpException('Not Implemented', HttpStatus.NOT_IMPLEMENTED);
  }

  @Get('oauth/google/callback')
  async oauthCallback() {
    throw new HttpException('Not Implemented', HttpStatus.NOT_IMPLEMENTED);
  }

  @Post('disconnect/google')
  async disconnectGoogle() {
    return { success: true };
  }
}
