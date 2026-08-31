// ============================================
// Delivery Estimation Service
// Dynamic calculation based on Quantity & Stock Availability
// ============================================

export interface DeliveryConfig {
  processingDaysMin: number;
  processingDaysMax: number;
  shippingDaysMin: number;
  shippingDaysMax: number;
  bulkBufferDays: number;
}

export interface DeliveryEstimateResult {
  processingDays: number;
  shippingDays: number;
  bulkBufferDays: number;
  productionDays: number;
  totalDaysMin: number;
  totalDaysMax: number;
  estimatedStart: Date;
  estimatedEnd: Date;
  formattedRange: string;
  stockStatusNote: string;
}

function getDefaultConfig(): DeliveryConfig {
  return {
    processingDaysMin: parseInt(process.env.DELIVERY_PROCESSING_DAYS_MIN || '1'),
    processingDaysMax: parseInt(process.env.DELIVERY_PROCESSING_DAYS_MAX || '2'),
    shippingDaysMin: parseInt(process.env.DELIVERY_SHIPPING_DAYS_MIN || '3'),
    shippingDaysMax: parseInt(process.env.DELIVERY_SHIPPING_DAYS_MAX || '5'),
    bulkBufferDays: parseInt(process.env.DELIVERY_BULK_BUFFER_DAYS || '3'),
  };
}

/**
 * Add business days to a date (skips Sundays)
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) {
      added++;
    }
  }

  return result;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate expected delivery date range ONLY after product quantity & stock availability
 */
export function calculateDeliveryEstimate(params: {
  requestedQuantity: number;
  availableStock: number;
  productionTimeDays?: number;
  isBulkOrder?: boolean;
  config?: Partial<DeliveryConfig>;
}): DeliveryEstimateResult {
  const config = { ...getDefaultConfig(), ...params.config };
  const now = new Date();

  const quantity = Math.max(1, params.requestedQuantity || 1);
  const stock = Math.max(0, params.availableStock || 0);
  const isBulk = !!params.isBulkOrder;
  const baseProdTime = Math.max(1, params.productionTimeDays || 3);

  let processingMin = config.processingDaysMin;
  let processingMax = config.processingDaysMax;
  let productionDays = 0;
  let stockStatusNote = '';

  if (quantity <= stock) {
    // ⚡ Full stock available — Immediate Dispatch
    processingMin = 1;
    processingMax = 2;
    stockStatusNote = `⚡ Ready in Stock — Dispatching in 24-48 hours`;
  } else {
    // 🔨 Partial or Made-to-Order
    const unitsToMake = quantity - stock;
    const batches = Math.ceil(unitsToMake / 5); // 1 batch of 5 units per production cycle
    productionDays = batches * baseProdTime;

    processingMin = 1 + productionDays;
    processingMax = 3 + productionDays;

    if (stock > 0) {
      stockStatusNote = `📦 ${stock} units ready in stock, ${unitsToMake} units being handcrafted (${productionDays} days production)`;
    } else {
      stockStatusNote = `🔨 Made-to-Order — Crafting ${quantity} units (${productionDays} days production)`;
    }
  }

  const bulkBuffer = isBulk ? config.bulkBufferDays : 0;

  const totalMin = processingMin + config.shippingDaysMin + bulkBuffer;
  const totalMax = processingMax + config.shippingDaysMax + bulkBuffer;

  const estimatedStart = addBusinessDays(now, totalMin);
  const estimatedEnd = addBusinessDays(now, totalMax);

  return {
    processingDays: Math.round((processingMin + processingMax) / 2),
    shippingDays: Math.round((config.shippingDaysMin + config.shippingDaysMax) / 2),
    bulkBufferDays: bulkBuffer,
    productionDays,
    totalDaysMin: totalMin,
    totalDaysMax: totalMax,
    estimatedStart,
    estimatedEnd,
    formattedRange: `${formatDate(estimatedStart)} – ${formatDate(estimatedEnd)}`,
    stockStatusNote,
  };
}
