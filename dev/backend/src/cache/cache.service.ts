import { Injectable } from '@nestjs/common';

interface CacheStore {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

@Injectable()
export class CacheService {
  private cache: CacheStore = {};

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache[key];
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiry) {
      delete this.cache[key];
      return null;
    }

    return cached.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    this.cache[key] = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    };
  }

  async del(key: string): Promise<void> {
    delete this.cache[key];
  }

  async clear(): Promise<void> {
    this.cache = {};
  }

  // Clear expired entries
  async cleanup(): Promise<void> {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (this.cache[key].expiry < now) {
        delete this.cache[key];
      }
    });
  }
}
