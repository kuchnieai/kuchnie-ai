// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

// pomocniczo: zlepienie text parts z odpowiedzi Gemini
function extractTextFromCandidates(resp: any): string {
  try {
    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p.text).filter(Boolean).join(' ').trim();
  } catch { return ''; }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, orientation } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Brak promptu' }, { status: 400 });
    }

    let aspectRatio: string | undefined;
    switch (orientation) {
      case 'vertical':
        aspectRatio = '3:4';
        break;
      case 'horizontal':
        aspectRatio = '16:9';
        break;
      case 'square':
      default:
        aspectRatio = '1:1';
        break;
    }

    // 1) Opcjonalne doprecyzowanie promptu w Gemini 2.5 Flash (Nano Banana)
    const geminiUrl = process.env.GEMINI_API_URL; // np. v1beta/models/gemini-2.5-flash:generateContent
    const geminiKey = process.env.GEMINI_API_KEY!;
    let finalPrompt = prompt;

    if (geminiUrl && geminiKey) {
      const refine = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text:
                `Przerób opis kuchni na maksymalnie konkretny tekst promptu pod generowanie obrazu: ${prompt}.
                 Uwzględnij styl (np. nowoczesna/industrial/boho), materiały frontów i blatów, kolory,
                 układ (L/U/wyspa), oświetlenie, porę dnia, kąt ujęcia.`
            }]
          }]
        })
      });

      if (!refine.ok) {
        console.warn('Gemini refine failed', await refine.text());
      } else {
        const refineJson = await refine.json();
        const refined = extractTextFromCandidates(refineJson);
        if (refined) finalPrompt = refined;
      }
    }

    // 2) Generowanie obrazu w Imagen 4 (REST :predict)
    const imagenKey = process.env.GEMINI_API_KEY!;
    const imagenModel =
      process.env.IMAGEN_MODEL /* np. 'imagen-4.0-ultra-generate-001' */ ||
      'imagen-4.0-generate-001';

    const imagenUrl =
      process.env.IMAGEN_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${imagenModel}:predict`;

    const params: any = {
      // liczba obrazów (1–4), ratio/rozmiar możesz później podać z UI
      sampleCount: 1,
    };
    if (aspectRatio) params.aspectRatio = aspectRatio;

    const gen = await fetch(imagenUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': imagenKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // REST dla Imagen używa 'instances' + 'parameters'
        instances: [{ prompt: finalPrompt }],
        parameters: params,
      }),
    });

    if (!gen.ok) {
      const msg = await gen.text();
      console.error('Imagen error', msg);
      return NextResponse.json({ error: 'gen_failed', details: msg }, { status: 500 });
    }

    const data = await gen.json();
    const first = data?.predictions?.[0] || {};
    const b64 =
      first.bytesBase64Encoded ||
      first.image?.imageBytes || ''; // trochę defensywnie

    const mime = first.mimeType || 'image/png';
    if (!b64) {
      return NextResponse.json({ error: 'empty_image' }, { status: 500 });
    }

    // Front u Ciebie oczekuje imageUrl – damy data URL, więc <img src=...> zadziała od strzała.
    const imageUrl = `data:${mime};base64,${b64}`;

    return NextResponse.json({ imageUrl, prompt: finalPrompt });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
