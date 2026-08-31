// ============================================
// Inventory Service — Atomic Stock Operations
// Uses database transactions with SELECT FOR UPDATE
// ============================================

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface StockCheckResult {
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  moq: number;
  moqSatisfied: boolean;
  error?: string;
}

export interface StockReservationResult {
  success: boolean;
  remainingStock: number;
  error?: string;
}

/**
 * Check if requested quantity is available and MOQ is satisfied
 * This is a READ operation — does not modify inventory
 */
export async function checkStock(
  productId: string,
  requestedQuantity: number,
  orderType: 'RETAIL' | 'B2B'
): Promise<StockCheckResult> {
  const inventory = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    return {
      available: false,
      currentStock: 0,
      requestedQuantity,
      moq: 1,
      moqSatisfied: true,
      error: 'Product inventory not found',
    };
  }

  const availableStock = inventory.currentStock - inventory.reservedStock;
  const moqSatisfied = orderType === 'B2B' ? requestedQuantity >= inventory.moq : true;

  return {
    available: availableStock >= requestedQuantity,
    currentStock: availableStock,
    requestedQuantity,
    moq: inventory.moq,
    moqSatisfied,
    error: !moqSatisfied
      ? `Minimum order quantity is ${inventory.moq}`
      : availableStock < requestedQuantity
        ? `Only ${availableStock} units available`
        : undefined,
  };
}

/**
 * Atomically reserve stock during order creation
 * Uses database transaction with row-level locking
 * 
 * CRITICAL: This prevents two concurrent buyers from purchasing the same stock
 */
export async function reserveAndDecrementStock(
  productId: string,
  quantity: number,
  orderType: 'RETAIL' | 'B2B'
): Promise<StockReservationResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inv) {
        throw new Error('Product inventory not found');
      }
      const availableStock = inv.currentStock - inv.reservedStock;

      // Validate MOQ for B2B
      if (orderType === 'B2B' && quantity < inv.moq) {
        throw new Error(`Minimum order quantity is ${inv.moq}`);
      }

      // Validate stock availability
      if (availableStock < quantity) {
        throw new Error(`Insufficient stock. Only ${availableStock} units available.`);
      }

      // Decrement stock atomically
      const updated = await tx.inventory.update({
        where: { productId },
        data: {
          currentStock: { decrement: quantity },
        },
      });

      // Auto-mark product as OUT_OF_STOCK if stock reaches 0
      if (updated.currentStock <= 0) {
        await tx.product.update({
          where: { id: productId },
          data: { status: 'OUT_OF_STOCK' },
        });
      }

      return {
        success: true,
        remainingStock: updated.currentStock,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000, // 10 second timeout
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stock reservation failed';
    console.error('[INVENTORY] Reservation failed:', message);
    return {
      success: false,
      remainingStock: 0,
      error: message,
    };
  }
}

/**
 * Restore stock (e.g., when an order is cancelled)
 */
export async function restoreStock(
  productId: string,
  quantity: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.inventory.update({
      where: { productId },
      data: {
        currentStock: { increment: quantity },
      },
    });

    // If product was OUT_OF_STOCK but now has stock, mark as PUBLISHED
    if (updated.currentStock > 0) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { status: true },
      });
      if (product?.status === 'OUT_OF_STOCK') {
        await tx.product.update({
          where: { id: productId },
          data: { status: 'PUBLISHED' },
        });
      }
    }
  });
}
