// GET /api/artisan/[id] — Public artisan profile (QR landing page)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { paisaToRupees } from '@/lib/pricing/pricing-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const profile = await prisma.artisanProfile.findUnique({
      where: { artisanId: id },
      select: {
        artisanId: true,
        name: true,
        location: true,
        district: true,
        state: true,
        craftType: true,
        experience: true,
        artisanStory: true,
        profileImageUrl: true,
        products: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            shortDescription: true,
            sellingPrice: true,
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { processedUrl: true, originalUrl: true },
            },
            inventory: {
              select: { currentStock: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artisan not found' }, { status: 404 });
    }

    // Transform — NO private data
    const publicProfile = {
      artisanId: profile.artisanId,
      name: profile.name,
      location: profile.location,
      district: profile.district,
      state: profile.state,
      craftType: profile.craftType,
      experience: profile.experience,
      artisanStory: profile.artisanStory,
      profileImageUrl: profile.profileImageUrl,
      products: profile.products.map(p => ({
        id: p.id,
        title: p.title,
        shortDescription: p.shortDescription,
        priceFormatted: `₹${paisaToRupees(p.sellingPrice).toLocaleString('en-IN')}`,
        category: p.category,
        imageUrl: p.images[0]?.processedUrl || p.images[0]?.originalUrl || null,
        inStock: (p.inventory?.currentStock || 0) > 0,
      })),
    };

    return NextResponse.json({ profile: publicProfile });
  } catch (error) {
    console.error('[PUBLIC] Artisan profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch artisan profile' }, { status: 500 });
  }
}
