// ============================================
// Deterministic Pricing Engine
// All calculations in paisa (1 ₹ = 100 paisa) to avoid floating-point issues
// NO LLM involvement — pure arithmetic
// ============================================

export interface CostInput {
  materialCost: number; // in rupees (will be converted to paisa internally)
  labourCost: number;   // in rupees
  otherCost: number;    // in rupees
  costType: 'PER_UNIT' | 'TOTAL_BATCH';
  batchSize?: number;   // required if costType is TOTAL_BATCH
}

export interface MarketRange {
  minPrice: number; // in paisa
  maxPrice: number; // in paisa
  avgPrice: number; // in paisa
  sampleSize: number;
  source: string;
  collectedAt: Date;
}

export interface PricingResult {
  productionCostPaisa: number;
  productionCostRupees: number;
  marketDataAvailable: boolean;
  marketMinPricePaisa: number | null;
  marketMaxPricePaisa: number | null;
  marketAvgPricePaisa: number | null;
  marketDataSource: string | null;
  targetMinMargin: number; // e.g., 0.20
  targetMaxMargin: number; // e.g., 0.35
  recommendedMinPricePaisa: number;
  recommendedMaxPricePaisa: number;
  recommendedMinPriceRupees: number;
  recommendedMaxPriceRupees: number;
  expectedMinProfitPaisa: number;
  expectedMaxProfitPaisa: number;
  expectedMinProfitRupees: number;
  expectedMaxProfitRupees: number;
}

// Convert rupees to paisa
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

// Convert paisa to rupees
export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

// Format paisa as rupee string
export function formatPrice(paisa: number): string {
  const rupees = paisaToRupees(paisa);
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ============================================
// Core Calculations
// ============================================

/**
 * Calculate total production cost (per unit) in paisa
 */
export function calculateProductionCost(input: CostInput): number {
  const materialPaisa = rupeesToPaisa(input.materialCost);
  const labourPaisa = rupeesToPaisa(input.labourCost);
  const otherPaisa = rupeesToPaisa(input.otherCost);

  const totalPaisa = materialPaisa + labourPaisa + otherPaisa;

  if (input.costType === 'TOTAL_BATCH' && input.batchSize && input.batchSize > 0) {
    return Math.round(totalPaisa / input.batchSize);
  }

  return totalPaisa;
}

/**
 * Calculate labour cost from hours and rate
 */
export function calculateLabourFromHours(hours: number, ratePerHour: number): number {
  if (hours < 0 || ratePerHour < 0) throw new Error('Hours and rate must be non-negative');
  return Math.round(hours * ratePerHour * 100) / 100;
}

/**
 * Calculate labour cost from days and daily rate
 */
export function calculateLabourFromDays(days: number, dailyRate: number): number {
  if (days < 0 || dailyRate < 0) throw new Error('Days and rate must be non-negative');
  return Math.round(days * dailyRate * 100) / 100;
}

/**
 * Calculate profit in paisa
 */
export function calculateProfit(sellingPricePaisa: number, productionCostPaisa: number): number {
  return sellingPricePaisa - productionCostPaisa;
}

/**
 * Calculate profit margin as percentage
 */
export function calculateProfitMargin(sellingPricePaisa: number, productionCostPaisa: number): number {
  if (sellingPricePaisa === 0) return 0;
  return (sellingPricePaisa - productionCostPaisa) / sellingPricePaisa;
}

/**
 * Calculate order total in paisa
 */
export function calculateOrderTotal(unitPricePaisa: number, quantity: number): number {
  if (quantity < 0) throw new Error('Quantity must be non-negative');
  return unitPricePaisa * quantity;
}

// ============================================
// Recommended Price Calculation
// ============================================

/**
 * Calculate recommended selling price range
 * 
 * Strategy:
 * 1. Start with cost-plus pricing: production_cost * (1 + margin)
 * 2. If market data available, blend cost-plus with market positioning
 * 3. Ensure recommended price never falls below production cost
 */
export function calculateRecommendedPrice(
  productionCostPaisa: number,
  marketRange: MarketRange | null,
  targetMinMargin: number = 0.20,
  targetMaxMargin: number = 0.35
): PricingResult {
  // Cost-plus pricing
  const costPlusMin = Math.round(productionCostPaisa * (1 + targetMinMargin));
  const costPlusMax = Math.round(productionCostPaisa * (1 + targetMaxMargin));

  let recommendedMinPaisa: number;
  let recommendedMaxPaisa: number;
  let marketDataAvailable = false;

  if (marketRange && marketRange.sampleSize > 0) {
    marketDataAvailable = true;

    // Blend cost-plus with market data
    // Weight: 40% cost-plus, 60% market (market is more informative when available)
    const blendedMin = Math.round(costPlusMin * 0.4 + marketRange.minPrice * 0.6);
    const blendedMax = Math.round(costPlusMax * 0.4 + marketRange.maxPrice * 0.6);

    // Ensure minimum price covers production cost + minimum margin
    recommendedMinPaisa = Math.max(blendedMin, costPlusMin);
    recommendedMaxPaisa = Math.max(blendedMax, costPlusMax);

    // If market prices are significantly higher, raise recommendation
    if (marketRange.avgPrice > costPlusMax) {
      recommendedMinPaisa = Math.max(recommendedMinPaisa, Math.round(marketRange.avgPrice * 0.85));
      recommendedMaxPaisa = Math.max(recommendedMaxPaisa, Math.round(marketRange.avgPrice * 1.05));
    }
  } else {
    // No market data — pure cost-plus
    recommendedMinPaisa = costPlusMin;
    recommendedMaxPaisa = costPlusMax;
  }

  // Safety: never recommend below production cost
  recommendedMinPaisa = Math.max(recommendedMinPaisa, productionCostPaisa);
  recommendedMaxPaisa = Math.max(recommendedMaxPaisa, recommendedMinPaisa);

  return {
    productionCostPaisa,
    productionCostRupees: paisaToRupees(productionCostPaisa),
    marketDataAvailable,
    marketMinPricePaisa: marketRange?.minPrice ?? null,
    marketMaxPricePaisa: marketRange?.maxPrice ?? null,
    marketAvgPricePaisa: marketRange?.avgPrice ?? null,
    marketDataSource: marketRange?.source ?? null,
    targetMinMargin,
    targetMaxMargin,
    recommendedMinPricePaisa: recommendedMinPaisa,
    recommendedMaxPricePaisa: recommendedMaxPaisa,
    recommendedMinPriceRupees: paisaToRupees(recommendedMinPaisa),
    recommendedMaxPriceRupees: paisaToRupees(recommendedMaxPaisa),
    expectedMinProfitPaisa: recommendedMinPaisa - productionCostPaisa,
    expectedMaxProfitPaisa: recommendedMaxPaisa - productionCostPaisa,
    expectedMinProfitRupees: paisaToRupees(recommendedMinPaisa - productionCostPaisa),
    expectedMaxProfitRupees: paisaToRupees(recommendedMaxPaisa - productionCostPaisa),
  };
}
