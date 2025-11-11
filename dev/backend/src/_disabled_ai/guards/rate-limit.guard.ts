import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private redis: Redis | null = null;
  private readonly enabled: boolean;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('RATE_LIMIT_ENABLED') === 'true';
    this.maxRequests = this.configService.get<number>('RATE_LIMIT_MAX', 30); // 30 requests
    this.windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW', 60000); // per 1 minute
    
    if (this.enabled) {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      
      try {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
        });
      } catch (error) {
        console.warn('Rate limiting disabled: Redis connection failed');
        this.redis = null;
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return true; // Allow if rate limiting is disabled
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    
    if (!userId) {
      // If no user, use IP address
      const ip = request.ip || request.connection.remoteAddress;
      return this.checkRateLimit(`ip:${ip}`);
    }
    
    return this.checkRateLimit(`user:${userId}`);
  }

  private async checkRateLimit(key: string): Promise<boolean> {
    if (!this.redis) return true;

    const redisKey = `ratelimit:tutor:${key}`;
    
    try {
      const current = await this.redis.incr(redisKey);
      
      // Set expiry on first request
      if (current === 1) {
        await this.redis.pexpire(redisKey, this.windowMs);
      }
      
      if (current > this.maxRequests) {
        const ttl = await this.redis.pttl(redisKey);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(ttl / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // On Redis error, allow the request
      console.error('Rate limit check failed:', error);
      return true;
    }
  }
}
