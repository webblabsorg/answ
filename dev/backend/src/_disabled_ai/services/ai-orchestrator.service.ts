import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { CohereProvider } from '../providers/cohere.provider';
import { AIProvider, AITask, AIResponse } from '../interfaces/ai-provider.interface';
import { AIUsageTrackingService } from './ai-usage-tracking.service';

@Injectable()
export class AIOrchestrator {
  private readonly logger = new Logger(AIOrchestrator.name);
  private providers: Map<string, AIProvider>;
  private healthStatus: Map<string, boolean>;

  constructor(
    private openai: OpenAIProvider,
    private anthropic: AnthropicProvider,
    private cohere: CohereProvider,
    private usageTracking: AIUsageTrackingService,
  ) {
    this.providers = new Map<string, AIProvider>();
    this.providers.set('openai', this.openai);
    this.providers.set('anthropic', this.anthropic);
    this.providers.set('cohere', this.cohere);
    
    this.healthStatus = new Map();
    this.initializeHealthChecks();
  }

  private async initializeHealthChecks() {
    for (const [name, provider] of this.providers) {
      const isAvailable = await provider.isAvailable();
      this.healthStatus.set(name, isAvailable);
      this.logger.log(`Provider ${name}: ${isAvailable ? 'available' : 'unavailable'}`);
    }
  }

  async generate(task: AITask): Promise<AIResponse> {
    const provider = this.selectProvider(task);
    
    try {
      const response = await this.executeWithTimeout(
        () => provider.generate(task),
        30000, // 30 second timeout
      );
      
      // Track usage
      await this.usageTracking.track({
        provider: provider.name,
        task_type: task.type,
        model: response.model,
        tokens_used: response.tokensUsed.total,
        cost: response.cost,
        latency_ms: response.latencyMs,
        success: true,
      });

      return response;
    } catch (error) {
      this.logger.error(`${provider.name} failed: ${error.message}`);
      
      // Track failure
      await this.usageTracking.track({
        provider: provider.name,
        task_type: task.type,
        tokens_used: 0,
        cost: 0,
        latency_ms: 0,
        success: false,
        error: error.message,
      });

      // Try fallback providers
      return this.executeWithFallback(task, provider.name);
    }
  }

  private selectProvider(task: AITask): AIProvider {
    // Priority-based selection
    if (task.priority === 'quality') {
      return this.getHealthyProvider('openai') || this.getHealthyProvider('anthropic');
    }
    
    if (task.priority === 'speed') {
      return this.getHealthyProvider('cohere') || this.getHealthyProvider('openai');
    }
    
    if (task.priority === 'cost') {
      return this.getHealthyProvider('cohere') || this.getHealthyProvider('openai');
    }
    
    // Default: least loaded (simplified to round-robin for now)
    return this.getLeastLoaded();
  }

  private getHealthyProvider(name: string): AIProvider | null {
    if (this.healthStatus.get(name)) {
      return this.providers.get(name);
    }
    return null;
  }

  private getLeastLoaded(): AIProvider {
    // Simplified: return first healthy provider
    for (const [name, provider] of this.providers) {
      if (this.healthStatus.get(name)) {
        return provider;
      }
    }
    throw new Error('No healthy AI providers available');
  }

  private async executeWithFallback(task: AITask, failedProvider: string): Promise<AIResponse> {
    const fallbackProviders = Array.from(this.providers.values())
      .filter(p => p.name !== failedProvider && this.healthStatus.get(p.name));

    for (const provider of fallbackProviders) {
      try {
        this.logger.log(`Trying fallback provider: ${provider.name}`);
        const response = await provider.generate(task);
        
        await this.usageTracking.track({
          provider: provider.name,
          task_type: task.type,
          model: response.model,
          tokens_used: response.tokensUsed.total,
          cost: response.cost,
          latency_ms: response.latencyMs,
          success: true,
          is_fallback: true,
        });
        
        return response;
      } catch (error) {
        this.logger.error(`Fallback ${provider.name} also failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), timeoutMs)
      ),
    ]);
  }

  async embed(text: string, preferredProvider = 'openai'): Promise<number[]> {
    const provider = this.getHealthyProvider(preferredProvider) || this.getLeastLoaded();
    
    try {
      return await provider.embed(text);
    } catch (error) {
      this.logger.error(`Embedding failed with ${provider.name}: ${error.message}`);
      
      // Try other providers
      for (const [name, p] of this.providers) {
        if (name !== provider.name && this.healthStatus.get(name)) {
          try {
            return await p.embed(text);
          } catch (e) {
            continue;
          }
        }
      }
      
      throw new Error('All embedding providers failed');
    }
  }

  async getProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.isAvailable();
        this.healthStatus.set(name, health[name]);
      } catch (error) {
        health[name] = false;
        this.healthStatus.set(name, false);
      }
    }
    
    return health;
  }
}
