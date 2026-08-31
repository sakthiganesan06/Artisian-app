// POST /api/orders/check-stock — Pre-checkout stock, quantity & delivery estimation
import { NextRequest, NextResponse } from 'next/server';
import { stockCheckSchema } from '@/lib/validations';
import { checkStock } from '@/lib/inventory/inventory-service';
import { calculateDeliveryEstimate } from '@/lib/delivery/delivery-service';
import prisma from '@/lib/db';

function parseProductionDays(prodTime?: string | null): number {
  if (!prodTime) return 3;
  const match = prodTime.match(/(\d+)/);
  if (!match) return 3;
  const num = parseInt(match[1]);
  if (prodTime.toLowerCase().includes('week')) return num * 7;
  if (prodTime.toLowerCase().includes('month')) return num * 30;
  return num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = stockCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, quantity, orderType } = parsed.data;

    // Fetch product production time for accurate delivery calculation
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { productionTime: true },
    });

    const productionDays = parseProductionDays(product?.productionTime);

    // Check stock and MOQ
    const stockResult = await checkStock(productId, quantity, orderType);

    // Calculate dynamic delivery estimate based on requested quantity vs available stock
    const deliveryEstimate = calculateDeliveryEstimate({
      requestedQuantity: quantity,
      availableStock: stockResult.currentStock,
      productionTimeDays: productionDays,
      isBulkOrder: orderType === 'B2B',
    });

    return NextResponse.json({
      ...stockResult,
      deliveryEstimate,
    });
  } catch (error) {
    console.error('[STOCK] Check error:', error);
    return NextResponse.json({ error: 'Failed to check stock' }, { status: 500 });
  }
}
