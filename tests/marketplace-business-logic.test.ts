import { describe, it, expect } from 'vitest';
import {
  calculateProductionCost,
  calculateLabourFromHours,
  calculateLabourFromDays,
  calculateProfit,
  calculateProfitMargin,
  calculateOrderTotal,
  calculateRecommendedPrice,
  paisaToRupees,
  rupeesToPaisa,
} from '../src/lib/pricing/pricing-engine';
import { calculateDeliveryEstimate } from '../src/lib/delivery/delivery-service';
import { getStateCode } from '../src/lib/services/artisan-id';

describe('Pricing Engine (Deterministic Math Tests)', () => {
  it('should accurately convert between rupees and paisa', () => {
    expect(rupeesToPaisa(1500)).toBe(150000);
    expect(paisaToRupees(150000)).toBe(1500);
    expect(rupeesToPaisa(12.50)).toBe(1250);
    expect(paisaToRupees(1250)).toBe(12.50);
  });

  it('should calculate total production cost from material, labour, and other costs', () => {
    // Material = ₹900, Labour = ₹300, Other = ₹100 => Total = ₹1300 (130000 paisa)
    const cost = calculateProductionCost({
      materialCost: 900,
      labourCost: 300,
      otherCost: 100,
      costType: 'PER_UNIT',
    });
    expect(cost).toBe(130000);
    expect(paisaToRupees(cost)).toBe(1300);
  });

  it('should calculate batch production cost per unit correctly', () => {
    // Batch of 10 units with total cost ₹5000 => ₹500 (50000 paisa) per unit
    const unitCost = calculateProductionCost({
      materialCost: 3000,
      labourCost: 1500,
      otherCost: 500,
      costType: 'TOTAL_BATCH',
      batchSize: 10,
    });
    expect(unitCost).toBe(50000);
    expect(paisaToRupees(unitCost)).toBe(500);
  });

  it('should calculate labour cost from hours and rate', () => {
    // 8 hours at ₹150/hr = ₹1200
    expect(calculateLabourFromHours(8, 150)).toBe(1200);
  });

  it('should calculate labour cost from days and daily rate', () => {
    // 3 days at ₹500/day = ₹1500
    expect(calculateLabourFromDays(3, 500)).toBe(1500);
  });

  it('should calculate profit and profit margin reproducibly', () => {
    const sellingPricePaisa = 155000; // ₹1,550
    const productionCostPaisa = 130000; // ₹1,300

    const profit = calculateProfit(sellingPricePaisa, productionCostPaisa);
    expect(profit).toBe(25000); // ₹250 profit
    expect(paisaToRupees(profit)).toBe(250);

    const margin = calculateProfitMargin(sellingPricePaisa, productionCostPaisa);
    expect(margin).toBeCloseTo(0.1613, 3); // ~16.13%
  });

  it('should calculate backend order total deterministically', () => {
    // 5 units at ₹1,550 each (155000 paisa) = 775000 paisa (₹7,750)
    const unitPricePaisa = 155000;
    const quantity = 5;
    const totalPaisa = calculateOrderTotal(unitPricePaisa, quantity);
    expect(totalPaisa).toBe(775000);
    expect(paisaToRupees(totalPaisa)).toBe(7750);
  });

  it('should calculate recommended price range without market data', () => {
    const productionCostPaisa = 130000; // ₹1,300
    const result = calculateRecommendedPrice(
      productionCostPaisa,
      null, // No market data
      0.20, // 20% min margin
      0.35  // 35% max margin
    );

    expect(result.marketDataAvailable).toBe(false);
    expect(result.recommendedMinPriceRupees).toBe(1560); // 1300 * 1.20 = 1560
    expect(result.recommendedMaxPriceRupees).toBe(1755); // 1300 * 1.35 = 1755
    expect(result.expectedMinProfitRupees).toBe(260); // 1560 - 1300
    expect(result.expectedMaxProfitRupees).toBe(455); // 1755 - 1300
  });

  it('should blend market data when valid market comparables exist', () => {
    const productionCostPaisa = 130000; // ₹1,300
    const marketRange = {
      minPrice: 145000, // ₹1,450
      maxPrice: 170000, // ₹1,700
      avgPrice: 157500, // ₹1,575
      sampleSize: 15,
      source: 'test_comparables',
      collectedAt: new Date(),
    };

    const result = calculateRecommendedPrice(productionCostPaisa, marketRange, 0.20, 0.35);

    expect(result.marketDataAvailable).toBe(true);
    expect(result.recommendedMinPriceRupees).toBeGreaterThanOrEqual(1300);
    expect(result.recommendedMaxPriceRupees).toBeGreaterThan(result.recommendedMinPriceRupees);
  });
});

describe('Delivery Estimation Tests', () => {
  it('should calculate delivery date range for retail orders', () => {
    const result = calculateDeliveryEstimate({ requestedQuantity: 1, availableStock: 10, isBulkOrder: false });
    expect(result.totalDaysMin).toBeGreaterThan(0);
    expect(result.totalDaysMax).toBeGreaterThan(result.totalDaysMin);
    expect(result.formattedRange).toContain('–');
  });

  it('should add bulk buffer days for B2B orders', () => {
    const retailResult = calculateDeliveryEstimate({ requestedQuantity: 1, availableStock: 10, isBulkOrder: false });
    const b2bResult = calculateDeliveryEstimate({ requestedQuantity: 10, availableStock: 10, isBulkOrder: true });

    expect(b2bResult.totalDaysMin).toBeGreaterThan(retailResult.totalDaysMin);
    expect(b2bResult.bulkBufferDays).toBe(5);
  });
});

describe('Artisan ID State Code Mapping', () => {
  it('should correctly resolve Indian state codes', () => {
    expect(getStateCode('Tamil Nadu')).toBe('TN');
    expect(getStateCode('Karnataka')).toBe('KA');
    expect(getStateCode('Maharashtra')).toBe('MH');
    expect(getStateCode('Unknown Place')).toBe('IN');
  });
});
