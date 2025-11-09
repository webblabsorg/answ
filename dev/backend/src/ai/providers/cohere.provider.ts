import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CohereClient } from 'cohere-ai';
import { AIProvider, AITask, AIResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class CohereProvider implements AIProvider {
  readonly name = 'cohere';
  private client: CohereClient;
  private readonly logger = new Logger(CohereProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('COHERE_API_KEY');
    if (apiKey) {
      this.client = new CohereClient({ token: apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async generate(task: AITask): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Cohere not configured');
    }

    const startTime = Date.now();

    const response = await this.client.chat({
      model: task.model || 'command-r-plus',
      message: task.prompt,
      temperature: task.temperature ?? 0.7,
      maxTokens: task.maxTokens,
    });

    const latencyMs = Date.now() - startTime;
    
    // Cohere pricing (approximate)
    const promptTokens = response.meta?.tokens?.inputTokens || 0;
    const completionTokens = response.meta?.tokens?.outputTokens || 0;
    const costPerPromptToken = 0.0005 / 1000; // $0.0005 per 1K tokens
    const costPerCompletionToken = 0.0015 / 1000; // $0.0015 per 1K tokens
    const cost = 
      (promptTokens * costPerPromptToken) + 
      (completionTokens * costPerCompletionToken);

    this.logger.log(`Generated response in ${latencyMs}ms, cost: $${cost.toFixed(4)}`);

    return {
      content: response.text,
      model: 'command-r-plus',
      provider: this.name,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      cost,
      latencyMs,
    };
  }

  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('Cohere not configured');
    }

    const response = await this.client.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    return response.embeddings[0];
  }
}
