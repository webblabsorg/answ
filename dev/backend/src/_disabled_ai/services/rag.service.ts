import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { VectorStoreService } from './vector-store.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface Document {
  pageContent: string;
  metadata: Record<string, any>;
}

export interface RAGContext {
  documents: Document[];
  score: number;
  sources: string[];
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private embeddings: OpenAIEmbeddings;

  constructor(
    private configService: ConfigService,
    private vectorStore: VectorStoreService,
    private prisma: PrismaService,
  ) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: this.configService.get('OPENAI_API_KEY'),
      modelName: 'text-embedding-3-small',
    });
  }

  /**
   * Retrieve relevant context for a user query using RAG
   */
  async retrieveContext(
    query: string,
    options: {
      examId?: string;
      topK?: number;
      includeExplanations?: boolean;
      includeUserHistory?: boolean;
      userId?: string;
    } = {},
  ): Promise<RAGContext> {
    const topK = options.topK || 5;
    this.logger.log(`Retrieving context for query: "${query.substring(0, 50)}..."`);

    const results: Document[] = [];
    const sources: string[] = [];

    try {
      // 1. Search questions database
      const questionResults = await this.searchQuestions(query, {
        examId: options.examId,
        topK,
      });
      results.push(...questionResults.documents);
      sources.push(...questionResults.sources);

      // 2. Search explanations if requested
      if (options.includeExplanations) {
        const explanationResults = await this.searchExplanations(query, {
          examId: options.examId,
          topK: Math.ceil(topK / 2),
        });
        results.push(...explanationResults.documents);
        sources.push(...explanationResults.sources);
      }

      // 3. Include user's past incorrect answers for personalization
      if (options.includeUserHistory && options.userId) {
        const historyResults = await this.getUserHistory(options.userId, {
          examId: options.examId,
          limit: 3,
        });
        results.push(...historyResults.documents);
        sources.push(...historyResults.sources);
      }

      // Calculate average relevance score
      const avgScore = results.length > 0
        ? results.reduce((sum, doc) => sum + (doc.metadata.score || 0), 0) / results.length
        : 0;

      this.logger.log(`Retrieved ${results.length} documents with avg score ${avgScore.toFixed(3)}`);

      return {
        documents: results,
        score: avgScore,
        sources: Array.from(new Set(sources)), // Remove duplicates
      };
    } catch (error) {
      this.logger.error(`RAG retrieval failed: ${error.message}`, error.stack);
      return {
        documents: [],
        score: 0,
        sources: [],
      };
    }
  }

  /**
   * Search questions database
   */
  private async searchQuestions(
    query: string,
    options: { examId?: string; topK: number },
  ): Promise<{ documents: Document[]; sources: string[] }> {
    // Search vector store
    const vectorResults = await this.vectorStore.search(query, {
      topK: options.topK * 2, // Get more for filtering
    });

    // Get full question details from database
    const questionIds = vectorResults.map(r => r.id);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        exam: { select: { name: true, code: true } },
      },
    });

    const documents = questions.slice(0, options.topK).map(q => {
      const match = vectorResults.find(r => r.id === q.id);
      return {
        pageContent: `Question: ${q.question_text}\n\nAnswer: ${JSON.stringify(q.correct_answer)}\n\nExplanation: ${q.explanation || 'N/A'}`,
        metadata: {
          type: 'question',
          questionId: q.id,
          topic: q.topic,
          difficulty: q.difficulty_level,
          exam: q.exam.name,
          score: match?.score || 0,
        },
      };
    });

    const sources = questions.map(q => 
      `Question ${q.id.substring(0, 8)} (${q.exam.code} - ${q.topic})`
    );

    return { documents, sources };
  }

  /**
   * Search explanations
   */
  private async searchExplanations(
    query: string,
    options: { examId?: string; topK: number },
  ): Promise<{ documents: Document[]; sources: string[] }> {
    // Get questions with detailed explanations
    const questions = await this.prisma.question.findMany({
      where: {
        ...(options.examId && { exam_id: options.examId }),
        explanation: { not: null },
      },
      include: {
        exam: { select: { name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50, // Get recent explained questions
    });

    // Filter by relevance using simple text matching
    const relevant = questions
      .map(q => ({
        question: q,
        relevance: this.calculateTextRelevance(query, q.explanation || ''),
      }))
      .filter(item => item.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, options.topK);

    const documents = relevant.map(item => ({
      pageContent: `Topic: ${item.question.topic}\n\nExplanation: ${item.question.explanation}`,
      metadata: {
        type: 'explanation',
        questionId: item.question.id,
        topic: item.question.topic,
        exam: item.question.exam.name,
        score: item.relevance,
      },
    }));

    const sources = relevant.map(item =>
      `Explanation for ${item.question.topic} (${item.question.exam.code})`
    );

    return { documents, sources };
  }

  /**
   * Get user's history for personalization
   */
  private async getUserHistory(
    userId: string,
    options: { examId?: string; limit: number },
  ): Promise<{ documents: Document[]; sources: string[] }> {
    // Get user's recent exam sessions and incorrect answers
    // For now, return empty as Answer model doesn't exist yet
    // This will be populated when exam session tracking is implemented
    
    return { documents: [], sources: [] };
  }

  /**
   * Calculate text relevance using simple TF-IDF-like scoring
   */
  private calculateTextRelevance(query: string, text: string): number {
    const queryTokens = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    
    let score = 0;
    for (const token of queryTokens) {
      if (token.length < 3) continue; // Skip short words
      if (textLower.includes(token)) {
        score += 1;
      }
    }
    
    return Math.min(score / queryTokens.length, 1.0);
  }

  /**
   * Format context for LLM prompt
   */
  formatContextForPrompt(context: RAGContext): string {
    if (context.documents.length === 0) {
      return 'No relevant context found.';
    }

    let formatted = 'Relevant information:\n\n';
    
    context.documents.forEach((doc, index) => {
      formatted += `[${index + 1}] ${doc.metadata.type.toUpperCase()}`;
      formatted += ` (${doc.metadata.exam} - ${doc.metadata.topic}):\n`;
      formatted += `${doc.pageContent}\n\n`;
    });

    formatted += '\nSources:\n';
    context.sources.forEach((source, index) => {
      formatted += `[${index + 1}] ${source}\n`;
    });

    return formatted;
  }

  /**
   * Index a new question for RAG retrieval
   */
  async indexQuestion(questionId: string): Promise<void> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { exam: true },
    });

    if (!question) {
      this.logger.warn(`Question ${questionId} not found for indexing`);
      return;
    }

    const text = `${question.question_text} ${question.explanation || ''}`;

    await this.vectorStore.upsert(question.id, text, {
      type: 'question',
      exam_id: question.exam_id,
      topic: question.topic,
      difficulty: question.difficulty_level,
    });

    this.logger.log(`Indexed question ${questionId} for RAG`);
  }

  /**
   * Batch index multiple questions
   */
  async indexQuestions(questionIds: string[]): Promise<void> {
    this.logger.log(`Batch indexing ${questionIds.length} questions`);
    
    for (const questionId of questionIds) {
      await this.indexQuestion(questionId);
    }
  }
}
