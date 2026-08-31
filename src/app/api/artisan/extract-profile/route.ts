// POST /api/artisan/extract-profile — Extract profile from transcript using AI + Rule-based fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import prisma from '@/lib/db';

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ruleBasedExtractProfile(transcript: string) {
  let name: string | null = null;
  let location: string | null = null;
  let district: string | null = null;
  let state: string | null = null;
  let craftType: string | null = null;
  let experience: string | null = null;

  // --- 1. Tamil Extraction ---
  if (/[\u0B80-\u0BFF]/.test(transcript)) {
    state = 'தமிழ்நாடு (Tamil Nadu)';

    // Tamil Name (e.g., "என் பெயர் சக்தி", "நான் சக்தி")
    const taNameMatch = transcript.match(/(?:என் பெயர்|பெயர்)\s+([^\.\,\s]+(?:\s+[^\.\,\s]+)?)/);
    if (taNameMatch) {
      name = taNameMatch[1].replace(/\b(?:நான்|ஊர்|வசிக்கும்)\b/g, '').trim();
    }

    // Tamil Location (e.g., "திருநெல்வேலியில் வசிக்கிறேன்", "மதுரையில் இருந்து")
    const taLocMatch = transcript.match(/(?:நான்\s+)?([^\.\,\s]+)(?:யில்|இல்)\s+(?:வசிக்கிறேன்|இருந்து|உள்ளேன்)/);
    if (taLocMatch) {
      location = taLocMatch[1].trim();
      district = taLocMatch[1].trim();
    } else {
      const knownCities = transcript.match(/\b(திருநெல்வேலி|மதுரை|சென்னை|காஞ்சிபுரம்|சேலம்|தஞ்சாவூர்|ஈரோடு|கோயம்புத்தூர்|திருச்சி|திண்டுக்கல்|நாகர்கோவில்)\b/);
      if (knownCities) {
        location = knownCities[1];
        district = knownCities[1];
      }
    }

    // Tamil Craft (e.g., "பட்டுப் புடவைகள் நெய்கிறேன்", "மண்பாண்டம் செய்கிறேன்")
    if (/பட்டுப்?\s*புடவை|பட்டுச்சேலை|நெசவு|நெய்கிறேன்|கைத்தறி/i.test(transcript)) {
      craftType = 'பட்டுப் புடவை நெசவு (Handloom Silk Weaving)';
    } else if (/மண்பாண்டம்|களிமண்|சுடுமண்|பானை/i.test(transcript)) {
      craftType = 'சுடுமண் சிற்பம் / மண்பாண்டம் (Terracotta Pottery)';
    } else if (/மரச்சிற்பம்|மரம்|மரவேலை/i.test(transcript)) {
      craftType = 'மரச் சிற்ப வேலை (Wood Carving)';
    } else if (/தஞ்சாவூர் ஓவியம்|ஓவியம்/i.test(transcript)) {
      craftType = 'தஞ்சாவூர் ஓவியம் (Tanjore Painting)';
    }

    // Tamil Experience (e.g., "15 ஆண்டுகள்", "10 வருடம்")
    const taExpMatch = transcript.match(/(\d+)\s*(?:ஆண்டுகள்?|வருடங்கள்?|வருஷமா)/);
    if (taExpMatch) {
      experience = `${taExpMatch[1]} ஆண்டுகள் (${taExpMatch[1]} Years)`;
    }
  }

  // --- 2. Hindi Extraction ---
  if (/[\u0900-\u097F]/.test(transcript)) {
    const hiNameMatch = transcript.match(/(?:मेरा नाम|नाम है)\s+([^\.\,\s]+(?:\s+[^\.\,\s]+)?)/);
    if (hiNameMatch) name = hiNameMatch[1].trim();

    const hiLocMatch = transcript.match(/([^\.\,\s]+)\s+(?:में रहता|में रहती|से हूँ|का रहने वाला)/);
    if (hiLocMatch) {
      location = hiLocMatch[1].trim();
      district = hiLocMatch[1].trim();
    }

    if (/साड़ी|रेशम|हथकरघा|बुनाई/i.test(transcript)) {
      craftType = 'हथकरघा बुनाई (Handloom Weaving)';
    } else if (/मिट्टी|बर्तन|टेराकोटा/i.test(transcript)) {
      craftType = 'मिट्टी के बर्तन (Pottery & Terracotta)';
    }

    const hiExpMatch = transcript.match(/(\d+)\s*(?:साल|वर्ष)/);
    if (hiExpMatch) experience = `${hiExpMatch[1]} वर्ष (${hiExpMatch[1]} Years)`;
  }

  // --- 3. English Extraction (Fallback) ---
  if (!name || !craftType) {
    const stateMatch = transcript.match(/\b(tamil nadu|kerala|karnataka|andhra pradesh|telangana|maharashtra|gujarat|rajasthan|punjab|west bengal|uttar pradesh|bihar|odisha|assam)\b/i);
    if (stateMatch && !state) {
      state = capitalizeWords(stateMatch[1]);
    }

    const nameMatch = transcript.match(/(?:my name is|i am|name is)\s+([a-z]+(?:\s+[a-z]+)?)/i);
    if (nameMatch && !name) {
      const rawName = nameMatch[1].split(/\s+(?:from|in|i|and|who|living)\b/i)[0];
      name = capitalizeWords(rawName.trim());
    }

    const locMatch = transcript.match(/(?:from|in|living in|based in)\s+([a-z\s]+)/i);
    if (locMatch && !location) {
      let locText = locMatch[1].split(/\s+(?:i|and|who|make|weave|craft|having)\b/i)[0].trim();
      if (stateMatch && locText.toLowerCase().includes(stateMatch[1].toLowerCase())) {
        locText = locText.replace(new RegExp(stateMatch[1], 'gi'), '').trim();
      }
      if (locText) {
        location = capitalizeWords(locText);
        district = location;
      }
    }

    if (!craftType) {
      const craftMatch = transcript.match(/(?:make|weave|craft|create|produce|specialized in|specializing in)\s+([a-z\s]+)/i);
      if (craftMatch) {
        let craftText = craftMatch[1].split(/\s+(?:and|i|with|having|for|\d+)\b/i)[0].trim();
        craftText = craftText.replace(/\bsharif\b/gi, 'saree').replace(/\bhandloom saree\b/gi, 'Handloom Saree');
        craftType = capitalizeWords(craftText);
      } else if (/saree|sharif|handloom|pottery|clay|wood|embroidery|silk|cotton|metal|jewellery|painting/i.test(transcript)) {
        const wordMatch = transcript.match(/(?:[a-z]+\s+)?(?:saree|sharif|handloom|pottery|clay|wood|embroidery|silk|cotton|metal|jewellery|painting)(?:\s+[a-z]+)?/i);
        if (wordMatch) {
          craftType = capitalizeWords(wordMatch[0].replace(/\bsharif\b/gi, 'saree'));
        }
      }
    }

    const expMatch = transcript.match(/(\d+\s*(?:years?|yrs?)(?:\s*of(?:\s*experience)?)?)/i);
    if (expMatch && !experience) experience = expMatch[1].trim();
  }

  return {
    name: name || 'Artisan',
    location: location || null,
    district: district || location || null,
    state: state || null,
    craftType: craftType || 'Handicraft',
    experience: experience || null,
    artisanStory: transcript,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { transcript, language } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    let extracted;
    try {
      // Try AI Service (Google Gemini)
      const aiService = getAIService();
      extracted = await aiService.extractArtisanProfile(transcript, language);
    } catch (aiError) {
      console.warn('[AI Extract Fallback] Gemini API error, using refined rule-based extraction:', aiError);
      extracted = ruleBasedExtractProfile(transcript);
    }

    // Store AI extraction record
    await prisma.aIExtraction.create({
      data: {
        userId: session.userId,
        inputTranscript: transcript,
        extractedData: JSON.stringify(extracted),
        model: 'gemini-2.5-flash-or-fallback',
        purpose: 'ARTISAN_PROFILE',
      },
    });

    return NextResponse.json({ extracted, transcript });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Extract profile error:', error);
    return NextResponse.json({ error: 'Failed to extract profile information' }, { status: 500 });
  }
}
