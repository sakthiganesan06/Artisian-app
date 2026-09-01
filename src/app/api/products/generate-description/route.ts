// POST /api/products/generate-description — Generate multilingual product description using AI with fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import prisma from '@/lib/db';

function getLanguageDisplayName(code?: string): string {
  switch (code) {
    case 'ta': return 'Tamil';
    case 'hi': return 'Hindi';
    case 'te': return 'Telugu';
    case 'kn': return 'Kannada';
    case 'ml': return 'Malayalam';
    default: return 'English';
  }
}

function fallbackGenerateDescription(
  artisanName: string,
  productData: Record<string, unknown>,
  transcript: string,
  langCode: string = 'en'
) {
  const title = String(productData.productName || 'Authentic Handcrafted Creation');
  const material = productData.material ? String(productData.material) : 'natural materials';
  const category = productData.category ? String(productData.category) : 'handicraft';

  const longDescription = `This authentic ${category} is masterfully handcrafted by artisan ${artisanName} using traditional techniques and quality ${material}. Each piece is a unique work of art that celebrates India's rich craft heritage.\n\nOriginal artisan notes: "${transcript}".`;

  const descriptionHindi = `यह प्रामाणिक ${category} कारीगर ${artisanName} द्वारा पारंपरिक तकनीकों और गुणवत्तापूर्ण ${material} का उपयोग करके कुशलतापूर्वक हस्तनिर्मित किया गया है। प्रत्येक उत्पाद भारत की समृद्ध शिल्प विरासत का एक अनूठा प्रतीक है।`;

  let descriptionRegional = '';
  if (langCode === 'ta') {
    descriptionRegional = `இந்த உன்னதமான ${category} கைவினைஞர் ${artisanName} அவர்களால் பாரம்பரிய முறையிலும் உயர்தர ${material} கொண்டும் அழகுற உருவாக்கப்பட்டது. ஒவ்வொரு படைப்பும் இந்தியாவின் வளமான கைவினைப் பாரம்பரியத்தைக் கொண்டாடுகிறது.`;
  } else if (langCode === 'te') {
    descriptionRegional = `ఈ ప్రామాణికమైన ${category} కళాకారుడు ${artisanName} చేత సాంప్రదాయ పద్ధతుల్లో నాణ్యమైన ${material} ఉపయోగించి తయారు చేయబడింది. ప్రతి ఉత్పత్తి భారతదేశ సమృద్ధ హస్తకళా వారసత్వానికి ప్రతీక.`;
  } else if (langCode === 'kn') {
    descriptionRegional = `ಈ ಅಧಿಕೃತ ${category} ಕರಕುಶಲಕರ್ಮಿ ${artisanName} ಅವರಿಂದ ಸಾಂಪ್ರದಾಯಿಕ ಶೈಲಿಯಲ್ಲಿ ಗುಣಮಟ್ಟದ ${material} ಬಳಸಿ ಸುಂದರವಾಗಿ ರಚಿಸಲಾಗಿದೆ.`;
  } else if (langCode === 'ml') {
    descriptionRegional = `ഈ പരമ്പരാഗത ${category} കരകൗശല വിദഗ്ദ്ധൻ ${artisanName} ഗുണനിലവാരമുള്ള ${material} ഉപയോഗിച്ച് കൈകൊണ്ട് നിർമ്മിച്ചതാണ്.`;
  }

  return {
    title,
    shortDescription: `Handcrafted ${category} by artisan ${artisanName}, made with ${material}.`,
    longDescription,
    descriptionHindi,
    descriptionRegional,
    highlights: [
      `Authentic handcrafted ${category}`,
      `Made using genuine ${material}`,
      `Handmade by artisan ${artisanName}`,
      `Traditional Indian craftsmanship`,
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { productData, transcript, additionalText, language } = body;

    if (!productData || !transcript) {
      return NextResponse.json(
        { error: 'Product data and transcript are required' },
        { status: 400 }
      );
    }

    // Get artisan profile for context
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: session.userId },
      select: { name: true, craftType: true, location: true, language: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Artisan profile not found' }, { status: 404 });
    }

    const effectiveLanguage = language || profile.language || 'en';
    const langName = getLanguageDisplayName(effectiveLanguage);

    let description;
    try {
      const aiService = getAIService();
      description = await aiService.generateProductDescription({
        artisanName: profile.name,
        artisanCraft: profile.craftType || undefined,
        artisanLocation: profile.location || undefined,
        productData,
        transcript,
        additionalText,
        language: effectiveLanguage,
      });
    } catch (aiErr) {
      console.warn('[AI Description Fallback] Using rule-based description:', aiErr);
      description = fallbackGenerateDescription(profile.name, productData, transcript, effectiveLanguage);
    }

    return NextResponse.json({
      description,
      languageInfo: {
        code: effectiveLanguage,
        name: langName,
        hasRegional: effectiveLanguage !== 'en' && effectiveLanguage !== 'hi',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Generate description error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
