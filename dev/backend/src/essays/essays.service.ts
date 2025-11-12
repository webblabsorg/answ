import { Injectable, ForbiddenException, NotFoundException, StreamableFile, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddSourceDto } from './dto/add-source.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EssaysService {
  constructor(private prisma: PrismaService, private http: HttpService) {}

  private dynReq(p: string): any {
    // Avoid webpack/ts resolver issues for optional deps
    return (eval('require') as NodeRequire)(p);
  }

  async listProjects(userId: string) {
    return this.prisma.essayProject.findMany({
      where: { owner_id: userId },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true, title: true, subject: true, status: true, mode: true,
        word_count: true, citations_count: true, created_at: true, updated_at: true,
      },
    });
  }

  async createProject(userId: string, title: string, subject?: string) {
    const project = await this.prisma.essayProject.create({
      data: { owner_id: userId, title, subject: subject || null },
    });
    await this.prisma.essayDocument.create({ data: { project_id: project.id, content: '' } });
    return project;
  }

  async getProject(projectId: string, userId: string) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId }, include: { document: true } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) {
      const shared = await this.prisma.essayShare.findFirst({ where: { project_id: projectId, user_id: userId } });
      if (!shared) throw new ForbiddenException('Access denied');
    }
    return p;
  }

  async updateDocument(projectId: string, userId: string, patch: { content?: string; format?: string; word_count?: number }) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.$transaction([
      this.prisma.essayDocument.update({
        where: { project_id: projectId },
        data: {
          content: patch.content ?? undefined,
          format: patch.format ?? undefined,
          autosave_rev: { increment: 1 },
        },
      }),
      this.prisma.essayProject.update({
        where: { id: projectId },
        data: {
          word_count: patch.word_count ?? p.word_count,
        },
      }),
    ]);

    return { ok: true };
  }

  async submit(projectId: string, userId: string) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) throw new ForbiddenException('Access denied');
    return this.prisma.essayProject.update({ where: { id: projectId }, data: { status: 'SUBMITTED', submitted_at: new Date() } });
  }

  async searchOpenAlex(query: string) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10&sort=relevance_score:desc`;
    const res = await firstValueFrom(this.http.get(url));
    const items = (res.data?.results || []).map((w: any) => ({
      title: w.display_name,
      year: w.publication_year,
      url: w.primary_location?.source?.homepage_url || w.primary_location?.landing_page_url,
      venue: w.primary_location?.source?.display_name,
      authors: (w.authorships || []).map((a: any) => a.author?.display_name),
      kind: w.type,
      credibility: Math.min(5, Math.max(1, Math.round((w.cited_by_count || 0) > 1000 ? 5 : (w.cited_by_count || 0) > 100 ? 4 : 3))),
      abstract: w.abstract_inverted_index ? Object.keys(w.abstract_inverted_index).slice(0, 60).join(' ') + '…' : undefined,
      citation: { openalex_id: w.id },
    }));
    return { items };
  }

  async addSource(projectId: string, userId: string, dto: AddSourceDto) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) throw new ForbiddenException('Access denied');
    return this.prisma.essaySource.create({ data: { project_id: projectId, ...dto, added_by: userId } });
  }

  async listSources(projectId: string, userId: string) {
    await this.assertAccess(projectId, userId);
    return this.prisma.essaySource.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
  }

  async exportTxt(projectId: string, userId: string) {
    await this.assertAccess(projectId, userId);
    const doc = await this.prisma.essayDocument.findUnique({ where: { project_id: projectId } });
    const buf = Buffer.from((doc?.content || '').toString(), 'utf8');
    return new StreamableFile(buf, { type: 'text/plain', disposition: `attachment; filename="essay-${projectId}.txt"` });
  }

  async exportPdf(projectId: string, userId: string) {
    await this.assertAccess(projectId, userId);
    const doc = await this.prisma.essayDocument.findUnique({ where: { project_id: projectId } });
    const content = (doc?.content || '').toString();
    const PDFKit = this.dynReq('pdfkit');
    const PDFDocument = PDFKit?.default || PDFKit;
    const pdf = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    return await new Promise<StreamableFile>((resolve) => {
      pdf.on('data', (c) => chunks.push(c));
      pdf.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(new StreamableFile(buf, { type: 'application/pdf', disposition: `attachment; filename="essay-${projectId}.pdf"` }));
      });
      pdf.fontSize(14).text(content || '', { align: 'left' });
      pdf.end();
    });
  }

  async exportDocx(projectId: string, userId: string) {
    await this.assertAccess(projectId, userId);
    const doc = await this.prisma.essayDocument.findUnique({ where: { project_id: projectId } });
    const content = (doc?.content || '').toString();
    const DX = this.dynReq('docx');
    const Document = DX.Document || DX?.default?.Document;
    const Packer = DX.Packer || DX?.default?.Packer;
    const Paragraph = DX.Paragraph || DX?.default?.Paragraph;
    const TextRun = DX.TextRun || DX?.default?.TextRun;
    const paragraphs = (content.split(/\n\n+/g).map((p) => new Paragraph({ children: [new TextRun(p)] }))) || [new Paragraph('')];
    const d = new Document({ sections: [{ children: paragraphs }] });
    const buf = await Packer.toBuffer(d);
    return new StreamableFile(buf, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', disposition: `attachment; filename="essay-${projectId}.docx"` });
  }

  async bibliography(projectId: string, userId: string, style: string = 'APA7') {
    await this.assertAccess(projectId, userId);
    const srcs = await this.prisma.essaySource.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'asc' } });
    const csl = srcs.map((s) => ({
      title: s.title,
      author: Array.isArray(s.authors) ? (s.authors as any[]).map((a) => ({ literal: String(a) })) : undefined,
      issued: s.year ? { 'date-parts': [[s.year]] } : undefined,
      URL: s.url || undefined,
      'container-title': s.venue || undefined,
      type: 'article-journal',
    }));
    try {
      const CJ = this.dynReq('citation-js');
      const Cite = CJ?.default || CJ;
      const cite = new Cite(csl);
      const template = style?.toUpperCase().startsWith('MLA') ? 'modern-language-association' : 'apa';
      const result = cite.format('bibliography', { format: 'text', template });
      const items = (Array.isArray(result) ? result : String(result).split(/\n/)).filter(Boolean);
      return { style, items };
    } catch {
      // Fallback minimal formatter
      const items = csl.map((s: any) => {
        const author = Array.isArray(s.author) && s.author.length ? s.author[0].literal : '';
        const year = s.issued?.['date-parts']?.[0]?.[0] || '';
        const parts = [author, year ? `(${year}).` : '', s.title + '.', s['container-title'] ? s['container-title'] + '.' : '', s.URL || '']
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return parts;
      });
      return { style, items };
    }
  }

  async share(projectId: string, userId: string, email: string, role: string = 'VIEWER') {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) throw new ForbiddenException('Only owner can share');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');
    return this.prisma.essayShare.upsert({
      where: { project_id_user_id: { project_id: projectId, user_id: user.id } },
      update: { role },
      create: { project_id: projectId, user_id: user.id, role },
    });
  }

  async listShares(projectId: string, userId: string) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) throw new ForbiddenException('Only owner can view shares');
    return this.prisma.essayShare.findMany({ where: { project_id: projectId }, include: { user: { select: { id: true, email: true, name: true } } } });
  }

  async grade(projectId: string, graderId: string, score: number, note?: string) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    // Allow instructor role or explicit TEACHER share
    const grader = await this.prisma.user.findUnique({ where: { id: graderId } });
    const isTeacher = grader?.role === 'INSTRUCTOR';
    const shared = await this.prisma.essayShare.findFirst({ where: { project_id: projectId, user_id: graderId, role: 'TEACHER' } });
    if (!isTeacher && !shared) throw new ForbiddenException('Not allowed to grade');
    return this.prisma.essayProject.update({ where: { id: projectId }, data: { status: 'GRADED', graded_at: new Date(), score, teacher_note: note || null } });
  }

  private async assertAccess(projectId: string, userId: string) {
    const p = await this.prisma.essayProject.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Essay not found');
    if (p.owner_id !== userId) {
      const shared = await this.prisma.essayShare.findFirst({ where: { project_id: projectId, user_id: userId } });
      if (!shared) throw new ForbiddenException('Access denied');
    }
  }
}
