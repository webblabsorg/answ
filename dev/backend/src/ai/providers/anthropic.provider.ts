import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AITask, AIResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async generate(task: AITask): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Anthropic not configured');
    }

    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: task.model || 'claude-3-5-sonnet-20241022',
      max_tokens: task.maxTokens || 4096,
      temperature: task.temperature ?? 0.7,
      messages: [{ role: 'user', content: task.prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const usage = response.usage;
    
    // Claude pricing (approximate)
    const costPerPromptToken = 0.003 / 1000; // $0.003 per 1K tokens
    const costPerCompletionToken = 0.015 / 1000; // $0.015 per 1K tokens
    const cost = 
      (usage.input_tokens * costPerPromptToken) + 
      (usage.output_tokens * costPerCompletionToken);

    this.logger.log(`Generated response in ${latencyMs}ms, cost: $${cost.toFixed(4)}`);

    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    return {
      content,
      model: response.model,
      provider: this.name,
      tokensUsed: {
        prompt: usage.input_tokens,
        completion: usage.output_tokens,
        total: usage.input_tokens + usage.output_tokens,
      },
      cost,
      latencyMs,
    };
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings, fallback to OpenAI or fail
    throw new Error('Anthropic does not support embeddings');
  }
}
