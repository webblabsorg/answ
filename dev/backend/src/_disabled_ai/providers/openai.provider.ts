import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIProvider, AITask, AIResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async generate(task: AITask): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: task.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: task.prompt }],
      temperature: task.temperature ?? 0.7,
      max_tokens: task.maxTokens,
      response_format: task.responseFormat,
    });

    const latencyMs = Date.now() - startTime;
    const usage = response.usage;
    
    // OpenAI pricing (approximate, as of 2024)
    const costPerPromptToken = 0.01 / 1000; // $0.01 per 1K tokens
    const costPerCompletionToken = 0.03 / 1000; // $0.03 per 1K tokens
    const cost = 
      (usage.prompt_tokens * costPerPromptToken) + 
      (usage.completion_tokens * costPerCompletionToken);

    this.logger.log(`Generated response in ${latencyMs}ms, cost: $${cost.toFixed(4)}`);

    return {
      content: response.choices[0].message.content,
      model: response.model,
      provider: this.name,
      tokensUsed: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      },
      cost,
      latencyMs,
    };
  }

  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
