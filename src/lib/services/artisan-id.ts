// ============================================
// Artisan ID Generator
// Format: ART-{STATE_CODE}-{6_CHAR_RANDOM}
// Guaranteed unique via DB constraint + retry
// ============================================

import prisma from '@/lib/db';
import { customAlphabet } from 'nanoid';

// Alphanumeric uppercase, no ambiguous chars (0/O, 1/I/L)
const nanoid = customAlphabet('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 6);

// Indian state code mapping
const STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TG',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  // Union Territories
  'delhi': 'DL',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
  'chandigarh': 'CH',
  'puducherry': 'PY',
  'andaman and nicobar': 'AN',
  'dadra and nagar haveli': 'DN',
  'lakshadweep': 'LD',
};

export function getStateCode(state?: string | null): string {
  if (!state) return 'IN'; // Default to India
  const normalized = state.toLowerCase().trim();
  return STATE_CODES[normalized] || 'IN';
}

/**
 * Generate a unique Artisan ID with retry logic
 * Will attempt up to 5 times before failing
 */
export async function generateArtisanId(state?: string | null): Promise<string> {
  const stateCode = getStateCode(state);
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const id = `ART-${stateCode}-${nanoid()}`;

    // Check uniqueness in DB
    const existing = await prisma.artisanProfile.findUnique({
      where: { artisanId: id },
      select: { id: true },
    });

    if (!existing) {
      return id;
    }

    console.warn(`[ARTISAN-ID] Collision on ${id}, retrying (${i + 1}/${maxRetries})`);
  }

  throw new Error('Failed to generate unique Artisan ID after maximum retries');
}
