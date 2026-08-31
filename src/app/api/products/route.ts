// Product API Routes
// POST /api/products — Create/publish product
// GET /api/products — List artisan's products
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db';
import { rupeesToPaisa } from '@/lib/pricing/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artisan profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    if (body.sellingPrice === undefined || body.sellingPrice < 0) {
      return NextResponse.json({ error: 'Valid selling price is required' }, { status: 400 });
    }

    // Create product in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          artisanId: profile.id,
          title: body.title,
          shortDescription: body.shortDescription || null,
          longDescription: body.longDescription || null,
          highlights: JSON.stringify(body.highlights || []),
          category: body.category || null,
          material: body.material || null,
          craftTechnique: body.craftTechnique || null,
          dimensions: body.dimensions || null,
          color: body.color || null,
          weight: body.weight || null,
          productionTime: body.productionTime || null,
          sellingPrice: rupeesToPaisa(body.sellingPrice),
          status: body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        },
      });

      // Create inventory record
      await tx.inventory.create({
        data: {
          productId: product.id,
          currentStock: body.quantity || 0,
          moq: body.moq || 1,
        },
      });

      // Create cost record if provided
      if (body.costs) {
        const costs = body.costs;
        const materialPaisa = rupeesToPaisa(costs.materialCost || 0);
        const labourPaisa = rupeesToPaisa(costs.labourCost || 0);
        const otherPaisa = rupeesToPaisa(costs.otherCost || 0);
        const totalPaisa = materialPaisa + labourPaisa + otherPaisa;

        await tx.productCost.create({
          data: {
            productId: product.id,
            materialCost: materialPaisa,
            labourCost: labourPaisa,
            labourHours: costs.labourHours || null,
            labourRate: costs.labourRate ? rupeesToPaisa(costs.labourRate) : null,
            labourDays: costs.labourDays || null,
            dailyLabourRate: costs.dailyLabourRate ? rupeesToPaisa(costs.dailyLabourRate) : null,
            otherCost: otherPaisa,
            totalCost: totalPaisa,
            costType: costs.costType || 'PER_UNIT',
          },
        });
      }

      // Create pricing calculation if provided
      if (body.pricing) {
        const p = body.pricing;
        await tx.pricingCalculation.create({
          data: {
            productId: product.id,
            productionCost: rupeesToPaisa(p.productionCost || 0),
            marketMinPrice: p.marketMinPrice ? rupeesToPaisa(p.marketMinPrice) : null,
            marketMaxPrice: p.marketMaxPrice ? rupeesToPaisa(p.marketMaxPrice) : null,
            marketAvgPrice: p.marketAvgPrice ? rupeesToPaisa(p.marketAvgPrice) : null,
            marketDataAvailable: p.marketDataAvailable || false,
            marketDataSource: p.marketDataSource || null,
            targetMinMargin: p.targetMinMargin || 0.20,
            targetMaxMargin: p.targetMaxMargin || 0.35,
            recommendedMinPrice: rupeesToPaisa(p.recommendedMinPrice || 0),
            recommendedMaxPrice: rupeesToPaisa(p.recommendedMaxPrice || 0),
            selectedPrice: rupeesToPaisa(body.sellingPrice),
            expectedMinProfit: rupeesToPaisa(p.expectedMinProfit || 0),
            expectedMaxProfit: rupeesToPaisa(p.expectedMaxProfit || 0),
          },
        });
      }

      // Associate images if provided
      if (body.imageIds && Array.isArray(body.imageIds)) {
        for (const imageId of body.imageIds) {
          await tx.productImage.update({
            where: { id: imageId },
            data: { productId: product.id },
          });
        }
      }

      return product;
    });

    return NextResponse.json({ product: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PRODUCTS] Create error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireAuth();

    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: { artisanId: profile.id },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        inventory: true,
        cost: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
