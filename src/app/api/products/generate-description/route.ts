// POST /api/products/generate-description — Generate multilingual product description using AI with fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import prisma from '@/lib/db';

function fallbackGenerateDescription(
  artisanName: string,
  productData: Record<string, unknown>,
  transcript: string,
  langCode: string = 'en'
) {
  const title = String(productData.productName || 'Authentic Handcrafted Creation');
  const material = productData.material ? String(productData.material) : 'natural materials';
  const category = productData.category ? String(productData.category) : 'handicraft';

  let regionalSection = '';
  if (langCode === 'ta') {
    regionalSection = `\n\n**தமிழ் (Tamil)**:\nஇந்த உன்னதமான ${category} கைவினைஞர் ${artisanName} அவர்களால் பாரம்பரிய முறையிலும் உயர்தர இயற்கை ${material} கொண்டும் அழகுற உருவாக்கப்பட்டது.`;
  } else if (langCode === 'te') {
    regionalSection = `\n\n**తెలుగు (Telugu)**:\nఈ ప్రామాణికమైన ${category} కళాకారుడు ${artisanName} చేత సాంప్రదాయ పద్ధతుల్లో నాణ్యమైన సహజ ${material} ఉపయోగించి తయారు చేయబడింది.`;
  } else if (langCode === 'kn') {
    regionalSection = `\n\n**ಕನ್ನಡ (Kannada)**:\nಈ ಅಧಿಕೃತ ${category} ಕರಕುಶಲಕರ್ಮಿ ${artisanName} ಅವರಿಂದ ಸಾಂಪ್ರದಾಯಿಕ ಶೈಲಿಯಲ್ಲಿ ಗುಣಮಟ್ಟದ ${material} ಬಳಸಿ ಸುಂದರವಾಗಿ ರಚಿಸಲಾಗಿದೆ.`;
  } else if (langCode === 'ml') {
    regionalSection = `\n\n**മലയാളം (Malayalam)**:\nഈ പരമ്പരാഗത ${category} കരകൗശല വിദഗ്ദ്ധൻ ${artisanName} ഗുണനിലവാരമുള്ള പ്രകൃതിദത്ത ${material} ഉപയോഗിച്ച് കൈകൊണ്ട് നിർമ്മിച്ചതാണ്.`;
  }

  const longDescription = `**English**:
This authentic ${category} is masterfully handcrafted by artisan ${artisanName} using traditional techniques and quality ${material}. Original artisan notes: "${transcript}".

**हिंदी (Hindi)**:
यह प्रामाणिक ${category} कारीगर ${artisanName} द्वारा पारंपरिक तकनीकों और गुणवत्तापूर्ण ${material} का उपयोग करके कुशलतापूर्वक हस्तनिर्मित किया गया है।${regionalSection}`;

  const shortDescription = `Handcrafted ${category} by artisan ${artisanName} (${material}) | कारीगर ${artisanName} द्वारा निर्मित ${category}`;

  return {
    title,
    shortDescription,
    longDescription,
    highlights: [
      `Authentic Handcrafted ${category} / प्रामाणिक हस्तशिल्प`,
      `Made using genuine ${material} / प्राकृतिक सामग्री`,
      `Handmade quality by ${artisanName} / कारीगर द्वारा निर्मित`,
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
      console.warn('[AI Description Fallback] Using grounded multilingual rule-based description:', aiErr);
      description = fallbackGenerateDescription(profile.name, productData, transcript, effectiveLanguage);
    }

    return NextResponse.json({ description });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Generate description error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}

