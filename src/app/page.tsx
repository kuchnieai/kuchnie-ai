'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  prompt: string;
  imageUrl: string;     // podpisany URL do wyświetlenia
  storagePath: string;  // ścieżka w Storage (images/<uid>/<file>)
  user: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ---------- SESJA ----------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // helper: dopnij download=1 (iOS Safari czasem wymaga)
  const withDownloadParam = (url: string | undefined) =>
    url ? `${url}${url.includes('?') ? '&' : '?'}download=1` : '';

  // helper: podpisany URL
  const signedUrlFor = async (path: string, seconds = 60 * 60) => {
    const { data, error } = await supabase.storage.from('images').createSignedUrl(path, seconds);
    if (error) throw error;
    return withDownloadParam(data?.signedUrl ?? '');
  };

  // ---------- PO ZALOGOWANIU WCZYTAJ MOJE PROJEKTY ----------
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setProjects([]);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .select('id, prompt, image_url, created_at, user_email')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[projects/select]', error);
        return;
      }

      try {
        const mapped = await Promise.all(
          (data ?? []).map(async (row: any) => {
            const storagePath = row.image_url as string;
            let viewUrl = '';
            try {
              viewUrl = await signedUrlFor(storagePath);
            } catch (e) {
              console.warn('signedUrl error for', storagePath, e);
            }
            return {
              id: row.id as string,
              prompt: row.prompt as string,
              imageUrl: viewUrl,
              storagePath,
              user: row.user_email ?? user.email,
            } as Project;
          })
        );
        setProjects(mapped);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user]);

  // ---------- GENERUJ + ZAPISZ ----------
  const handleGenerate = async () => {
    if (!user) return alert('Zaloguj się!');
    if (!prompt.trim()) return alert('Wpisz opis kuchni');

    setLoading(true);
    try {
      // 1) wygeneruj przez własne API
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        console.error('[API ERROR]', data);
        alert(`Błąd generowania: ${data?.error ?? res.status}\n${data?.details ?? ''}`);
        return;
      }
      const remoteUrl: string | undefined = data?.imageUrl;
      if (!remoteUrl) return alert('API nie zwróciło imageUrl');

      // 2) pobierz obraz przez proxy (iOS/CORS) → fallback direct
      let contentType = 'image/png';
      let arrayBuffer: ArrayBuffer;
      try {
        const proxyResp = await fetch(`/api/fetch-image?url=${encodeURIComponent(remoteUrl)}`, {
          cache: 'no-store',
        });
        if (!proxyResp.ok) throw new Error(`proxy status ${proxyResp.status}`);
        contentType = proxyResp.headers.get('content-type') ?? contentType;
        arrayBuffer = await proxyResp.arrayBuffer();
      } catch {
        const directResp = await fetch(remoteUrl, { cache: 'no-store' });
        if (!directResp.ok) throw new Error(`direct status ${directResp.status}`);
        contentType = directResp.headers.get('content-type') ?? contentType;
        arrayBuffer = await directResp.arrayBuffer();
      }
      const blob = new Blob([arrayBuffer], { type: contentType });

      // 3) rozszerzenie po content-type
      const ext =
        contentType.includes('jpeg') ? 'jpg' :
        contentType.includes('webp') ? 'webp' :
        contentType.includes('png')  ? 'png'  : 'bin';

      // 4) ścieżka w Storage
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      // 5) upload do prywatnego bucketa
      const { error: upErr } = await supabase.storage.from('images').upload(filePath, blob, { contentType });
      if (upErr) throw upErr;

      // 6) insert do DB
      const { error: insErr } = await supabase.from('projects').insert({
        user_id: user.id,
        user_email: user.email,
        prompt,
        image_url: filePath,
      });
      if (insErr) throw insErr;

      // 7) podpisany URL i UI
      const viewUrl = await signedUrlFor(filePath);
      setProjects((p) => [
        {
          id: crypto.randomUUID(),
          prompt,
          imageUrl: viewUrl,
          storagePath: filePath,
          user: user.email,
        },
        ...p,
      ]);
      setPrompt('');
    } catch (e) {
      console.error(e);
      alert(`Wyjątek: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // ---------- USUWANIE (Storage + DB) ----------
  const handleDelete = async (proj: Project) => {
    if (!confirm('Usunąć ten projekt? (plik w Storage i wpis w bazie)')) return;
    try {
      // 1) Storage
      const { error: stErr } = await supabase.storage.from('images').remove([proj.storagePath]);
      if (stErr) throw stErr;

      // 2) DB
      const { error: dbErr } = await supabase.from('projects').delete().eq('id', proj.id);
      if (dbErr) throw dbErr;

      // 3) UI
      setProjects((p) => p.filter((x) => x.id !== proj.id));
    } catch (e) {
      console.error(e);
      alert(`Nie udało się usunąć: ${String(e)}`);
    }
  };

  // ---------- ZWIJANIE/ROZWIJANIE OPISU ----------
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---------- UI ----------
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex gap-3 items-center">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Opisz swoją kuchnię…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="border rounded px-4 py-2 font-medium"
        >
          {loading ? 'Generuję…' : 'Generuj'}
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.length === 0 && (
          <p className="col-span-full text-gray-500">Na razie pusto – wygeneruj coś!</p>
        )}

        {projects.map((p) => {
          const isOpen = expanded.has(p.id);

          // 2-linijkowy clamp z poprawnym typem (Vercel strict)
          const clampStyle: CSSProperties = isOpen
            ? {}
            : {
                display: '-webkit-box' as any,
                WebkitLineClamp: 2 as any,
                WebkitBoxOrient: 'vertical' as any,
                overflow: 'hidden',
              };

          return (
            <figure
              key={p.id}
              className="relative border rounded overflow-hidden shadow-sm bg-white"
            >
              {/* Usuń – w prawym górnym rogu */}
              <button
                onClick={() => handleDelete(p)}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                title="Usuń projekt (plik + wpis)"
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
                    el.src = withDownloadParam(el.src);
                  }
                }}
              />

              <figcaption className="p-3">
                <h3 className="text-lg font-semibold mb-1">{p.prompt.split('\n')[0] || 'Projekt'}</h3>

                <p
                  className="font-medium leading-snug cursor-pointer text-gray-800"
                  style={clampStyle}
                  onClick={() => toggleExpand(p.id)}
                  title={isOpen ? 'Zwiń' : 'Pokaż więcej'}
                >
                  {p.prompt}
                </p>

                <p className="mt-2 text-xs opacity-70">by {p.user}</p>

                {!isOpen && (
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                    title="Pokaż więcej"
                  >
                    …pokaż więcej
                  </button>
                )}
                {isOpen && (
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                    title="Zwiń"
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
