// GET /api/marketplace/products/[id] — Get single product detail
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { paisaToRupees } from '@/lib/pricing/pricing-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        artisan: {
          select: {
            name: true,
            artisanId: true,
            location: true,
            craftType: true,
            experience: true,
            artisanStory: true,
          },
        },
        images: {
          select: {
            id: true,
            originalUrl: true,
            processedUrl: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: 'desc' },
        },
        inventory: {
          select: { currentStock: true, moq: true },
        },
        cost: {
          select: {
            materialCost: true,
            labourCost: true,
            otherCost: true,
            totalCost: true,
          },
        },
      },
    });

    if (!product || product.status === 'DRAFT' || product.status === 'UNPUBLISHED') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Parse highlights from JSON string to array
    let highlights: string[] = [];
    try {
      const raw = product.highlights;
      if (Array.isArray(raw)) {
        highlights = raw;
      } else if (typeof raw === 'string' && raw.trim()) {
        highlights = JSON.parse(raw);
      }
    } catch {
      highlights = [];
    }

    const transformed = {
      id: product.id,
      title: product.title,
      shortDescription: product.shortDescription,
      longDescription: product.longDescription,
      highlights,
      category: product.category,
      material: product.material,
      craftTechnique: product.craftTechnique,
      dimensions: product.dimensions,
      color: product.color,
      weight: product.weight,
      productionTime: product.productionTime,
      priceRupees: paisaToRupees(product.sellingPrice),
      pricePaisa: product.sellingPrice,
      priceFormatted: `₹${paisaToRupees(product.sellingPrice).toLocaleString('en-IN')}`,
      images: (product.images || []).map((img) => ({
        id: img.id,
        url: img.processedUrl || img.originalUrl,
        originalUrl: img.originalUrl,
      })),
      artisan: product.artisan || { name: 'Unknown', artisanId: '', location: null, craftType: null, experience: null, artisanStory: null },
      stock: product.inventory?.currentStock ?? 0,
      inStock: (product.inventory?.currentStock ?? 0) > 0,
      moq: product.inventory?.moq ?? 1,
      status: product.status,
    };

    return NextResponse.json({ product: transformed });
  } catch (error) {
    console.error('[MARKETPLACE] Product detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
