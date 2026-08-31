// POST /api/products/calculate-price — Calculate pricing using deterministic engine
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  calculateProductionCost,
  calculateRecommendedPrice,
  paisaToRupees,
  CostInput,
} from '@/lib/pricing/pricing-engine';
import { getMarketDataProvider } from '@/lib/pricing/market-data';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();

    // Validate cost inputs
    const { materialCost, labourCost, otherCost, costType, batchSize, category, material, craftType, region } = body;

    if (materialCost === undefined || materialCost < 0) {
      return NextResponse.json({ error: 'Valid material cost is required' }, { status: 400 });
    }
    if (labourCost === undefined || labourCost < 0) {
      return NextResponse.json({ error: 'Valid labour cost is required' }, { status: 400 });
    }

    const costInput: CostInput = {
      materialCost: Number(materialCost),
      labourCost: Number(labourCost),
      otherCost: Number(otherCost || 0),
      costType: costType || 'PER_UNIT',
      batchSize: batchSize ? Number(batchSize) : undefined,
    };

    // Calculate production cost (in paisa)
    const productionCostPaisa = calculateProductionCost(costInput);

    // Get market comparables
    const marketDataProvider = getMarketDataProvider();
    let marketRange = null;
    try {
      marketRange = await marketDataProvider.getComparables({
        category,
        material,
        craftType,
        region,
      });
    } catch (err) {
      console.warn('[PRICING] Market data fetch failed:', err);
    }

    // Calculate recommended pricing with artisan-specified or default margins
    const targetMinMargin = body.minMargin !== undefined && body.minMargin !== ''
      ? Number(body.minMargin) / 100
      : parseFloat(process.env.PRICING_MIN_MARGIN || '20') / 100;

    const targetMaxMargin = body.maxMargin !== undefined && body.maxMargin !== ''
      ? Number(body.maxMargin) / 100
      : parseFloat(process.env.PRICING_MAX_MARGIN || '35') / 100;

    const pricing = calculateRecommendedPrice(
      productionCostPaisa,
      marketRange,
      targetMinMargin,
      targetMaxMargin
    );

    return NextResponse.json({
      pricing: {
        ...pricing,
        // Add rupee-formatted values for display
        display: {
          productionCost: `₹${pricing.productionCostRupees.toLocaleString('en-IN')}`,
          recommendedMin: `₹${pricing.recommendedMinPriceRupees.toLocaleString('en-IN')}`,
          recommendedMax: `₹${pricing.recommendedMaxPriceRupees.toLocaleString('en-IN')}`,
          profitMin: `₹${pricing.expectedMinProfitRupees.toLocaleString('en-IN')}`,
          profitMax: `₹${pricing.expectedMaxProfitRupees.toLocaleString('en-IN')}`,
          marketMin: pricing.marketMinPricePaisa ? `₹${paisaToRupees(pricing.marketMinPricePaisa).toLocaleString('en-IN')}` : null,
          marketMax: pricing.marketMaxPricePaisa ? `₹${paisaToRupees(pricing.marketMaxPricePaisa).toLocaleString('en-IN')}` : null,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PRICING] Calculate error:', error);
    return NextResponse.json({ error: 'Failed to calculate pricing' }, { status: 500 });
  }
}
