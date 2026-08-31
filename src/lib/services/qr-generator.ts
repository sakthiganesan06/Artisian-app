// ============================================
// QR Code Generator
// ============================================

import QRCode from 'qrcode';

/**
 * Generate QR code as data URL (base64 PNG)
 */
export async function generateQRDataUrl(artisanId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const profileUrl = `${baseUrl}/artisan/${artisanId}`;

  const dataUrl = await QRCode.toDataURL(profileUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return dataUrl;
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRSvg(artisanId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const profileUrl = `${baseUrl}/artisan/${artisanId}`;

  const svg = await QRCode.toString(profileUrl, {
    type: 'svg',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return svg;
}

/**
 * Get the public profile URL for an artisan
 */
export function getArtisanProfileUrl(artisanId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/artisan/${artisanId}`;
}
