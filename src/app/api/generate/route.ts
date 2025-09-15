// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const maxDuration = 120;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const storageBucket = process.env.SUPABASE_IMAGES_BUCKET || 'images';

// pomocniczo: zlepienie text parts z odpowiedzi Gemini
function extractTextFromCandidates(resp: any): string {
  try {
    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p.text).filter(Boolean).join(' ').trim();
  } catch { return ''; }
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt = '',
      aspectRatio,
      options,
      accessToken,
    } = await req.json();
    const optsArray = Array.isArray(options) ? options : [];
    if (!prompt && optsArray.length === 0) {
      return NextResponse.json({ error: 'Brak promptu' }, { status: 400 });
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'missing_access_token' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase service credentials are not configured');
      return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      console.error('Auth error', userErr);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const user = userData.user;
    const userPrompt = prompt;

    // 1) Opcjonalne doprecyzowanie promptu w Gemini 2.5 Flash (Nano Banana)
    const geminiUrl = process.env.GEMINI_API_URL; // np. v1beta/models/gemini-2.5-flash:generateContent
    const geminiKey = process.env.GEMINI_API_KEY!;
    let finalPrompt = prompt;
    if (optsArray.length > 0) {
      finalPrompt = [prompt, optsArray.join(', ')].filter(Boolean).join(', ');
    }

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
                `Przerób opis kuchni na maksymalnie konkretny tekst promptu pod generowanie obrazu: ${finalPrompt}.
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

    const params: Record<string, any> = { sampleCount: 1 };
    if (aspectRatio && typeof aspectRatio === 'string') {
      params.aspectRatio = aspectRatio;
    }

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

    const buffer = Buffer.from(b64, 'base64');

    const ext =
      mime.includes('jpeg') ? 'jpg' :
      mime.includes('webp') ? 'webp' :
      mime.includes('png')  ? 'png'  : 'bin';

    const storagePath = `${user.id}/${randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase
      .storage
      .from(storageBucket)
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadErr) {
      console.error('Upload failed', uploadErr);
      return NextResponse.json(
        { error: 'upload_failed', details: uploadErr.message ?? String(uploadErr) },
        { status: 500 },
      );
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        user_email: user.email,
        prompt: userPrompt,
        image_url: storagePath,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Insert failed', insertErr);
      return NextResponse.json(
        { error: 'db_insert_failed', details: insertErr.message ?? String(insertErr) },
        { status: 500 },
      );
    }

    const { data: signed, error: signedErr } = await supabase
      .storage
      .from(storageBucket)
      .createSignedUrl(storagePath, 60 * 60);

    if (signedErr) {
      console.error('Signed URL failed', signedErr);
      return NextResponse.json(
        { error: 'signed_url_failed', details: signedErr.message ?? String(signedErr) },
        { status: 500 },
      );
    }

    const signedUrl = signed?.signedUrl ?? '';
    const imageUrlWithDownload = signedUrl
      ? `${signedUrl}${signedUrl.includes('?') ? '&' : '?'}download=1`
      : '';

    const project = {
      id: inserted?.id ?? randomUUID(),
      imageUrl: imageUrlWithDownload,
      storagePath,
      prompt: userPrompt,
      user: user.email ?? '',
    };

    return NextResponse.json({
      project,
      prompt: finalPrompt,
      imageUrl: project.imageUrl,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
