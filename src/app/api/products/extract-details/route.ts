// POST /api/products/extract-details — Extract product details from transcript with rule-based fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ruleBasedProductExtract(transcript: string) {
  let category: string | null = null;
  let material: string | null = null;
  let craftTechnique: string | null = null;
  let quantity: number = 1;
  let productionTime: string | null = null;

  // Quantity matching (e.g., "5 pieces", "10 units", "3 available", "have 3")
  const qtyMatch = transcript.match(/(?:have|stock|quantity|qty|total|count)?\s*(\d+)\s*(?:pieces|units|items|available|in stock|sarees|pots|boxes)?/i);
  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1]);
    if (parsedQty > 0) quantity = parsedQty;
  }

  // Material matching
  const matMatch = transcript.match(/\b(silk|pattu|cotton|kanchipuram|chanderi|linen|georgette|chiffon|zari|terracotta|clay|brass|wood|bamboo|jute|wool|leather|metal|bronze|copper|handloom)\b/i);
  if (matMatch) {
    material = capitalizeWords(matMatch[1]);
  }

  // Category matching
  const catMatch = transcript.match(/\b(saree|sarif|pottery|jewellery|jewelry|home decor|clothing|apparel|craft|furniture|painting)\b/i);
  if (catMatch) {
    let catText = catMatch[1].toLowerCase().replace('sarif', 'saree').replace('jewelry', 'jewellery');
    category = capitalizeWords(catText);
  }

  // Craft Technique matching
  if (material === 'Silk' || material === 'Pattu' || material === 'Cotton' || category === 'Saree') {
    craftTechnique = 'Handloom Weaving';
  } else if (material === 'Terracotta' || material === 'Clay' || category === 'Pottery') {
    craftTechnique = 'Terracotta Crafting';
  } else if (material === 'Wood' || category === 'Woodcraft') {
    craftTechnique = 'Wood Carving';
  } else if (material === 'Brass' || material === 'Bronze' || material === 'Metal') {
    craftTechnique = 'Dokra Metal Craft';
  } else {
    craftTechnique = 'Traditional Handcraft';
  }

  // Production time (e.g., "3 days to make", "2 weeks", "5 hours")
  const timeMatch = transcript.match(/(\d+)\s*(days?|weeks?|hours?)/i);
  if (timeMatch) {
    productionTime = `${timeMatch[1]} ${capitalizeWords(timeMatch[2])}`;
  }

  const productNameParts = [];
  if (material) productNameParts.push(material);
  if (category) productNameParts.push(category);
  if (productNameParts.length === 0) productNameParts.push('Handcrafted Product');

  const productName = productNameParts.join(' ');

  return {
    productName,
    category: category || 'Handicraft',
    material: material || 'Handloom',
    quantity,
    productionTime: productionTime || '3 Days',
    craftTechnique,
    dimensions: null,
    color: null,
    weight: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { transcript, additionalText, language } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    let extracted;
    try {
      const aiService = getAIService();
      extracted = await aiService.extractProductDetails(transcript, additionalText, language);
    } catch (aiErr) {
      console.warn('[AI Product Extract Fallback] Using refined rule-based extraction:', aiErr);
      extracted = ruleBasedProductExtract(transcript);
    }

    return NextResponse.json({ extracted });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Extract product details error:', error);
    return NextResponse.json({ error: 'Failed to extract product details' }, { status: 500 });
  }
}
