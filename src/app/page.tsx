'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; imageUrl: string; prompt: string; user: string };

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // --- SESJA ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // --- PO ZALOGOWANIU WCZYTAJ MOJE PROJEKTY ---
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

      const out: Project[] = [];
      for (const row of data ?? []) {
        const filePath = row.image_url as string;
        const { data: signed, error: sErr } = await supabase
          .storage
          .from('images')
          .createSignedUrl(filePath, 60 * 60);

        if (sErr) {
          console.error('[signedUrl]', sErr, filePath);
          continue;
        }

        // iOS-friendly: w razie czego dopniemy download=1
        const viewUrl = signed?.signedUrl
          ? `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}download=1`
          : '';

        out.push({
          id: row.id as string,
          imageUrl: viewUrl,
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
    console.log('[UI] Generuj klik');
    if (!user) {
      alert('Zaloguj się!');
      return;
    }
    if (!prompt.trim()) {
      alert('Wpisz opis kuchni');
      return;
    }

    setLoading(true);
    try {
      // 1) Wywołaj API generowania (jak dotąd)
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
      if (!remoteUrl) {
        alert('API nie zwróciło imageUrl');
        return;
      }

      // 2) Pobierz obraz przez NASZE proxy (fix iOS/CORS).
      //    Jeżeli iOS nadal rzuci TypeError: Load failed – spróbujemy fallback bezpośredni.
      let contentType = 'image/png';
      let arrayBuffer: ArrayBuffer;

      try {
        const proxyResp = await fetch(
          `/api/fetch-image?url=${encodeURIComponent(remoteUrl)}`,
          { cache: 'no-store' }
        );
        if (!proxyResp.ok) throw new Error(`proxy status ${proxyResp.status}`);
        contentType = proxyResp.headers.get('content-type') ?? contentType;
        arrayBuffer = await proxyResp.arrayBuffer();
      } catch (_proxyErr) {
        // Fallback (gdyby proxy nie pykło)
        const directResp = await fetch(remoteUrl, { cache: 'no-store' });
        if (!directResp.ok) throw new Error(`direct status ${directResp.status}`);
        contentType = directResp.headers.get('content-type') ?? contentType;
        arrayBuffer = await directResp.arrayBuffer();
      }

      const blob = new Blob([arrayBuffer], { type: contentType });

      // 3) Rozszerzenie na podstawie content-type
      const ext =
        contentType.includes('jpeg') ? 'jpg' :
        contentType.includes('webp') ? 'webp' :
        contentType.includes('png')  ? 'png'  : 'bin';

      // 4) Ścieżka: images/<UID>/<losowe>.<ext>
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      // 5) Upload do prywatnego bucketa
      const { error: upErr } = await supabase
        .storage
        .from('images')
        .upload(filePath, blob, { contentType });
      if (upErr) throw upErr;

      // 6) Wpis do DB
      const { error: insErr } = await supabase.from('projects').insert({
        user_id: user.id,
        user_email: user.email,
        prompt,
        image_url: filePath,
      });
      if (insErr) throw insErr;

      // 7) Podpisany URL (na podgląd) – z dopinką download=1 (iOS)
      const { data: signed } = await supabase
        .storage
        .from('images')
        .createSignedUrl(filePath, 60 * 60);

      const viewUrl = signed?.signedUrl
        ? `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}download=1`
        : '';

      // 8) UI
      setProjects(p => [{
        id: crypto.randomUUID(),
        imageUrl: viewUrl,
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

  // --- LOGOWANIE ---
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const signInWithEmail = async () => {
    const email = window.prompt('Podaj maila (Supabase magic link):') || '';
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    alert(error ? 'Błąd logowania' : 'Sprawdź maila i kliknij link.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">kuchnie.ai</h1>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="mr-2">{user.email}</span>
              <button onClick={signOut} className="border rounded px-3 py-1">
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <button onClick={signInWithGoogle} className="border rounded px-3 py-1">
                Zaloguj przez Google
              </button>
              <button onClick={signInWithEmail} className="border rounded px-3 py-1 opacity-70">
                mailem (fallback)
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mb-4 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Opisz swoją kuchnię…"
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={handleGenerate} disabled={loading} className="border rounded px-3 py-2">
          {loading ? 'Generuję...' : 'Generuj'}
        </button>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <p className="col-span-full text-gray-500">Na razie pusto – wygeneruj coś!</p>
        )}
        {projects.map((p) => (
          <figure key={p.id} className="border rounded overflow-hidden">
            <img
              src={p.imageUrl}
              alt={p.prompt}
              className="w-full h-48 object-cover"
              onError={(e) => {
                // awaryjnie dopnij download=1, jeśli jeszcze go nie było
                const el = e.currentTarget;
                if (!el.src.includes('download=1')) {
                  el.src = `${el.src}${el.src.includes('?') ? '&' : '?'}download=1`;
                }
              }}
            />
            <figcaption className="p-2 text-sm">
              <strong>{p.prompt}</strong>
              <p className="text-xs opacity-70">by {p.user}</p>
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
