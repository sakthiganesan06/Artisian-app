// ============================================
// AI Service Abstraction (Groq Llama 3.3 & Google Gemini)
// Used for: profile extraction, product extraction, description generation
// NOT used for: pricing, inventory, orders (those are deterministic)
// ============================================

import { z } from 'zod';

// --- Extracted Profile Schema ---
export const artisanProfileExtractionSchema = z.object({
  name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  craftType: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  artisanStory: z.string().nullable().optional(),
});

export type ArtisanProfileExtraction = z.infer<typeof artisanProfileExtractionSchema>;

// --- Extracted Product Schema ---
export const productExtractionSchema = z.object({
  productName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  productionTime: z.string().nullable().optional(),
  craftTechnique: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  otherAttributes: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ProductExtraction = z.infer<typeof productExtractionSchema>;

// --- Generated Description Schema ---
// Updated: separate fields for each language instead of mixing them
export const productDescriptionSchema = z.object({
  title: z.string(),
  shortDescription: z.string(),
  longDescription: z.string(),
  descriptionHindi: z.string().optional().default(''),
  descriptionRegional: z.string().optional().default(''),
  highlights: z.array(z.string()),
});

export type ProductDescription = z.infer<typeof productDescriptionSchema>;

// ============================================
// AI Service Interface
// ============================================

export interface AIService {
  extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction>;
  extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction>;
  generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription>;
}

function getLanguageDisplayName(code?: string): string {
  switch (code) {
    case 'ta': return 'Tamil (தமிழ்)';
    case 'hi': return 'Hindi (हिंदी)';
    case 'te': return 'Telugu (తెలుగు)';
    case 'kn': return 'Kannada (ಕನ್ನಡ)';
    case 'ml': return 'Malayalam (മലയാളം)';
    case 'en':
    default: return 'English';
  }
}

function getLanguageScript(code?: string): string {
  switch (code) {
    case 'ta': return 'தமிழ்';
    case 'hi': return 'हिंदी';
    case 'te': return 'తెలుగు';
    case 'kn': return 'ಕನ್ನಡ';
    case 'ml': return 'മലയാളം';
    default: return '';
  }
}

// ============================================
// Build the IMPROVED description generation prompt
// Key fix: Each language in its OWN field, not mixed together
// ============================================

function buildDescriptionSystemPrompt(langCode: string, langName: string): string {
  const isOtherRegional = langCode !== 'en' && langCode !== 'hi';
  const langScript = getLanguageScript(langCode);

  return `You are a professional product description writer for an authentic Indian artisan marketplace.

CRITICAL RULES:
1. Write each language in its OWN SEPARATE JSON field. NEVER mix languages within a single field.
2. "longDescription" MUST be written ONLY in English — no Hindi or other language words.
3. "descriptionHindi" MUST be written ONLY in Hindi (Devanagari script) — no English words.
${isOtherRegional ? `4. "descriptionRegional" MUST be written ONLY in ${langName} (${langScript} script) — no English or Hindi words.` : '4. "descriptionRegional" should be an empty string "".'}
5. "shortDescription" should be a brief English-only summary (1-2 sentences).
6. "title" should be a compelling English-only product title.
7. "highlights" should be 4-5 key selling points in English only.

Return ONLY valid JSON matching this exact schema:
{
  "title": "English product title",
  "shortDescription": "Brief English summary of the product",
  "longDescription": "2-3 paragraphs in ENGLISH ONLY describing the craftsmanship, artisan heritage, materials, and beauty of the product",
  "descriptionHindi": "2-3 paragraphs in HINDI ONLY (हिंदी में) describing the same product with the same richness",
  ${isOtherRegional ? `"descriptionRegional": "2-3 paragraphs in ${langName.toUpperCase()} ONLY (${langScript} में) describing the same product",` : '"descriptionRegional": "",'}
  "highlights": [
    "Key feature 1 in English",
    "Key feature 2 in English",
    "Key feature 3 in English",
    "Key feature 4 in English"
  ]
}`;
}

function buildDescriptionUserPrompt(params: {
  artisanName: string;
  artisanCraft?: string;
  artisanLocation?: string;
  productData: ProductExtraction;
  transcript: string;
  additionalText?: string;
  language?: string;
}): string {
  const langCode = params.language || 'en';
  const langName = getLanguageDisplayName(langCode);
  const productInfo = JSON.stringify(params.productData, null, 2);

  return `Artisan: ${params.artisanName}${params.artisanCraft ? `, craft: ${params.artisanCraft}` : ''}${params.artisanLocation ? `, from ${params.artisanLocation}` : ''}
Language: ${langName} (code: ${langCode})

Product Data:
${productInfo}

Artisan's own description (voice transcript): "${params.transcript}"
${params.additionalText ? `Additional notes: "${params.additionalText}"` : ''}

Write a rich, authentic product description. Remember: each language goes in its OWN field. Do NOT mix languages.`;
}

// ============================================
// 1. Groq AI Implementation (Ultra-Fast LPU Inference)
// ============================================

export class GroqAIService implements AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY environment variable is not set.');
    }
    this.apiKey = key.trim();
  }

  private async callGroq(prompt: string, systemInstruction: string): Promise<string> {
    const modelsToTry = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ];

    for (const modelName of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return content.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Groq model ${modelName} returned ${res.status}]:`, errData);
        }
      } catch (err) {
        console.warn(`[Groq model ${modelName} error]:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error('All Groq model candidates failed or timed out.');
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    const langName = getLanguageDisplayName(language);

    const systemInstruction = `You are an expert multilingual information extraction assistant specializing in Indian handicrafts.
Extract structured artisan profile information from a speech transcript. The transcript may be in ${langName} or a mix of languages.
IMPORTANT: Translate all extracted values to English. For example, if they say their name in Tamil, keep the name as-is but translate location/craft type to English equivalents.
Return valid JSON only.
Expected JSON:
{
  "name": string or null,
  "location": string or null (city/village name),
  "district": string or null,
  "state": string or null (Indian state name in English),
  "craftType": string or null (type of craft in English, e.g., "Silk Weaving", "Pottery", "Wood Carving"),
  "experience": string or null (e.g., "15 years"),
  "artisanStory": string or null (brief story about the artisan in English)
}`;

    const prompt = `Language: ${langName} (code: ${language || 'unknown'})
Extract artisan profile from this transcript. Only extract what is explicitly stated. Translate values to English where appropriate.

"${transcript}"`;

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    const langName = getLanguageDisplayName(language);

    const systemInstruction = `You are an expert multilingual product information extraction assistant for handcrafted artisan products.
Extract structured product details from a speech transcript. The transcript may be in ${langName} or a mix of languages.
IMPORTANT: Translate all extracted values to English. For example, "रेशमी साड़ी" → productName: "Silk Saree".
Return valid JSON only.
Expected JSON:
{
  "productName": string or null (product name in English),
  "category": string or null (category in English, e.g., "Saree", "Pottery", "Jewelry"),
  "material": string or null (material in English, e.g., "Silk", "Cotton", "Wood"),
  "quantity": number or null,
  "productionTime": string or null (e.g., "3 days", "1 week"),
  "craftTechnique": string or null (technique in English, e.g., "Handloom Weaving", "Hand Painting"),
  "dimensions": string or null,
  "color": string or null (color in English),
  "weight": string or null,
  "otherAttributes": object or null
}`;

    let prompt = `Language: ${langName} (code: ${language || 'unknown'})
Extract product details from this transcript. Translate values to English.

"${transcript}"`;
    if (additionalText) {
      prompt += `\n\nAdditional information:\n"${additionalText}"`;
    }

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productExtractionSchema.parse(parsed);
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    const langCode = params.language || 'en';
    const langName = getLanguageDisplayName(langCode);

    const systemInstruction = buildDescriptionSystemPrompt(langCode, langName);
    const prompt = buildDescriptionUserPrompt(params);

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productDescriptionSchema.parse(parsed);
  }
}

// ============================================
// 2. Google Gemini Implementation
// ============================================

export class GeminiAIService implements AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.apiKey = key.trim();
  }

  private async callGemini(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = this.apiKey.trim();
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            }
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return text.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Gemini model ${modelName} returned ${res.status}]:`, errData);
        }
      } catch (err) {
        console.warn(`[Gemini model ${modelName} failed, trying next candidate]:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error('All Gemini model candidates failed or timed out.');
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    const langName = getLanguageDisplayName(language);

    const systemInstruction = `You are an expert multilingual information extraction assistant specializing in Indian handicrafts.
Extract structured artisan profile information from a speech transcript. The transcript may be in ${langName} or a mix of languages.
IMPORTANT: Translate all extracted values to English. For example, if they say their name in Tamil, keep the name as-is but translate location/craft type to English equivalents.
Return valid JSON only.
Expected JSON:
{
  "name": string or null,
  "location": string or null,
  "district": string or null,
  "state": string or null,
  "craftType": string or null,
  "experience": string or null,
  "artisanStory": string or null
}`;

    const prompt = `Language: ${langName} (code: ${language || 'unknown'})
Extract artisan profile from this transcript. Only extract what is explicitly stated.

"${transcript}"`;

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    const langName = getLanguageDisplayName(language);

    const systemInstruction = `You are an expert multilingual product information extraction assistant for handcrafted products.
Extract structured product details from an artisan's speech transcript. The transcript may be in ${langName} or a mix of languages.
IMPORTANT: Translate all extracted values to English.
Return valid JSON only.
Expected JSON:
{
  "productName": string or null,
  "category": string or null,
  "material": string or null,
  "quantity": number or null,
  "productionTime": string or null,
  "craftTechnique": string or null,
  "dimensions": string or null,
  "color": string or null,
  "weight": string or null,
  "otherAttributes": object or null
}`;

    let prompt = `Language: ${langName} (code: ${language || 'unknown'})
Extract product details from this transcript. Translate values to English.

"${transcript}"`;
    if (additionalText) {
      prompt += `\n\nAdditional information:\n"${additionalText}"`;
    }

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productExtractionSchema.parse(parsed);
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    const langCode = params.language || 'en';
    const langName = getLanguageDisplayName(langCode);

    const systemInstruction = buildDescriptionSystemPrompt(langCode, langName);
    const prompt = buildDescriptionUserPrompt(params);

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productDescriptionSchema.parse(parsed);
  }
}

// ============================================
// 3. Fallback Multi-Provider AI Service
// Prioritizes Groq if available -> Falls back to Gemini
// ============================================

export class FallbackAIService implements AIService {
  private groqProvider: GroqAIService | null = null;
  private geminiProvider: GeminiAIService | null = null;

  constructor() {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
      try {
        this.groqProvider = new GroqAIService();
      } catch {}
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      try {
        this.geminiProvider = new GeminiAIService();
      } catch {}
    }
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.extractArtisanProfile(transcript, language);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq extraction failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.extractArtisanProfile(transcript, language);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.extractProductDetails(transcript, additionalText, language);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq product extraction failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.extractProductDetails(transcript, additionalText, language);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.generateProductDescription(params);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq description failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.generateProductDescription(params);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }
}

// ============================================
// Factory
// ============================================

export function getAIService(): AIService {
  return new FallbackAIService();
}

// Check if any AI is configured
export function isAIConfigured(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
}
