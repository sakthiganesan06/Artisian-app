// POST /api/products/upload-image — Upload product image
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getStorageProvider } from '@/lib/services/storage-service';
import prisma from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage
    const storage = getStorageProvider();
    const stored = await storage.upload(buffer, file.name, file.type, 'products/originals');

    // Create image record (not yet associated with a product)
    const image = await prisma.productImage.create({
      data: {
        productId: null,
        originalUrl: stored.url,
        mimeType: file.type,
        sizeBytes: stored.sizeBytes,
        isPrimary: true,
        processingStatus: 'PENDING',
      },
    });

    return NextResponse.json({
      image: {
        id: image.id,
        originalUrl: image.originalUrl,
        processingStatus: image.processingStatus,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[UPLOAD] Image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
