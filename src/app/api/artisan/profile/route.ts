// POST /api/artisan/profile — Create artisan profile
// GET /api/artisan/profile — Get current artisan's profile
// PUT /api/artisan/profile — Update profile
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { artisanProfileSchema } from '@/lib/validations';
import { generateArtisanId } from '@/lib/services/artisan-id';
import { generateQRDataUrl } from '@/lib/services/qr-generator';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await requireAuth();

    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
      include: {
        products: {
          where: { status: 'PUBLISHED' },
          select: { id: true, title: true, sellingPrice: true, status: true },
          take: 10,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate QR code
    const qrCode = await generateQRDataUrl(profile.artisanId);

    return NextResponse.json({ profile, qrCode });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[ARTISAN] Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Check if profile already exists
    const existing = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 });
    }

    const body = await request.json();
    const parsed = artisanProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Generate unique Artisan ID
    const artisanId = await generateArtisanId(data.state);

    // Create profile in DB
    const profile = await prisma.artisanProfile.create({
      data: {
        userId: session.userId,
        artisanId,
        name: data.name,
        location: data.location,
        district: data.district,
        state: data.state,
        stateCode: data.state ? (await import('@/lib/services/artisan-id')).getStateCode(data.state) : 'IN',
        craftType: data.craftType,
        experience: data.experience,
        artisanStory: data.artisanStory,
        language: data.language,
        isOnboarded: true,
      },
    });

    // Generate QR code
    const qrCode = await generateQRDataUrl(profile.artisanId);

    return NextResponse.json({ profile, qrCode }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[ARTISAN] Create profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = artisanProfileSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const profile = await prisma.artisanProfile.update({
      where: { userId: session.userId },
      data: parsed.data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[ARTISAN] Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
