// POST /api/products/extract-details — Universal product details extraction with multilingual fallback
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
  let productName: string | null = null;
  let category: string | null = null;
  let material: string | null = null;
  let craftTechnique: string | null = null;
  let quantity: number = 1;
  let productionTime: string | null = null;
  let dimensions: string | null = null;
  let weight: string | null = null;
  let color: string | null = null;

  // --- 1. Quantity Extraction (Universal numbers) ---
  const qtyMatch = transcript.match(/(?:இருப்பு|ஸ்டாக்|स्टॉक|stock|quantity|qty|total|count|have|ready)?\s*(\d+)\s*(?:துண்டுகள்|எண்ணிக்கை|பீஸ்|पीस|pieces|units|items|available|in stock|pots|vases|toys|lamps|sarees|boxes|sets)?/i);
  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1]);
    if (parsedQty > 0) quantity = parsedQty;
  }

  // --- 2. Tamil Products ---
  if (/[\u0B80-\u0BFF]/.test(transcript)) {
    // Tamil Materials
    if (/களிமண்|சுடுமண்/i.test(transcript)) material = 'களிமண் / சுடுமண் (Terracotta Clay)';
    else if (/பட்டு நூல்|பட்டு/i.test(transcript)) material = 'தூய பட்டு (Pure Silk)';
    else if (/பருத்தி|நூல்/i.test(transcript)) material = 'பருத்தி (Cotton)';
    else if (/மரம்|தேக்கு/i.test(transcript)) material = 'மர வேலை (Wood)';
    else if (/மூங்கில்|பிரம்பு/i.test(transcript)) material = 'மூங்கில் / பிரம்பு (Bamboo & Cane)';
    else if (/பித்தளை|வெண்கலம்|செம்பு/i.test(transcript)) material = 'பித்தளை / உலோகம் (Brass / Bronze Metal)';
    else if (/சணல்|கோரை/i.test(transcript)) material = 'சணல் / புல் (Jute / Natural Grass)';

    // Tamil Categories & Product Names
    if (/பானை|குடுவை|ஜாடி|சட்டி|குவளை/i.test(transcript)) {
      category = 'மண்பாண்டம் (Pottery & Cookware)';
      productName = 'பாரம்பரிய சுடுமண் குடுவை / பாண்டம்';
      craftTechnique = 'சுடுமண் சக்கர கைவினை (Wheel-thrown Pottery)';
    } else if (/விளக்கு|தொங்கு விளக்கு|தீபம்/i.test(transcript)) {
      category = 'வீட்டு அலங்காரம் (Home Decor & Lighting)';
      productName = 'கைவினை விளக்கு (Handmade Lamp)';
      craftTechnique = 'பாரம்பரிய கைவினை (Traditional Handcraft)';
    } else if (/பொம்மை|ஆட்டக்காய்|மர பொம்மை/i.test(transcript)) {
      category = 'மர பொம்மைகள் (Wooden Toys)';
      productName = 'பாரம்பரிய கைவினை பொம்மை (Handcrafted Toy)';
      craftTechnique = 'மரக்குடைவு (Wood Lathe & Carving)';
    } else if (/ஓவியம்|படம்/i.test(transcript)) {
      category = 'ஓவியம் (Handmade Paintings)';
      productName = 'பாரம்பரிய கைவினை ஓவியம்';
      craftTechnique = 'கைமுறை ஓவியம் (Hand-painted)';
    } else if (/புடவை|சேலை|வேட்டி|துண்டு/i.test(transcript)) {
      category = 'கைத்தறி ஆடை (Handloom Textiles)';
      productName = 'பாரம்பரிய கைத்தறி புடவை / ஆடை';
      craftTechnique = 'கைத்தறி நெசவு (Handloom Weaving)';
    } else if (/கூடை|தட்டு|பின்னல்/i.test(transcript)) {
      category = 'கூடை & பிரம்பு வேலை (Baskets & Weaving)';
      productName = 'கைமுறை பின்னல் கூடை (Hand-woven Basket)';
      craftTechnique = 'கை பின்னல் (Hand Weaving)';
    }

    // Dimensions & Weight
    const dimMatch = transcript.match(/(\d+)\s*(?:அங்குலம்|இன்ச்|சென்டிமீட்டர்|அடி)/);
    if (dimMatch) dimensions = dimMatch[0];

    const wtMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:கிலோ|கிராம்|kg|g)/i);
    if (wtMatch) weight = wtMatch[0];

    const timeMatch = transcript.match(/(\d+)\s*(?:நாட்கள்|நாளு|மணிகள்|வாரம்)/);
    if (timeMatch) productionTime = timeMatch[0];
  }

  // --- 3. Hindi Products ---
  if (/[\u0900-\u097F]/.test(transcript)) {
    if (/मिट्टी|टेराकोटा/i.test(transcript)) material = 'मिट्टी (Terracotta Clay)';
    else if (/लकड़ी|शीशम/i.test(transcript)) material = 'लकड़ी (Wood)';
    else if (/पीतल|तांबा|कांसा/i.test(transcript)) material = 'पीतल / धातु (Brass / Metal)';
    else if (/रेशम|सिल्क/i.test(transcript)) material = 'रेशम (Silk)';
    else if (/सूती|कॉटन/i.test(transcript)) material = 'सूती (Cotton)';

    if (/बर्तन|घड़ा|गुलदस्ता|दीया/i.test(transcript)) {
      category = 'मिट्टी के बर्तन (Pottery)';
      productName = 'हस्तनिर्मित मिट्टी का उत्पाद';
      craftTechnique = 'चाक पर बना (Wheel Pottery)';
    } else if (/खिलौना|मूर्ती/i.test(transcript)) {
      category = 'खिलौने और मूर्तियां (Toys & Figurines)';
      productName = 'हस्तनिर्मित लकड़ी का खिलौना';
      craftTechnique = 'हाथ की नक्काशी (Hand Carving)';
    } else if (/पेंटिंग|चित्र/i.test(transcript)) {
      category = 'हस्तकला पेंटिंग (Folk Art Painting)';
      productName = 'हस्तनिर्मित पारंपरिक पेंटिंग';
      craftTechnique = 'हाथ से चित्रित (Hand-painted)';
    }
  }

  // --- 4. English Products (Universal) ---
  if (!category) {
    const matMatch = transcript.match(/\b(clay|terracotta|wood|teak|bamboo|cane|brass|bronze|copper|metal|iron|silk|cotton|jute|wool|leather|glass|ceramic|marble|stone|paper|beads)\b/i);
    if (matMatch) material = capitalizeWords(matMatch[1]);

    const catMatch = transcript.match(/\b(pottery|pot|vase|cup|bowl|toy|doll|lamp|lantern|basket|box|statue|sculpture|idol|painting|art|saree|shawl|scarf|rug|carpet|bag|pouch|jewellery|jewelry|necklace|bangle|earring|candle|soap|decor)\b/i);
    if (catMatch) {
      const c = catMatch[1].toLowerCase();
      if (['pottery', 'pot', 'vase', 'cup', 'bowl'].includes(c)) category = 'Pottery & Ceramics';
      else if (['toy', 'doll'].includes(c)) category = 'Handmade Toys';
      else if (['lamp', 'lantern'].includes(c)) category = 'Home Lighting & Decor';
      else if (['basket', 'box'].includes(c)) category = 'Baskets & Storage';
      else if (['statue', 'sculpture', 'idol'].includes(c)) category = 'Sculptures & Statues';
      else if (['painting', 'art'].includes(c)) category = 'Handmade Paintings';
      else if (['saree', 'shawl', 'scarf', 'rug', 'carpet'].includes(c)) category = 'Textiles & Handloom';
      else if (['jewellery', 'jewelry', 'necklace', 'bangle', 'earring'].includes(c)) category = 'Handcrafted Jewellery';
      else category = 'Handicrafts & Decor';
    }

    const nameParts = [];
    if (material) nameParts.push(material);
    if (category) nameParts.push(category);
    if (nameParts.length > 0) productName = `Handcrafted ${nameParts.join(' ')}`;
  }

  return {
    productName: productName || 'Handcrafted Artisan Creation',
    category: category || 'Handicrafts',
    material: material || null,
    quantity,
    productionTime: productionTime || '2-3 Days',
    craftTechnique: craftTechnique || 'Traditional Craftsmanship',
    dimensions: dimensions || null,
    color: color || null,
    weight: weight || null,
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
      console.warn('[AI Product Extract Fallback] Using universal multi-craft extraction:', aiErr);
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
