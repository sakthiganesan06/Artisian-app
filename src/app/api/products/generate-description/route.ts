// POST /api/products/generate-description — Generate product description using AI with fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import prisma from '@/lib/db';

function fallbackGenerateDescription(artisanName: string, productData: Record<string, unknown>, transcript: string) {
  const title = String(productData.productName || 'Authentic Handcrafted Creation');
  const material = productData.material ? String(productData.material) : 'natural materials';
  const category = productData.category ? String(productData.category) : 'handicraft';

  return {
    title,
    shortDescription: `Handcrafted ${category} made from ${material} by artisan ${artisanName}.`,
    longDescription: `This authentic ${category} is masterfully crafted by ${artisanName} using traditional techniques and quality ${material}. Original Artisan Notes: "${transcript}".`,
    highlights: [
      `Authentic ${category} by ${artisanName}`,
      `Crafted using ${material}`,
      `Handmade quality & artisan heritage`,
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { productData, transcript, additionalText } = body;

    if (!productData || !transcript) {
      return NextResponse.json(
        { error: 'Product data and transcript are required' },
        { status: 400 }
      );
    }

    // Get artisan profile for context
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
      select: { name: true, craftType: true, location: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artisan profile not found' }, { status: 404 });
    }

    let description;
    try {
      const aiService = getAIService();
      description = await aiService.generateProductDescription({
        artisanName: profile.name,
        artisanCraft: profile.craftType || undefined,
        artisanLocation: profile.location || undefined,
        productData,
        transcript,
        additionalText,
      });
    } catch (aiErr) {
      console.warn('[AI Description Fallback] Using grounded rule-based description:', aiErr);
      description = fallbackGenerateDescription(profile.name, productData, transcript);
    }

    return NextResponse.json({ description });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Generate description error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
