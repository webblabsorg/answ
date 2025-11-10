import { Injectable, Logger } from '@nestjs/common';

/**
 * Simple currency service with in-memory daily cache.
 * In production, plug Stripe FX rates or a provider like Fixer.io.
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

  // Fallback static rates (USD base) – update periodically
  private fallbackRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83,
    BRL: 5.6,
  };

  async getRates(): Promise<Record<string, number>> {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (this.cache && now - this.cache.fetchedAt < dayMs) {
      return this.cache.rates;
    }

    // TODO: fetch from Stripe FX rates or external provider
    this.logger.log('Using fallback currency rates');
    this.cache = { rates: this.fallbackRates, fetchedAt: now };
    return this.cache.rates;
  }

  async convertFromUSD(amountUsd: number, currency: string): Promise<number> {
    const rates = await this.getRates();
    const rate = rates[currency] || 1;
    return amountUsd * rate;
  }
}