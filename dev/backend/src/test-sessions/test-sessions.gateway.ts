import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class TestSessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeSessions = new Map<string, Set<string>>(); // sessionId -> Set of socket IDs

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up session subscriptions
    this.activeSessions.forEach((sockets, sessionId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeSessions.delete(sessionId);
      }
    });
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    
    // Join the session room
    client.join(`session:${sessionId}`);
    
    // Track active session
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Set());
    }
    this.activeSessions.get(sessionId).add(client.id);

    console.log(`Client ${client.id} joined session ${sessionId}`);
    
    return { status: 'joined', sessionId };
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    
    client.leave(`session:${sessionId}`);
    
    const sessionSockets = this.activeSessions.get(sessionId);
    if (sessionSockets) {
      sessionSockets.delete(client.id);
      if (sessionSockets.size === 0) {
        this.activeSessions.delete(sessionId);
      }
    }

    console.log(`Client ${client.id} left session ${sessionId}`);
    
    return { status: 'left', sessionId };
  }

  @SubscribeMessage('answer-submitted')
  handleAnswerSubmitted(
    @MessageBody() data: { sessionId: string; questionId: string; answered: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to others in the same session (for multi-user scenarios in future)
    client.to(`session:${data.sessionId}`).emit('answer-updated', {
      questionId: data.questionId,
      answered: data.answered,
    });
    
    return { status: 'broadcasted' };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { status: 'pong', timestamp: Date.now() };
  }

  // Server-side method to emit session state updates
  emitSessionUpdate(sessionId: string, update: any) {
    this.server.to(`session:${sessionId}`).emit('session-update', update);
  }

  // Emit timer updates
  emitTimerUpdate(sessionId: string, timeRemaining: number) {
    this.server.to(`session:${sessionId}`).emit('timer-update', {
      timeRemaining,
      timestamp: Date.now(),
    });
  }

  // Auto-save notification
  emitAutoSave(sessionId: string, success: boolean) {
    this.server.to(`session:${sessionId}`).emit('auto-save', {
      success,
      timestamp: Date.now(),
    });
  }
}
