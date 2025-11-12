import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EssaysService } from './essays.service';
import { CreateEssayDto } from './dto/create-essay.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SearchDto } from './dto/search.dto';
import { AddSourceDto } from './dto/add-source.dto';
import type { Response } from 'express';
import { IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';

class ShareDto { @IsEmail() email!: string; @IsOptional() @IsString() role?: string }
class GradeDto { @IsNumber() score!: number; @IsOptional() @IsString() note?: string }

@Controller('essays')
@UseGuards(JwtAuthGuard)
export class EssaysController {
  constructor(private readonly essays: EssaysService) {}

  // Projects
  @Get('projects')
  async list(@Request() req) {
    return this.essays.listProjects(req.user.id);
  }

  @Post('projects')
  async create(@Request() req, @Body() dto: CreateEssayDto) {
    const p = await this.essays.createProject(req.user.id, dto.title, dto.subject);
    return p;
  }

  @Get('projects/:id')
  async get(@Param('id') id: string, @Request() req) {
    return this.essays.getProject(id, req.user.id);
  }

  // Document
  @Get('projects/:id/document')
  async getDoc(@Param('id') id: string, @Request() req) {
    const p = await this.essays.getProject(id, req.user.id);
    return p.document || { content: '' };
  }

  @Put('projects/:id/document')
  async updateDoc(@Param('id') id: string, @Request() req, @Body() dto: UpdateDocumentDto) {
    return this.essays.updateDocument(id, req.user.id, dto);
  }

  @Post('projects/:id/submit')
  async submit(@Param('id') id: string, @Request() req) {
    return this.essays.submit(id, req.user.id);
  }

  // Sources & Search
  @Post('search')
  async search(@Body() dto: SearchDto) {
    return this.essays.searchOpenAlex(dto.q);
  }

  @Get('projects/:id/sources')
  async listSources(@Param('id') id: string, @Request() req) {
    return this.essays.listSources(id, req.user.id);
  }

  @Post('projects/:id/sources')
  async addSource(@Param('id') id: string, @Request() req, @Body() dto: AddSourceDto) {
    return this.essays.addSource(id, req.user.id, dto);
  }

  // Export
  @Get('projects/:id/export')
  async export(@Param('id') id: string, @Request() req, @Query('fmt') fmt: string, @Res() res: Response) {
    if (fmt === 'txt' || !fmt) {
      const file = await this.essays.exportTxt(id, req.user.id);
      file.getStream().pipe(res);
      return;
    }
    if (fmt === 'pdf') {
      const file = await this.essays.exportPdf(id, req.user.id);
      file.getStream().pipe(res);
      return;
    }
    if (fmt === 'docx') {
      const file = await this.essays.exportDocx(id, req.user.id);
      file.getStream().pipe(res);
      return;
    }
    const file = await this.essays.exportTxt(id, req.user.id);
    file.getStream().pipe(res);
  }

  @Get('projects/:id/bibliography')
  async bibliography(@Param('id') id: string, @Request() req, @Query('style') style?: string) {
    return this.essays.bibliography(id, req.user.id, style);
  }

  @Get('projects/:id/shares')
  async shares(@Param('id') id: string, @Request() req) {
    return this.essays.listShares(id, req.user.id);
  }

  @Post('projects/:id/share')
  async share(@Param('id') id: string, @Request() req, @Body() dto: ShareDto) {
    return this.essays.share(id, req.user.id, dto.email, dto.role);
  }

  @Post('projects/:id/grade')
  async grade(@Param('id') id: string, @Request() req, @Body() dto: GradeDto) {
    return this.essays.grade(id, req.user.id, dto.score, dto.note);
  }
}
