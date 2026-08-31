// POST /api/orders — Create order (transactional, atomic)
// GET /api/orders — List orders
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { orderCreateSchema } from '@/lib/validations';
import { calculateOrderTotal, paisaToRupees } from '@/lib/pricing/pricing-engine';
import { calculateDeliveryEstimate } from '@/lib/delivery/delivery-service';
import { notifyArtisanNewOrder } from '@/lib/services/notification-service';
import { customAlphabet } from 'nanoid';

const generateOrderId = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 5);

function formatDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = orderCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // === FULL TRANSACTIONAL ORDER CREATION ===
    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId: data.productId },
      });

      if (!inventory) {
        throw new Error('Product inventory not found');
      }

      // 2. Get product details (for price — NEVER trust client price)
      const product = await tx.product.findUnique({
        where: { id: data.productId },
        include: {
          artisan: { select: { userId: true, name: true } },
        },
      });

      if (!product || product.status !== 'PUBLISHED') {
        throw new Error('Product is not available for purchase');
      }

      // 3. Validate MOQ for B2B
      if (data.orderType === 'B2B') {
        if (data.quantity < inventory.moq) {
          throw new Error(`Minimum order quantity is ${inventory.moq} units`);
        }
      }

      // 4. Validate stock
      const availableStock = inventory.currentStock - inventory.reservedStock;
      if (availableStock < data.quantity) {
        throw new Error(`Insufficient stock. Only ${availableStock} units available.`);
      }

      // 5. Calculate total on BACKEND (never trust client total)
      const unitPricePaisa = product.sellingPrice;
      const totalPaisa = calculateOrderTotal(unitPricePaisa, data.quantity);

      // 6. Generate unique Order ID
      const orderId = `ORD-${formatDate(new Date())}-${generateOrderId()}`;

      // 7. Create order
      const order = await tx.order.create({
        data: {
          orderId,
          orderType: data.orderType,
          status: 'PENDING',
          totalAmount: totalPaisa,
          artisanUserId: product.artisan.userId,
        },
      });

      // 8. Create order item
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: unitPricePaisa,
          subtotal: totalPaisa,
        },
      });

      // 9. Create buyer/B2B profile
      if (data.orderType === 'RETAIL' && data.buyerDetails) {
        await tx.buyerProfile.create({
          data: {
            orderId: order.id,
            fullName: data.buyerDetails.fullName,
            phone: data.buyerDetails.phone,
            address: data.buyerDetails.address,
            city: data.buyerDetails.city || null,
            state: data.buyerDetails.state || null,
            pincode: data.buyerDetails.pincode || null,
          },
        });
      } else if (data.orderType === 'B2B' && data.b2bDetails) {
        await tx.b2BProfile.create({
          data: {
            orderId: order.id,
            businessName: data.b2bDetails.businessName,
            gstNumber: data.b2bDetails.gstNumber,
            contactName: data.b2bDetails.contactName || null,
            contactPhone: data.b2bDetails.contactPhone,
            address: data.b2bDetails.address,
            city: data.b2bDetails.city || null,
            state: data.b2bDetails.state || null,
            pincode: data.b2bDetails.pincode || null,
          },
        });
      }

      // 10. Atomically decrement stock
      const updatedInventory = await tx.inventory.update({
        where: { productId: data.productId },
        data: {
          currentStock: { decrement: data.quantity },
        },
      });

      // 11. Auto-mark OUT_OF_STOCK if needed
      if (updatedInventory.currentStock <= 0) {
        await tx.product.update({
          where: { id: data.productId },
          data: { status: 'OUT_OF_STOCK' },
        });
      }

      // 12. Calculate delivery estimate
      const deliveryEstimate = calculateDeliveryEstimate({
        requestedQuantity: data.quantity,
        availableStock: inventory.currentStock,
        isBulkOrder: data.orderType === 'B2B',
      });

      await tx.deliveryEstimate.create({
        data: {
          orderId: order.id,
          processingDays: deliveryEstimate.processingDays,
          shippingDays: deliveryEstimate.shippingDays,
          bulkBufferDays: deliveryEstimate.bulkBufferDays,
          totalDaysMin: deliveryEstimate.totalDaysMin,
          totalDaysMax: deliveryEstimate.totalDaysMax,
          estimatedStart: deliveryEstimate.estimatedStart,
          estimatedEnd: deliveryEstimate.estimatedEnd,
        },
      });

      return {
        order,
        orderId,
        totalPaisa,
        totalRupees: paisaToRupees(totalPaisa),
        deliveryEstimate,
        productTitle: product.title,
        artisanUserId: product.artisan.userId,
        artisanName: product.artisan.name,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000,
    });

    // 13. Send notification to artisan (outside transaction — non-critical)
    try {
      await notifyArtisanNewOrder({
        artisanUserId: result.artisanUserId,
        orderId: result.orderId,
        productName: result.productTitle,
        quantity: data.quantity,
        orderTotal: result.totalPaisa,
        orderType: data.orderType,
      });
    } catch (notifError) {
      console.error('[ORDER] Notification failed (order still created):', notifError);
    }

    return NextResponse.json({
      success: true,
      order: {
        orderId: result.orderId,
        orderType: data.orderType,
        totalAmount: result.totalRupees,
        totalFormatted: `₹${result.totalRupees.toLocaleString('en-IN')}`,
        status: 'PENDING',
        deliveryEstimate: {
          ...result.deliveryEstimate,
          formattedRange: result.deliveryEstimate.formattedRange,
        },
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order creation failed';
    console.error('[ORDER] Create error:', message);

    // Return user-friendly error for expected validation failures
    if (message.includes('Minimum order quantity') ||
        message.includes('Insufficient stock') ||
        message.includes('not available')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanUserId = searchParams.get('artisanUserId');
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { orderId },
        include: {
          items: {
            include: {
              product: {
                select: { title: true, category: true },
              },
            },
          },
          buyerProfile: true,
          b2bProfile: true,
          deliveryEstimate: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ order });
    }

    const where: Record<string, unknown> = {};
    if (artisanUserId) {
      where.artisanUserId = artisanUserId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { title: true, category: true },
            },
          },
        },
        deliveryEstimate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[ORDER] List error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
