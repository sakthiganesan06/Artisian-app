// ============================================
// Online E-Commerce Platform Price Intelligence
// Compares handcrafted items with Amazon, Flipkart, Etsy, Jaypore & FabIndia
// ============================================

import prisma from '@/lib/db';

export interface PlatformPriceInfo {
  platform: string;
  minPriceRupees: number;
  maxPriceRupees: number;
  avgPriceRupees: number;
  notes: string;
  badge?: string;
  icon?: string;
}

export interface OnlineMarketComparisonResult {
  platforms: PlatformPriceInfo[];
  marketLowestRupees: number;
  marketHighestRupees: number;
  marketAverageRupees: number;
  pricingInsight: string;
  source: string;
}

/**
 * Fetch real-time online platform comparables using AI intelligence
 * with automated DB fallback & caching.
 */
export async function getOnlinePlatformPriceComparison(params: {
  productName?: string | null;
  category?: string | null;
  material?: string | null;
  craftTechnique?: string | null;
  dimensions?: string | null;
  weight?: string | null;
}): Promise<OnlineMarketComparisonResult> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (apiKey) {
    try {
      const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
      
      const systemInstruction = `You are an expert e-commerce market pricing intelligence analyst for Indian handicraft, artisanal, and handloom products.
Analyze current real-world retail pricing across major online platforms for the given handcrafted product.
Platforms to compare:
1. Amazon India (Amazon Karigar)
2. Flipkart (Flipkart Samarth)
3. Etsy India (Handcrafted / Global)
4. Jaypore / FabIndia (Premium Artisanal Boutique)

Return valid JSON with format:
{
  "platforms": [
    { "platform": "Amazon India", "minPriceRupees": number, "maxPriceRupees": number, "avgPriceRupees": number, "notes": string },
    { "platform": "Flipkart", "minPriceRupees": number, "maxPriceRupees": number, "avgPriceRupees": number, "notes": string },
    { "platform": "Etsy India", "minPriceRupees": number, "maxPriceRupees": number, "avgPriceRupees": number, "notes": string },
    { "platform": "Jaypore / FabIndia", "minPriceRupees": number, "maxPriceRupees": number, "avgPriceRupees": number, "notes": string }
  ],
  "marketLowestRupees": number,
  "marketHighestRupees": number,
  "marketAverageRupees": number,
  "pricingInsight": string
}`;

      const prompt = `Analyze real-time online retail price ranges across Amazon, Flipkart, Etsy, and FabIndia for this handcrafted product:\n${JSON.stringify(params, null, 2)}`;

      for (const modelName of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
            })
          });

          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              const result: OnlineMarketComparisonResult = {
                platforms: (parsed.platforms || []).map((p: Record<string, unknown>) => ({
                  platform: String(p.platform || 'Online Market'),
                  minPriceRupees: Math.round(Number(p.minPriceRupees) || 0),
                  maxPriceRupees: Math.round(Number(p.maxPriceRupees) || 0),
                  avgPriceRupees: Math.round(Number(p.avgPriceRupees) || 0),
                  notes: String(p.notes || ''),
                  badge: String(p.platform || '').includes('Amazon') ? '📦 Amazon Karigar' :
                         String(p.platform || '').includes('Flipkart') ? '🛍️ Flipkart' :
                         String(p.platform || '').includes('Etsy') ? '🌍 Etsy Handcrafted' : '🏛️ Jaypore / FabIndia',
                  icon: String(p.platform || '').includes('Amazon') ? '📦' :
                        String(p.platform || '').includes('Flipkart') ? '🛍️' :
                        String(p.platform || '').includes('Etsy') ? '🌍' : '🏛️',
                })),
                marketLowestRupees: Math.round(Number(parsed.marketLowestRupees) || 0),
                marketHighestRupees: Math.round(Number(parsed.marketHighestRupees) || 0),
                marketAverageRupees: Math.round(Number(parsed.marketAverageRupees) || 0),
                pricingInsight: parsed.pricingInsight || 'Retail pricing reflects commercial markups and marketplace commissions.',
                source: 'Live Online Platform AI Benchmark',
              };

              // Cache reference price in DB asynchronously
              if (params.category && result.marketLowestRupees > 0) {
                prisma.marketComparable.create({
                  data: {
                    category: params.category,
                    material: params.material,
                    craftType: params.craftTechnique,
                    minPrice: result.marketLowestRupees * 100, // in paisa
                    maxPrice: result.marketHighestRupees * 100,
                    avgPrice: result.marketAverageRupees * 100,
                    source: 'online_market_intelligence',
                    sampleSize: 4,
                  }
                }).catch(() => {});
              }

              return result;
            }
          }
        } catch (mErr) {
          console.warn(`[Online Pricing Model ${modelName} Error]:`, mErr);
        }
      }
    } catch (err) {
      console.warn('[Online Pricing Error]:', err);
    }
  }

  // Deterministic Default Estimation if API is unreachable
  return getDefaultPlatformComparison(params);
}

function getDefaultPlatformComparison(params: {
  category?: string | null;
  material?: string | null;
}): OnlineMarketComparisonResult {
  const cat = (params.category || '').toLowerCase();
  let baseMin = 450;
  let baseMax = 1200;

  if (cat.includes('saree') || cat.includes('silk') || cat.includes('handloom')) {
    baseMin = 2500;
    baseMax = 8500;
  } else if (cat.includes('pottery') || cat.includes('clay') || cat.includes('terracotta')) {
    baseMin = 350;
    baseMax = 1100;
  } else if (cat.includes('wood') || cat.includes('toy')) {
    baseMin = 400;
    baseMax = 1500;
  } else if (cat.includes('metal') || cat.includes('brass') || cat.includes('bronze')) {
    baseMin = 1200;
    baseMax = 4500;
  } else if (cat.includes('painting') || cat.includes('art')) {
    baseMin = 1500;
    baseMax = 6000;
  } else if (cat.includes('jewel')) {
    baseMin = 500;
    baseMax = 2200;
  }

  return {
    platforms: [
      {
        platform: 'Amazon India (Karigar)',
        minPriceRupees: baseMin,
        maxPriceRupees: Math.round(baseMax * 0.85),
        avgPriceRupees: Math.round((baseMin + baseMax * 0.85) / 2),
        notes: 'Commercial marketplace pricing with standard delivery & packaging fees.',
        badge: '📦 Amazon Karigar',
        icon: '📦'
      },
      {
        platform: 'Flipkart (Samarth)',
        minPriceRupees: Math.round(baseMin * 0.9),
        maxPriceRupees: Math.round(baseMax * 0.8),
        avgPriceRupees: Math.round((baseMin * 0.9 + baseMax * 0.8) / 2),
        notes: 'Competitive value pricing with high-volume promotional discounts.',
        badge: '🛍️ Flipkart',
        icon: '🛍️'
      },
      {
        platform: 'Etsy India',
        minPriceRupees: Math.round(baseMin * 1.3),
        maxPriceRupees: Math.round(baseMax * 1.5),
        avgPriceRupees: Math.round((baseMin * 1.3 + baseMax * 1.5) / 2),
        notes: 'Global handcrafted marketplace commanding premium artisan appreciation.',
        badge: '🌍 Etsy Handcrafted',
        icon: '🌍'
      },
      {
        platform: 'Jaypore / FabIndia',
        minPriceRupees: Math.round(baseMin * 1.6),
        maxPriceRupees: Math.round(baseMax * 1.8),
        avgPriceRupees: Math.round((baseMin * 1.6 + baseMax * 1.8) / 2),
        notes: 'Curated artisanal boutique retail with high branding and retail markups.',
        badge: '🏛️ Jaypore / FabIndia',
        icon: '🏛️'
      },
    ],
    marketLowestRupees: Math.round(baseMin * 0.9),
    marketHighestRupees: Math.round(baseMax * 1.8),
    marketAverageRupees: Math.round((baseMin + baseMax) / 2 * 1.2),
    pricingInsight: 'Commercial platforms add 25-45% intermediary fees. Selling directly gives artisans superior profit margins while offering fair prices to customers.',
    source: 'Market Benchmark Reference',
  };
}
