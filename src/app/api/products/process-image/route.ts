// POST /api/products/process-image — AI image processing
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getImageProcessor } from '@/lib/image/image-service';
import { getStorageProvider } from '@/lib/services/storage-service';
import prisma from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Update status to PROCESSING
    await prisma.productImage.update({
      where: { id: imageId },
      data: { processingStatus: 'PROCESSING' },
    });

    try {
      // Read the original image
      const originalPath = path.join(process.cwd(), 'public', image.originalUrl);
      const imageBuffer = await fs.readFile(originalPath);

      // Process image
      const processor = getImageProcessor();
      const result = await processor.processImage(imageBuffer, image.mimeType || 'image/jpeg');

      // Store processed image
      const storage = getStorageProvider();
      const stored = await storage.upload(
        result.processedBuffer,
        'processed.jpg',
        'image/jpeg',
        'products/processed'
      );

      // Update image record
      const updated = await prisma.productImage.update({
        where: { id: imageId },
        data: {
          processedUrl: stored.url,
          processingStatus: 'COMPLETED',
          width: result.width,
          height: result.height,
        },
      });

      return NextResponse.json({
        image: {
          id: updated.id,
          originalUrl: updated.originalUrl,
          processedUrl: updated.processedUrl,
          processingStatus: updated.processingStatus,
        },
      });
    } catch (processingError) {
      // Mark as failed
      await prisma.productImage.update({
        where: { id: imageId },
        data: {
          processingStatus: 'FAILED',
          processingError: processingError instanceof Error ? processingError.message : 'Processing failed',
        },
      });

      throw processingError;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[IMAGE] Process error:', error);
    return NextResponse.json(
      { error: 'Image processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
