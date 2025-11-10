import { Injectable, Logger } from '@nestjs/common';

interface PayPalCheckoutParams {
  amount: number; // numeric, in target currency units
  currency: string; // e.g., USD, EUR, INR
  successUrl: string;
  cancelUrl: string;
  description?: string;
}

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);

  /**
   * Sandbox helper: returns a synthetic approval URL that points to PayPal sandbox
   * with query params. In production, replace with REST API v2 Orders create +
   * approve link extraction.
   */
  async createCheckoutSession(params: PayPalCheckoutParams): Promise<{ id: string; url: string }> {
    const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || 'sandbox-demo';
    const token = `PP-${Date.now()}`;
    const url = `https://www.sandbox.paypal.com/checkoutnow?token=${token}`
      + `&client_id=${encodeURIComponent(clientId)}`
      + `&amount=${encodeURIComponent(params.amount.toFixed(2))}`
      + `&currency=${encodeURIComponent(params.currency)}`
      + `&return_url=${encodeURIComponent(params.successUrl)}`
      + `&cancel_url=${encodeURIComponent(params.cancelUrl)}`
      + (params.description ? `&description=${encodeURIComponent(params.description)}` : '');

    this.logger.log(`Created PayPal sandbox approval URL for ${params.currency} ${params.amount}`);
    return { id: token, url };
  }
}