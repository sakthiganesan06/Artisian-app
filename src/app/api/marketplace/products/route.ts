// GET /api/marketplace/products — Public marketplace product listing
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { paisaToRupees } from '@/lib/pricing/pricing-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { material: { contains: search, mode: 'insensitive' } },
        { craftTechnique: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    // Build order clause
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (sort) {
      case 'price_low':
        orderBy = { sellingPrice: 'asc' };
        break;
      case 'price_high':
        orderBy = { sellingPrice: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          artisan: {
            select: {
              name: true,
              artisanId: true,
              location: true,
              craftType: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { processedUrl: true, originalUrl: true },
          },
          inventory: {
            select: { currentStock: true, moq: true },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    // Get unique categories for filtering
    const categories = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { category: true },
      distinct: ['category'],
    });

    // Transform products for frontend
    const transformedProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      shortDescription: p.shortDescription,
      category: p.category,
      material: p.material,
      priceRupees: paisaToRupees(p.sellingPrice),
      priceFormatted: `₹${paisaToRupees(p.sellingPrice).toLocaleString('en-IN')}`,
      imageUrl: p.images[0]?.processedUrl || p.images[0]?.originalUrl || null,
      artisan: p.artisan,
      inStock: (p.inventory?.currentStock || 0) > 0,
      stock: p.inventory?.currentStock || 0,
      moq: p.inventory?.moq || 1,
    }));

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categories: categories
        .map((c) => c.category)
        .filter(Boolean)
        .sort(),
    });
  } catch (error) {
    console.error('[MARKETPLACE] Products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
