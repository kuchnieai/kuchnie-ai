// src/app/api/fetch-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    // prosta walidacja, żeby nie proxy'ować byle czego
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) {
        return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Bad URL' }, { status: 400 });
    }

    // pobieramy obrazek na serwerze (tu CORS nas nie dotyczy)
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ error: 'Download failed' }, { status: 502 });
    }

    const contentType = r.headers.get('content-type') ?? 'application/octet-stream';
    const buf = await r.arrayBuffer();

    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        // dla świętego spokoju
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
