// ============================================
// Image Processing Service
// Providers: Remove.bg API (optional) + Sharp.js Studio Engine (local)
// PhotoRoom removed completely
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
// Remove.bg API Provider (background removal)
// ============================================

class RemoveBgProvider implements ImageProcessingProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      throw new Error(
        'REMOVE_BG_API_KEY environment variable is not set.'
      );
    }
    this.apiKey = apiKey;
  }

  async processImage(imageBuffer: Buffer, mimeType: string): Promise<ImageProcessingResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
    formData.append('image_file', blob, 'image.jpg');
    formData.append('size', 'auto');
    formData.append('bg_color', 'ffffff'); // Pure white e-commerce background

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Remove.bg API error: ${response.status} - ${errorText}`);
    }

    const processedBuffer = Buffer.from(await response.arrayBuffer());

    return {
      processedBuffer,
      provider: 'remove_bg',
    };
  }
}

// ============================================
// Sharp.js Studio Engine (local e-commerce processing)
// No API key required — works 100% out of the box!
// Performs:
// - Studio lighting boost (modulate brightness + saturation)
// - E-commerce canvas centering (1200x1200 square)
// - Pure white background flattening
// - Unsharp mask sharpening
// ============================================

class SharpStudioEngine implements ImageProcessingProvider {
  async processImage(imageBuffer: Buffer, _mimeType: string): Promise<ImageProcessingResult> {
    const sharp = (await import('sharp')).default;

    const targetSize = 1200;

    // Process image: studio lighting boost, white background, square padding, sharpening
    const processedBuffer = await sharp(imageBuffer)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .modulate({
        brightness: 1.06,  // Subtle studio lighting boost
        saturation: 1.12,  // Richer color palette
      })
      .sharpen({ sigma: 1.2 }) // Product edge crispness
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
  // Try Remove.bg if configured, otherwise use built-in Sharp Studio Engine
  if (process.env.REMOVE_BG_API_KEY) {
    return new RemoveBgProvider();
  }

  return new SharpStudioEngine();
}

export function isImageProcessingConfigured(): boolean {
  return true; // SharpStudioEngine always works out of the box
}
