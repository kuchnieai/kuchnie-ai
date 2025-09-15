// src/app/api/edit/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const prompt = String(form.get('prompt') || '');
    const file = form.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/png';

    const geminiUrl = process.env.GEMINI_API_URL;
    const geminiKey = process.env.GEMINI_API_KEY!;
    if (!geminiUrl || !geminiKey) {
      return NextResponse.json({ error: 'Missing Gemini config' }, { status: 500 });
    }

    const body = {
      contents: [
        {
          parts: [
            { text: `Change kitchen color to ${prompt}` },
            { inlineData: { mimeType, data: b64 } }
          ]
        }
      ]
    };

    const r = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const msg = await r.text();
      console.error('Gemini edit error', msg);
      return NextResponse.json({ error: 'edit_failed', details: msg }, { status: 500 });
    }

    const json = await r.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p: any) => p.inlineData?.data);
    const outB64 = imgPart?.inlineData?.data;
    const outMime = imgPart?.inlineData?.mimeType || mimeType;
    if (!outB64) {
      return NextResponse.json({ error: 'empty_image' }, { status: 500 });
    }
    const imageUrl = `data:${outMime};base64,${outB64}`;
    return NextResponse.json({ imageUrl });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
