// ============================================
// Market Data Service
// Retrieves comparable pricing data from DB or external APIs
// ============================================

import prisma from '@/lib/db';
import { MarketRange } from './pricing-engine';

export interface MarketDataProvider {
  getComparables(params: {
    category?: string | null;
    material?: string | null;
    craftType?: string | null;
    region?: string | null;
  }): Promise<MarketRange | null>;
}

// ============================================
// Database-backed market data (seeded reference prices)
// ============================================

class DatabaseMarketDataProvider implements MarketDataProvider {
  async getComparables(params: {
    category?: string | null;
    material?: string | null;
    craftType?: string | null;
    region?: string | null;
  }): Promise<MarketRange | null> {
    // Build filter — match by category first, then narrow by material/craft
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (params.category) {
      where.category = { equals: params.category, mode: 'insensitive' };
    } else {
      return null; // Cannot compare without at least a category
    }

    // Try narrow match first (category + material)
    if (params.material) {
      const narrowResults = await prisma.marketComparable.findMany({
        where: {
          ...where,
          material: { equals: params.material },
        },
        orderBy: { collectedAt: 'desc' },
        take: 20,
      });

      if (narrowResults.length > 0) {
        return this.aggregateResults(narrowResults);
      }
    }

    // Try craft type match
    if (params.craftType) {
      const craftResults = await prisma.marketComparable.findMany({
        where: {
          ...where,
          craftType: { equals: params.craftType },
        },
        orderBy: { collectedAt: 'desc' },
        take: 20,
      });

      if (craftResults.length > 0) {
        return this.aggregateResults(craftResults);
      }
    }

    // Fall back to category-only match
    const broadResults = await prisma.marketComparable.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: 20,
    });

    if (broadResults.length > 0) {
      return this.aggregateResults(broadResults);
    }

    return null;
  }

  private aggregateResults(results: Array<{
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    sampleSize: number;
    source: string;
    collectedAt: Date;
  }>): MarketRange {
    const allMin = Math.min(...results.map(r => r.minPrice));
    const allMax = Math.max(...results.map(r => r.maxPrice));
    const totalSamples = results.reduce((sum, r) => sum + r.sampleSize, 0);
    const weightedAvg = Math.round(
      results.reduce((sum, r) => sum + r.avgPrice * r.sampleSize, 0) / totalSamples
    );

    return {
      minPrice: allMin,
      maxPrice: allMax,
      avgPrice: weightedAvg,
      sampleSize: totalSamples,
      source: results[0].source,
      collectedAt: results[0].collectedAt,
    };
  }
}

// ============================================
// API-backed market data (integration point for future live sources)
// ============================================

class APIMarketDataProvider implements MarketDataProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    const apiKey = process.env.MARKET_DATA_API_KEY;
    const apiUrl = process.env.MARKET_DATA_API_URL;

    if (!apiKey || !apiUrl) {
      throw new Error(
        'Market data API not configured. Set MARKET_DATA_API_KEY and MARKET_DATA_API_URL.'
      );
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async getComparables(params: {
    category?: string | null;
    material?: string | null;
    craftType?: string | null;
    region?: string | null;
  }): Promise<MarketRange | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.set('category', params.category);
      if (params.material) queryParams.set('material', params.material);
      if (params.craftType) queryParams.set('craft_type', params.craftType);
      if (params.region) queryParams.set('region', params.region);

      const response = await fetch(`${this.apiUrl}/comparables?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[MARKET DATA API] Error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        minPrice: data.min_price,
        maxPrice: data.max_price,
        avgPrice: data.avg_price,
        sampleSize: data.sample_size || 1,
        source: `api:${this.apiUrl}`,
        collectedAt: new Date(),
      };
    } catch (error) {
      console.error('[MARKET DATA API] Failed:', error);
      return null;
    }
  }
}

// ============================================
// Factory
// ============================================

export function getMarketDataProvider(): MarketDataProvider {
  const provider = process.env.MARKET_DATA_PROVIDER || 'database';

  switch (provider) {
    case 'api':
      return new APIMarketDataProvider();
    case 'database':
    default:
      return new DatabaseMarketDataProvider();
  }
}
