// ============================================
// Image Processing Service
// Providers: Remove.bg AI Cutout + Sharp Studio Composite Engine
// ============================================

export interface ImageProcessingResult {
  processedBuffer: Buffer;
  processedUrl?: string;
  width?: number;
  height?: number;
  provider: string;
}

export interface ImageProcessingProvider {
  processImage(imageBuffer: Buffer, mimeType: string): Promise<ImageProcessingResult>;
}

// ============================================
// Remove.bg API + Sharp Studio Composite Engine
// ============================================

class RemoveBgProvider implements ImageProcessingProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      throw new Error('REMOVE_BG_API_KEY environment variable is not set.');
    }
    this.apiKey = apiKey;
  }

  async processImage(imageBuffer: Buffer, mimeType: string): Promise<ImageProcessingResult> {
    const sharp = (await import('sharp')).default;
    const targetSize = 1200;

    let cutoutPngBuffer: Buffer | null = null;

    // Call Remove.bg with size: 'preview' (works seamlessly on free tier and paid accounts)
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
      formData.append('image_file', blob, 'image.jpg');
      formData.append('size', 'preview');
      formData.append('format', 'png');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        cutoutPngBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        const errorText = await response.text();
        console.warn(`[IMAGE] Remove.bg response error ${response.status}: ${errorText}`);
      }
    } catch (apiErr) {
      console.warn('[IMAGE] Remove.bg fetch error:', apiErr);
    }

    // If cutout was successful, composite cleanly onto pure white studio canvas
    if (cutoutPngBuffer) {
      try {
        const resizedCutout = await sharp(cutoutPngBuffer)
          .resize(1020, 1020, { fit: 'inside' })
          .toBuffer();

        const processedBuffer = await sharp({
          create: {
            width: targetSize,
            height: targetSize,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        })
          .composite([{ input: resizedCutout, gravity: 'center' }])
          .modulate({
            brightness: 1.04,
            saturation: 1.10,
          })
          .sharpen({ sigma: 1.1 })
          .jpeg({ quality: 92 })
          .toBuffer();

        return {
          processedBuffer,
          width: targetSize,
          height: targetSize,
          provider: 'remove_bg_studio_composite',
        };
      } catch (sharpCompositeErr) {
        console.warn('[IMAGE] Sharp composite on cutout failed:', sharpCompositeErr);
      }
    }

    // Fallback: Local Sharp studio engine
    console.log('[IMAGE] Using Sharp local fallback engine');
    const sharpEngine = new SharpStudioEngine();
    return sharpEngine.processImage(imageBuffer, mimeType);
  }
}

// ============================================
// Sharp.js Studio Engine (local e-commerce processing)
// ============================================

class SharpStudioEngine implements ImageProcessingProvider {
  async processImage(imageBuffer: Buffer, _mimeType: string): Promise<ImageProcessingResult> {
    const sharp = (await import('sharp')).default;
    const targetSize = 1200;

    const processedBuffer = await sharp(imageBuffer)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .modulate({
        brightness: 1.06,
        saturation: 1.12,
      })
      .sharpen({ sigma: 1.2 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 92 })
      .toBuffer();

    return {
      processedBuffer,
      width: targetSize,
      height: targetSize,
      provider: 'sharp_studio_engine',
    };
  }
}

// ============================================
// Factory
// ============================================

export function getImageProcessor(): ImageProcessingProvider {
  if (process.env.REMOVE_BG_API_KEY) {
    return new RemoveBgProvider();
  }

  return new SharpStudioEngine();
}

export function isImageProcessingConfigured(): boolean {
  return true;
}
