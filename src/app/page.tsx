'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;            // id rekordu w DB
  imageUrl: string;      // podpisany URL do podglądu
  storagePath: string;   // ścieżka w Storage (images/<uid>/<uuid>.ext)
  prompt: string;
  user: string;
};

function uuidish() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // prompty rozwinięte

  // --- SESJA ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // --- WCZYTAJ MOJE PROJEKTY ---
  useEffect(() => {
    const load = async () => {
      if (!user) { setProjects([]); return; }

      const { data, error } = await supabase
        .from('projects')
        .select('id, prompt, image_url, created_at, user_email')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) { console.error('[projects/select]', error); return; }

      const out: Project[] = [];
      for (const row of data ?? []) {
        const filePath = row.image_url as string;

        const { data: signed, error: sErr } =
          await supabase.storage.from('images').createSignedUrl(filePath, 60 * 60);
        if (sErr) { console.error('[signedUrl]', sErr, filePath); continue; }

        const viewUrl = signed?.signedUrl
          ? `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}download=1`
          : '';

        out.push({
          id: row.id as string,
          imageUrl: viewUrl,
          storagePath: filePath,
          prompt: row.prompt as string,
          user: (row as any).user_email ?? user.email,
        });
      }
      setProjects(out);
    };
    load();
  }, [user]);

  // --- GENEROWANIE + ZAPIS ---
  const handleGenerate = async () => {
    if (!user) { alert('Zaloguj się!'); return; }
    if (!prompt.trim()) { alert('Wpisz opis kuchni'); return; }

    setLoading(true);
    try {
      // 1) wygeneruj
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) { console.error('[API ERROR]', data); alert(`Błąd generowania: ${data?.error ?? res.status}`); return; }

      const remoteUrl: string | undefined = data?.imageUrl;
      if (!remoteUrl) { alert('API nie zwróciło imageUrl'); return; }

      // 2) data:URL lub HTTP przez proxy
      let blob: Blob;
      let contentType = 'image/png';

      if (remoteUrl.startsWith('data:')) {
        const m = remoteUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (!m) throw new Error('Invalid data URL from /api/generate');
        contentType = m[1] || 'image/png';
        const b64 = m[2];
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: contentType });
      } else {
        let resp = await fetch(`/api/fetch-image?url=${encodeURIComponent(remoteUrl)}`, { cache: 'no-store' });
        if (!resp.ok) { resp = await fetch(remoteUrl, { cache: 'no-store' }); if (!resp.ok) throw new Error(`Load failed (${resp.status})`); }
        contentType = resp.headers.get('content-type') ?? contentType;
        const buf = await resp.arrayBuffer();
        blob = new Blob([buf], { type: contentType });
      }

      // 3) rozszerzenie
      const ext = contentType.includes('jpeg') ? 'jpg' :
                  contentType.includes('webp') ? 'webp' :
                  contentType.includes('png')  ? 'png'  : 'bin';

      // 4) upload
      const filePath = `${user.id}/${uuidish()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('images').upload(filePath, blob, { contentType });
      if (upErr) throw upErr;

      // 5) insert
      const { data: ins, error: insErr } = await supabase
        .from('projects')
        .insert({ user_id: user.id, user_email: user.email, prompt, image_url: filePath })
        .select('id')
        .single();
      if (insErr) throw insErr;

      // 6) signed URL (iOS-friendly)
      const { data: signed } = await supabase.storage.from('images').createSignedUrl(filePath, 60 * 60);
      const viewUrl = signed?.signedUrl ? `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}download=1` : '';

      // 7) UI
      setProjects(p => [{
        id: ins?.id ?? uuidish(),
        imageUrl: viewUrl,
        storagePath: filePath,
        prompt,
        user: user.email,
      }, ...p]);
      setPrompt('');
    } catch (e) {
      console.error(e);
      alert(`Wyjątek: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // --- USUWANIE (Storage + DB) ---
  const handleDelete = async (proj: Project) => {
    if (!confirm('Usunąć ten projekt?')) return;

    const { error: sErr } = await supabase.storage.from('images').remove([proj.storagePath]);
    if (sErr) { console.error('[storage.remove]', sErr); alert(`Błąd usuwania pliku: ${sErr.message ?? sErr}`); return; }

    const { error: dErr } = await supabase.from('projects').delete().eq('id', proj.id);
    if (dErr) { console.error('[projects/delete]', dErr); alert(`Błąd usuwania rekordu: ${dErr.message ?? dErr}`); return; }

    setProjects(prev => prev.filter(p => p.id !== proj.id));
    setExpanded(prev => { const n = new Set(prev); n.delete(proj.id); return n; });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-4 md:mb-6 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Opisz swoją kuchnię…"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button onClick={handleGenerate} disabled={loading} className="border rounded-lg px-4 py-2 whitespace-nowrap">
          {loading ? 'Generuję…' : 'Generuj'}
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <p className="col-span-full text-gray-500">Na razie pusto – wygeneruj coś!</p>
        )}

        {projects.map((p) => {
          const isOpen = expanded.has(p.id);
          const clampStyle = isOpen ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 2 as unknown as string, // TS hack
            WebkitBoxOrient: 'vertical' as unknown as string,
            overflow: 'hidden',
          };

          return (
            <figure key={p.id} className="relative border rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Delete button – stała pozycja w rogu */}
              <button
                onClick={() => handleDelete(p)}
                title="Usuń projekt"
                className="absolute top-2 right-2 z-10 bg-white/95 hover:bg-white text-red-600 border border-red-500 rounded-md px-2 py-1 text-xs"
              >
                Usuń
              </button>

              <img
                src={p.imageUrl}
                alt={p.prompt}
                className="w-full aspect-[4/3] object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.src.includes('download=1')) {
                    el.src = `${el.src}${el.src.includes('?') ? '&' : '?'}download=1`;
                  }
                }}
              />

              <figcaption className="p-3">
                <p
                  className="font-semibold leading-snug cursor-pointer"
                  style={clampStyle}
                  onClick={() => toggleExpand(p.id)}
                  title={isOpen ? 'Zwiń' : 'Pokaż więcej'}
                >
                  {p.prompt}
                </p>
                <div className="mt-1 text-xs opacity-70">by {p.user}</div>
                {!isOpen && (
                  <button
                    className="mt-1 text-xs underline opacity-70"
                    onClick={() => toggleExpand(p.id)}
                  >
                    Pokaż więcej
                  </button>
                )}
                {isOpen && (
                  <button
                    className="mt-1 text-xs underline opacity-70"
                    onClick={() => toggleExpand(p.id)}
                  >
                    Zwiń
                  </button>
                )}
              </figcaption>
            </figure>
          );
        })}
      </section>
    </main>
  );
}
