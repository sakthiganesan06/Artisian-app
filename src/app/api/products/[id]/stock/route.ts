// PATCH /api/products/[id]/stock — Quick stock update endpoint for artisans
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { currentStock, moq } = body;

    if (typeof currentStock !== 'number' || currentStock < 0) {
      return NextResponse.json(
        { error: 'Valid currentStock number is required' },
        { status: 400 }
      );
    }

    // Verify product belongs to artisan
    const product = await prisma.product.findFirst({
      where: {
        id,
        artisan: { userId: session.userId },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.upsert({
      where: { productId: id },
      update: {
        currentStock,
        ...(typeof moq === 'number' && moq > 0 ? { moq } : {}),
      },
      create: {
        productId: id,
        currentStock,
        moq: moq || 1,
      },
    });

    // Auto update product status based on stock
    const newStatus = currentStock > 0
      ? (product.status === 'OUT_OF_STOCK' ? 'PUBLISHED' : product.status)
      : 'OUT_OF_STOCK';

    if (newStatus !== product.status) {
      await prisma.product.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({
      success: true,
      inventory: updatedInventory,
      status: newStatus,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[STOCK] Update error:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}
