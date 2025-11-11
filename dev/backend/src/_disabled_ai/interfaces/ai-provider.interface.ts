export interface AITask {
  type: 'question_generation' | 'explanation' | 'tutor' | 'embedding';
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'text' | 'json_object' };
  priority?: 'quality' | 'speed' | 'cost';
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  latencyMs: number;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(task: AITask): Promise<AIResponse>;
  embed(text: string): Promise<number[]>;
}
