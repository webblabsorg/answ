import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { HomeworkService } from '../homework/homework.service';

@WebSocketGateway({ namespace: '/collab', cors: { origin: true, credentials: true } })
export class CollabGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private io: Server;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private homeworkService: HomeworkService,
  ) {}

  afterInit(server: Server) {
    this.io = server;
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth as any)?.token || (client.handshake.headers['authorization'] as string)?.replace('Bearer ', '');
      if (!token) throw new Error('No token');
      const payload = this.jwt.decode(token) as any;
      if (!payload?.sub) throw new Error('Invalid token');
      (client.data as any).user = { id: payload.sub };
      client.emit('connected', { ok: true });
    } catch (_) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join_room')
  async onJoinRoom(@MessageBody() body: { homeworkId: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user;
    if (!user?.id) return client.emit('error', { message: 'Unauthorized' });
    try {
      // Basic access check: reuse homeworkService access rules
      const allowed = await (this.homeworkService as any).checkAccess?.(body.homeworkId, user.id);
      if (!allowed) return client.emit('error', { message: 'Forbidden' });
    } catch {
      // Fallback: verify homework exists
      const hw = await this.prisma.homework.findUnique({ where: { id: body.homeworkId } });
      if (!hw) return client.emit('error', { message: 'Not found' });
    }
    const room = `hw:${body.homeworkId}`;
    await client.join(room);
    this.io.to(room).emit('presence', { userId: user.id, type: 'join' });
    client.emit('joined', { room });
  }

  @SubscribeMessage('leave_room')
  async onLeaveRoom(@MessageBody() body: { homeworkId: string }, @ConnectedSocket() client: Socket) {
    const room = `hw:${body.homeworkId}`;
    await client.leave(room);
    const user = (client.data as any).user;
    this.io.to(room).emit('presence', { userId: user?.id, type: 'leave' });
  }

  @SubscribeMessage('cursor_update')
  async onCursor(@MessageBody() body: { homeworkId: string; selection: any; ts?: number }, @ConnectedSocket() client: Socket) {
    const room = `hw:${body.homeworkId}`;
    const user = (client.data as any).user;
    client.to(room).emit('cursor', { userId: user?.id, selection: body.selection, ts: body.ts || Date.now() });
  }

  @SubscribeMessage('content_snapshot')
  async onSnapshot(@MessageBody() body: { homeworkId: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user;
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { homework_id: body.homeworkId, student_id: user.id },
      select: { id: true, content: true, version_count: true },
    });
    client.emit('snapshot', { content: submission?.content || '', serverRev: submission?.version_count || 1 });
  }

  @SubscribeMessage('content_patch')
  async onPatch(
    @MessageBody() body: { homeworkId: string; content: string; clientRev?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client.data as any).user;
    // Upsert student submission for this homework
    const hw = await this.prisma.homework.findUnique({ where: { id: body.homeworkId } });
    if (!hw) return client.emit('error', { message: 'Homework not found' });

    // Ensure submission exists
    let sub = await this.prisma.homeworkSubmission.findFirst({ where: { homework_id: body.homeworkId, student_id: user.id } });
    if (!sub) {
      sub = await this.prisma.homeworkSubmission.create({
        data: {
          homework_id: body.homeworkId,
          student_id: user.id,
          status: 'IN_PROGRESS',
          max_score: hw.points,
          content: body.content || '',
          version_count: 1,
          edit_history: [{ userId: user.id, timestamp: new Date().toISOString(), changes: { init: true } }],
        } as any,
      });
    } else {
      const history = (sub.edit_history as any[]) || [];
      history.push({ userId: user.id, timestamp: new Date().toISOString(), changes: { contentLength: body.content?.length } });
      sub = await this.prisma.homeworkSubmission.update({
        where: { id: sub.id },
        data: { content: body.content || '', version_count: { increment: 1 }, edit_history: history },
      });
    }

    const room = `hw:${body.homeworkId}`;
    const payload = { content: sub.content || '', serverRev: sub.version_count, userId: user.id };
    client.emit('ack', payload);
    client.to(room).emit('content_update', payload);
  }
}
