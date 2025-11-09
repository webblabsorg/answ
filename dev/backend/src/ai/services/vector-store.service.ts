import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIProvider } from '../providers/openai.provider';

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private client: Pinecone;
  private index: any;
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly indexName = 'answly-questions';

  constructor(
    private configService: ConfigService,
    private openai: OpenAIProvider,
  ) {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    if (apiKey) {
      this.client = new Pinecone({ apiKey });
    }
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.warn('Pinecone not configured, vector search will not be available');
      return;
    }

    try {
      // Check if index exists, create if not
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        this.logger.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI embedding dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      this.index = this.client.index(this.indexName);
      this.logger.log('Pinecone vector store initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Pinecone: ${error.message}`);
    }
  }

  async upsert(id: string, text: string, metadata: Record<string, any> = {}) {
    if (!this.index) {
      this.logger.warn('Pinecone not available, skipping vector upsert');
      return;
    }

    try {
      // Generate embedding
      const embedding = await this.openai.embed(text);

      // Upsert to Pinecone
      await this.index.upsert([
        {
          id,
          values: embedding,
          metadata: {
            text,
            ...metadata,
            indexed_at: new Date().toISOString(),
          },
        },
      ]);

      this.logger.log(`Upserted vector for ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to upsert vector: ${error.message}`);
    }
  }

  async search(
    query: string,
    options: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
    } = {},
  ): Promise<VectorSearchResult[]> {
    if (!this.index) {
      this.logger.warn('Pinecone not available, returning empty results');
      return [];
    }

    try {
      // Generate query embedding
      const embedding = await this.openai.embed(query);

      // Search
      const searchResponse = await this.index.query({
        vector: embedding,
        topK: options.topK || 10,
        filter: options.filter,
        includeMetadata: options.includeMetadata ?? true,
      });

      return searchResponse.matches.map((match: any) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      }));
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return [];
    }
  }

  async findSimilar(id: string, topK = 5): Promise<VectorSearchResult[]> {
    if (!this.index) {
      return [];
    }

    try {
      // Fetch the vector for the given ID
      const fetchResponse = await this.index.fetch([id]);
      const vector = fetchResponse.records[id]?.values;

      if (!vector) {
        return [];
      }

      // Search for similar vectors
      const searchResponse = await this.index.query({
        vector,
        topK: topK + 1, // +1 because it will include itself
        includeMetadata: true,
      });

      // Filter out the query vector itself
      return searchResponse.matches
        .filter((match: any) => match.id !== id)
        .map((match: any) => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        }));
    } catch (error) {
      this.logger.error(`Find similar failed: ${error.message}`);
      return [];
    }
  }

  async delete(id: string) {
    if (!this.index) {
      return;
    }

    try {
      await this.index.deleteOne(id);
      this.logger.log(`Deleted vector for ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete vector: ${error.message}`);
    }
  }

  async deleteMany(ids: string[]) {
    if (!this.index || ids.length === 0) {
      return;
    }

    try {
      await this.index.deleteMany(ids);
      this.logger.log(`Deleted ${ids.length} vectors`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors: ${error.message}`);
    }
  }
}
