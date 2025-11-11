import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Calculate tax for checkout
   */
  async calculateTax(
    amount: number,
    currency: string,
    country: string,
    postalCode?: string,
    vatId?: string,
  ) {
    try {
      // Use Stripe Tax for automatic tax calculation
      const taxCalculation = await this.stripe.tax.calculations.create({
        currency: currency.toLowerCase(),
        line_items: [
          {
            amount,
            reference: 'subscription',
          },
        ],
        customer_details: {
          address: {
            country,
            postal_code: postalCode,
          },
          address_source: 'billing',
        },
      });

      return {
        amount_total: taxCalculation.amount_total,
        tax_amount: taxCalculation.tax_amount_exclusive,
        tax_breakdown: taxCalculation.tax_breakdown,
      };
    } catch (error) {
      this.logger.error('Tax calculation failed:', error);
      return {
        amount_total: amount,
        tax_amount: 0,
        tax_breakdown: [],
      };
    }
  }

  /**
   * Validate VAT ID
   */
  async validateVatId(vatId: string, country: string): Promise<boolean> {
    try {
      // Use Stripe Tax ID validation
      const validation = await this.stripe.customers.createSource(
        'test', // This is just for validation
        {
          source: {
            type: 'tax_id',
            tax_id: vatId,
            country,
          } as any,
        },
      );

      return true;
    } catch (error) {
      this.logger.warn(`VAT ID validation failed for ${vatId}:`, error);
      return false;
    }
  }

  /**
   * Get tax rates for country
   */
  async getTaxRates(country: string) {
    // Standard VAT/GST rates by country
    const taxRates: Record<string, { rate: number; name: string }> = {
      US: { rate: 0, name: 'No VAT' }, // State sales tax handled separately
      GB: { rate: 20, name: 'VAT' },
      DE: { rate: 19, name: 'VAT' },
      FR: { rate: 20, name: 'VAT' },
      ES: { rate: 21, name: 'VAT' },
      IT: { rate: 22, name: 'VAT' },
      IN: { rate: 18, name: 'GST' },
      AU: { rate: 10, name: 'GST' },
      CA: { rate: 5, name: 'GST' }, // + Provincial taxes
      NZ: { rate: 15, name: 'GST' },
      SG: { rate: 8, name: 'GST' },
    };

    return taxRates[country] || { rate: 0, name: 'No tax' };
  }

  /**
   * Generate tax summary for organization
   */
  async generateTaxSummary(organizationId: string, year: number, quarter?: number) {
    const startDate = quarter
      ? new Date(year, (quarter - 1) * 3, 1)
      : new Date(year, 0, 1);
    const endDate = quarter
      ? new Date(year, quarter * 3, 0)
      : new Date(year, 11, 31);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        user: {
          organization_id: organizationId,
        },
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate totals (tax requires Stripe Tax integration; default to 0 if not stored)
    const summary = {
      period: quarter ? `Q${quarter} ${year}` : `${year}`,
      total_revenue: 0,
      total_tax: 0,
      by_country: {} as Record<string, { revenue: number; tax: number; count: number }>,
      invoice_count: invoices.length,
    };

    for (const invoice of invoices) {
      summary.total_revenue += invoice.amount_paid;
      // If tax is stored in invoice records, accumulate; otherwise remains 0
    }

    return summary;
  }
}
