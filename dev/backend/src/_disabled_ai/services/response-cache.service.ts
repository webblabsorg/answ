import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry {
  response: string;
  sources?: string[];
  cost: number;
  timestamp: number;
  hitCount: number;
}

@Injectable()
export class ResponseCacheService {
  private redis: Redis | null = null;
  private readonly logger = new Logger(ResponseCacheService.name);
  private readonly ttl = 86400; // 24 hours in seconds
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('CACHE_ENABLED') === 'true';
    
    if (this.enabled) {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      
      try {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          retryStrategy: (times) => {
            if (times > 3) {
              this.logger.warn('Redis connection failed, disabling cache');
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        });
        
        this.redis.on('connect', () => {
          this.logger.log('Response cache connected to Redis');
        });
        
        this.redis.on('error', (err) => {
          this.logger.error(`Redis error: ${err.message}`);
        });
      } catch (error) {
        this.logger.warn('Failed to initialize Redis cache, caching disabled');
        this.redis = null;
      }
    }
  }

  /**
   * Generate cache key from query and context
   */
  private generateKey(query: string, context: Record<string, any> = {}): string {
    const normalizedQuery = query.toLowerCase().trim();
    const contextStr = JSON.stringify(context);
    // Use first 100 chars of query + context hash
    return `tutor:${normalizedQuery.substring(0, 100)}:${this.hashString(contextStr)}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached response
   */
  async get(query: string, context: Record<string, any> = {}): Promise<CacheEntry | null> {
    if (!this.enabled || !this.redis) return null;

    try {
      const key = this.generateKey(query, context);
      const cached = await this.redis.get(key);
      
      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);
      
      // Increment hit count
      entry.hitCount++;
      await this.redis.setex(key, this.ttl, JSON.stringify(entry));
      
      this.logger.log(`Cache HIT for query: "${query.substring(0, 50)}..." (hits: ${entry.hitCount})`);
      return entry;
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set(
    query: string,
    response: string,
    context: Record<string, any> = {},
    metadata: { sources?: string[]; cost: number } = { cost: 0 },
  ): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const key = this.generateKey(query, context);
      const entry: CacheEntry = {
        response,
        sources: metadata.sources,
        cost: metadata.cost,
        timestamp: Date.now(),
        hitCount: 0,
      };
      
      await this.redis.setex(key, this.ttl, JSON.stringify(entry));
      this.logger.log(`Cache SET for query: "${query.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys('tutor:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cached responses`);
      }
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    totalEntries: number;
    topQueries: Array<{ query: string; hits: number }>;
    totalSavings: number;
  }> {
    if (!this.enabled || !this.redis) {
      return {
        enabled: false,
        totalEntries: 0,
        topQueries: [],
        totalSavings: 0,
      };
    }

    try {
      const keys = await this.redis.keys('tutor:*');
      const entries: CacheEntry[] = [];
      
      // Get all entries
      for (const key of keys.slice(0, 100)) { // Limit to 100 for performance
        const data = await this.redis.get(key);
        if (data) {
          entries.push(JSON.parse(data));
        }
      }
      
      // Calculate total savings (cost * hitCount)
      const totalSavings = entries.reduce((sum, entry) => {
        return sum + (entry.cost * entry.hitCount);
      }, 0);
      
      // Get top queries by hit count
      const topQueries = entries
        .sort((a, b) => b.hitCount - a.hitCount)
        .slice(0, 10)
        .map(entry => ({
          query: entry.response.substring(0, 50),
          hits: entry.hitCount,
        }));
      
      return {
        enabled: true,
        totalEntries: keys.length,
        topQueries,
        totalSavings,
      };
    } catch (error) {
      this.logger.error(`Cache stats error: ${error.message}`);
      return {
        enabled: true,
        totalEntries: 0,
        topQueries: [],
        totalSavings: 0,
      };
    }
  }

  /**
   * Invalidate cache for specific context (e.g., after content updates)
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(`tutor:*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cached responses matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate error: ${error.message}`);
    }
  }
}
