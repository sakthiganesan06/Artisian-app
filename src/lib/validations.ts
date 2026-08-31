// ============================================
// Zod Validation Schemas (shared frontend/backend)
// ============================================

import { z } from 'zod';

// --- Auth ---
export const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number is too long')
  .regex(/^\+?[0-9]+$/, 'Invalid phone number format');

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^[0-9]+$/, 'OTP must contain only digits');

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

// --- Artisan Profile ---
export const artisanProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  location: z.string().max(200).optional().nullable(),
  district: z.string().max(200).optional().nullable(),
  state: z.string().max(200).optional().nullable(),
  craftType: z.string().max(200).optional().nullable(),
  experience: z.string().max(200).optional().nullable(),
  artisanStory: z.string().max(2000).optional().nullable(),
  language: z.string().min(2).max(5).default('en'),
});

// --- Product ---
export const productCreateSchema = z.object({
  title: z.string().min(1, 'Product title is required').max(500),
  shortDescription: z.string().max(1000).optional().nullable(),
  longDescription: z.string().max(5000).optional().nullable(),
  highlights: z.array(z.string()).optional().default([]),
  category: z.string().max(200).optional().nullable(),
  material: z.string().max(200).optional().nullable(),
  craftTechnique: z.string().max(200).optional().nullable(),
  dimensions: z.string().max(200).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  weight: z.string().max(100).optional().nullable(),
  productionTime: z.string().max(200).optional().nullable(),
  sellingPrice: z.number().int().min(0, 'Price cannot be negative'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  moq: z.number().int().min(1, 'MOQ must be at least 1').default(1),
});

// --- Product Cost ---
export const productCostSchema = z.object({
  materialCost: z.number().min(0, 'Material cost cannot be negative'),
  labourCost: z.number().min(0, 'Labour cost cannot be negative'),
  labourHours: z.number().min(0).optional().nullable(),
  labourRate: z.number().min(0).optional().nullable(),
  labourDays: z.number().min(0).optional().nullable(),
  dailyLabourRate: z.number().min(0).optional().nullable(),
  otherCost: z.number().min(0, 'Other cost cannot be negative').default(0),
  costType: z.enum(['PER_UNIT', 'TOTAL_BATCH']).default('PER_UNIT'),
});

// --- Order ---
export const orderCreateSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  orderType: z.enum(['RETAIL', 'B2B']),
  buyerDetails: z.object({
    fullName: z.string().min(1, 'Full name is required').max(200),
    phone: phoneSchema,
    address: z.string().min(1, 'Address is required').max(1000),
    city: z.string().max(200).optional().nullable(),
    state: z.string().max(200).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
  }).optional(),
  b2bDetails: z.object({
    businessName: z.string().min(1, 'Business name is required').max(500),
    gstNumber: z.string()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GST number format'
      ),
    contactName: z.string().max(200).optional().nullable(),
    contactPhone: phoneSchema,
    address: z.string().min(1, 'Address is required').max(1000),
    city: z.string().max(200).optional().nullable(),
    state: z.string().max(200).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
  }).optional(),
}).refine(
  (data) => {
    if (data.orderType === 'RETAIL' && !data.buyerDetails) return false;
    if (data.orderType === 'B2B' && !data.b2bDetails) return false;
    return true;
  },
  { message: 'Buyer details are required for the selected order type' }
);

// --- Stock Check ---
export const stockCheckSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  orderType: z.enum(['RETAIL', 'B2B']),
});

// --- Language ---
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'Arabic' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Devanagari' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const languageCodeSchema = z.enum(
  SUPPORTED_LANGUAGES.map(l => l.code) as [string, ...string[]]
);
