import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIOrchestrator } from './ai-orchestrator.service';
import { RAGService } from './rag.service';
import { AIUsageTrackingService } from './ai-usage-tracking.service';
import { ResponseCacheService } from './response-cache.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface TutorRequest {
  userId: string;
  message: string;
  conversationId?: string;
  examId?: string;
  questionId?: string; // For question-specific help
  includeContext?: boolean;
}

export interface TutorResponse {
  message: string;
  conversationId: string;
  sources?: string[];
  followUpSuggestions?: string[];
  cost: number;
}

@Injectable()
export class AITutorService {
  private readonly logger = new Logger(AITutorService.name);
  
  private readonly SYSTEM_PROMPT = `You are an expert AI tutor helping students prepare for standardized exams (GRE, SAT, GMAT, TOEFL, IELTS).

Your role:
- Provide clear, encouraging explanations
- Break down complex concepts into simple steps
- Give examples to illustrate points
- Suggest practice strategies
- Stay positive and supportive

Guidelines:
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for lists
- Cite sources when referencing specific questions
- Offer follow-up suggestions
- Never give direct answers to practice questions - guide students to find them
- Adapt to the student's level

Tone: Friendly, encouraging, professional`;

  constructor(
    private prisma: PrismaService,
    private aiOrchestrator: AIOrchestrator,
    private rag: RAGService,
    private usageTracking: AIUsageTrackingService,
    private cache: ResponseCacheService,
  ) {}

  /**
   * Main chat endpoint - handles all tutor interactions
   */
  async chat(request: TutorRequest): Promise<TutorResponse> {
    this.logger.log(`Tutor chat: User ${request.userId}, Conv ${request.conversationId || 'new'}`);

    try {
      // Check cache for similar queries (only for new conversations)
      if (!request.conversationId) {
        const cached = await this.cache.get(request.message, {
          examId: request.examId,
        });
        
        if (cached) {
          this.logger.log(`Using cached response (saved $${cached.cost.toFixed(4)})`);
          
          // Still create conversation for user
          const conversation = await this.getOrCreateConversation(
            request.userId,
            null,
            request.examId,
          );
          
          // Save messages to conversation
          await this.saveMessages(conversation.id, [
            { role: 'user', content: request.message },
            { role: 'assistant', content: cached.response },
          ]);
          
          return {
            message: cached.response,
            conversationId: conversation.id,
            sources: cached.sources,
            followUpSuggestions: await this.generateFollowUpSuggestions(
              request.message,
              cached.response,
              request.examId,
            ),
            cost: 0, // No cost for cached response
          };
        }
      }

      // 1. Get or create conversation
      const conversation = await this.getOrCreateConversation(
        request.userId,
        request.conversationId,
        request.examId,
      );

      // 2. Retrieve relevant context using RAG
      const ragContext = request.includeContext !== false
        ? await this.rag.retrieveContext(request.message, {
            examId: request.examId,
            topK: 3,
            includeExplanations: true,
            includeUserHistory: true,
            userId: request.userId,
          })
        : null;

      // 3. Build conversation history
      const messages = await this.buildMessageHistory(conversation.id, ragContext);

      // 4. Add user's new message
      messages.push({
        role: 'user',
        content: request.message,
      });

      // 5. Get AI response
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const aiResponse = await this.aiOrchestrator.generate({
        type: 'tutor',
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      // 6. Generate follow-up suggestions
      const followUpSuggestions = await this.generateFollowUpSuggestions(
        request.message,
        aiResponse.content,
        request.examId,
      );

      // 7. Save messages to database
      await this.saveMessages(conversation.id, [
        { role: 'user', content: request.message },
        { role: 'assistant', content: aiResponse.content },
      ]);

      // 8. Track usage (handled internally by orchestrator)

      // 9. Cache the response for future similar queries (only for new conversations)
      if (!request.conversationId) {
        await this.cache.set(
          request.message,
          aiResponse.content,
          { examId: request.examId },
          {
            sources: ragContext?.sources,
            cost: aiResponse.cost,
          },
        );
      }

      return {
        message: aiResponse.content,
        conversationId: conversation.id,
        sources: ragContext?.sources,
        followUpSuggestions,
        cost: aiResponse.cost,
      };
    } catch (error) {
      this.logger.error(`Tutor chat failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Explain a specific question
   */
  async explainQuestion(
    userId: string,
    questionId: string,
    userAnswer?: any,
  ): Promise<TutorResponse> {
    this.logger.log(`Explaining question ${questionId} for user ${userId}`);

    // Get question details
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        exam: { select: { name: true, code: true } },
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Build explanation prompt
    let prompt = `Please explain this ${question.exam.name} question:\n\n`;
    prompt += `Topic: ${question.topic}\n`;
    prompt += `Difficulty: ${question.difficulty_level}/5\n\n`;
    prompt += `Question:\n${question.question_text}\n\n`;

    if (question.question_type === 'MULTIPLE_CHOICE' && question.options) {
      prompt += 'Options:\n';
      const options = question.options as any[];
      options.forEach(opt => {
        prompt += `${opt.id}. ${opt.text}\n`;
      });
      prompt += '\n';
    }

    prompt += `Correct Answer: ${JSON.stringify(question.correct_answer)}\n\n`;

    if (userAnswer) {
      const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer);
      prompt += `Student's answer: ${JSON.stringify(userAnswer)} (${isCorrect ? 'Correct' : 'Incorrect'})\n\n`;
      
      if (!isCorrect) {
        prompt += 'Please explain:\n';
        prompt += '1. Why the correct answer is right\n';
        prompt += '2. Why the student\'s answer is wrong\n';
        prompt += '3. Common mistakes to avoid\n';
      } else {
        prompt += 'Please reinforce the correct reasoning and provide additional insights.\n';
      }
    } else {
      prompt += 'Please provide a clear explanation of the correct answer and the reasoning behind it.';
    }

    // Get AI explanation
    const response = await this.aiOrchestrator.generate({
      type: 'explanation',
      prompt,
      temperature: 0.7,
      maxTokens: 600,
    });

    return {
      message: response.content,
      conversationId: '', // One-off explanation, no conversation
      sources: [`Question ${questionId.substring(0, 8)} (${question.exam.code} - ${question.topic})`],
      cost: response.cost,
    };
  }

  /**
   * Get study tips for a specific topic
   */
  async getStudyTips(
    userId: string,
    examId: string,
    topic: string,
  ): Promise<TutorResponse> {
    this.logger.log(`Study tips for ${topic} (${examId})`);

    // Get exam details
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new Error('Exam not found');
    }

    // Build prompt
    const prompt = `Provide study tips and strategies for the following topic:\n\n`;
    const details = `Exam: ${exam.name} (${exam.code})\n`;
    const topicLine = `Topic: ${topic}\n\n`;
    const request = `Please provide:
1. Key concepts to understand
2. Common mistakes to avoid
3. Effective study strategies
4. Practice recommendations
5. Time management tips

Keep it concise and actionable.`;

    // Get AI response
    const response = await this.aiOrchestrator.generate({
      type: 'tutor',
      prompt: prompt + details + topicLine + request,
      temperature: 0.7,
      maxTokens: 500,
    });

    return {
      message: response.content,
      conversationId: '',
      cost: response.cost,
    };
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    examId?: string,
  ) {
    if (conversationId) {
      const existing = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (existing) return existing;
    }

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        user_id: userId,
        exam_id: examId,
        title: 'Study Session',
      },
    });
  }

  /**
   * Build message history for conversation
   */
  private async buildMessageHistory(
    conversationId: string,
    ragContext?: any,
  ): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: this.SYSTEM_PROMPT,
    });

    // Add RAG context if available
    if (ragContext && ragContext.documents.length > 0) {
      const contextContent = this.rag.formatContextForPrompt(ragContext);
      messages.push({
        role: 'system',
        content: `Context information to help answer the student's question:\n\n${contextContent}`,
      });
    }

    // Add conversation history (last 10 messages)
    const history = await this.prisma.conversationMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      take: 10,
    });

    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
      });
    }

    return messages;
  }

  /**
   * Save messages to database
   */
  private async saveMessages(
    conversationId: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    for (const msg of messages) {
      await this.prisma.conversationMessage.create({
        data: {
          conversation_id: conversationId,
          role: msg.role,
          content: msg.content,
        },
      });
    }

    // Update conversation's last activity
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updated_at: new Date() },
    });
  }

  /**
   * Generate follow-up suggestions
   */
  private async generateFollowUpSuggestions(
    userMessage: string,
    assistantResponse: string,
    examId?: string,
  ): Promise<string[]> {
    // Simple rule-based suggestions
    const suggestions: string[] = [];

    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = assistantResponse.toLowerCase();

    if (lowerMessage.includes('how') || lowerMessage.includes('why')) {
      suggestions.push('Can you give me an example?');
    }

    if (lowerResponse.includes('strategy') || lowerResponse.includes('technique')) {
      suggestions.push('How can I practice this?');
    }

    if (lowerMessage.includes('difficult') || lowerMessage.includes('hard')) {
      suggestions.push('What are some easier questions to start with?');
    }

    if (lowerResponse.includes('topic') || lowerResponse.includes('concept')) {
      suggestions.push('Are there related topics I should review?');
    }

    // Always include general suggestions
    suggestions.push('Show me a practice question');
    suggestions.push('What else should I know about this topic?');

    return suggestions.slice(0, 3); // Return top 3
  }

  /**
   * Get conversation history for a user
   */
  async getConversations(userId: string, examId?: string, limit = 20) {
    return this.prisma.conversation.findMany({
      where: {
        user_id: userId,
        ...(examId && { exam_id: examId }),
      },
      include: {
        exam: { select: { name: true, code: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // Just get last message for preview
        },
      },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Get specific conversation with all messages
   */
  async getConversation(conversationId: string, userId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        user_id: userId,
      },
      include: {
        exam: { select: { name: true, code: true } },
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  /**
   * Archive a conversation (soft delete via updated_at)
   */
  async archiveConversation(conversationId: string, userId: string) {
    // Simply mark as deleted by updating title
    return this.prisma.conversation.updateMany({
      where: {
        id: conversationId,
        user_id: userId,
      },
      data: {
        title: '[Archived] ' + new Date().toISOString(),
      },
    });
  }
}
