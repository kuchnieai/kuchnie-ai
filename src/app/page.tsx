'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ensureProfile, editProfile, type Profile } from '@/lib/profile';

type Project = {
  id: string;            // id rekordu w DB
  imageUrl: string;      // podpisany URL do <img> (albo ?download=1)
  storagePath: string;   // ścieżka w Storage (np. "<uid>/<uuid>.png")
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // --- SESJA ---
  useEffect(() => {
    const handleUser = async (u: any) => {
      setUser(u);
      if (u) {
        const p = await ensureProfile(u.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    };

    supabase.auth.getUser().then(({ data }) => handleUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // --- PO ZALOGOWANIU: WCZYTAJ MOJE PROJEKTY ---
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
    console.log('[UI] Generuj klik');
    if (!user) { alert('Zaloguj się!'); return; }
    if (!prompt.trim()) { alert('Wpisz opis kuchni'); return; }

    setLoading(true);
    try {
      // 1) Wywołaj API generowania
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
      if (!remoteUrl) { alert('API nie zwróciło imageUrl'); return; }

      // 2) data:URL (base64) albo https (proxy)
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
        let resp = await fetch(
          `/api/fetch-image?url=${encodeURIComponent(remoteUrl)}`,
          { cache: 'no-store' }
        );
        if (!resp.ok) {
          console.warn('[proxy failed]', resp.status, '— trying direct fetch');
          resp = await fetch(remoteUrl, { cache: 'no-store' });
          if (!resp.ok) throw new Error(`Load failed (${resp.status})`);
        }
        contentType = resp.headers.get('content-type') ?? contentType;
        const buf = await resp.arrayBuffer();
        blob = new Blob([buf], { type: contentType });
      }

      // 3) Rozszerzenie
      const ext =
        contentType.includes('jpeg') ? 'jpg' :
        contentType.includes('webp') ? 'webp' :
        contentType.includes('png')  ? 'png'  : 'bin';

      // 4) Ścieżka: images/<UID>/<losowe>.<ext>
      const filePath = `${user.id}/${uuidish()}.${ext}`;

      // 5) Upload
      const { error: upErr } = await supabase
        .storage
        .from('images')
        .upload(filePath, blob, { contentType });
      if (upErr) throw upErr;

      // 6) INSERT + zwróć id
      const { data: ins, error: insErr } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          user_email: user.email,
          prompt,
          image_url: filePath,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;

      // 7) Podpisany URL (iOS-friendly)
      const { data: signed } = await supabase
        .storage
        .from('images')
        .createSignedUrl(filePath, 60 * 60);

      const viewUrl = signed?.signedUrl
        ? `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}download=1`
        : '';

      // 8) UI
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

  // --- USUWANIE PROJEKTU (plik + rekord) ---
  const handleDelete = async (proj: Project) => {
    if (!confirm('Usunąć ten projekt?')) return;

    // 1) usuń plik ze Storage
    const { error: sErr } = await supabase.storage.from('images').remove([proj.storagePath]);
    if (sErr) {
      console.error('[storage.remove]', sErr);
      alert(`Błąd usuwania pliku: ${sErr.message ?? sErr}`);
      return;
    }

    // 2) usuń rekord z bazy
    const { error: dErr } = await supabase.from('projects').delete().eq('id', proj.id);
    if (dErr) {
      console.error('[projects/delete]', dErr);
      alert(`Błąd usuwania rekordu: ${dErr.message ?? dErr}`);
      return;
    }

    // 3) odśwież UI
    setProjects(prev => prev.filter(p => p.id !== proj.id));
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
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">kuchnie.ai</h1>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={async () => {
                  const p = await editProfile(user.id, profile);
                  setProfile(p);
                }}
                className="mr-2 underline"
              >
                {profile?.nick}
              </button>
              <button onClick={signOut} className="border rounded px-3 py-1">Wyloguj</button>
            </>
          ) : (
            <>
              <button onClick={signInWithGoogle} className="border rounded px-3 py-1">Zaloguj przez Google</button>
              <button onClick={signInWithEmail} className="border rounded px-3 py-1 opacity-70">mailem (fallback)</button>
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
              className="w-full h-48 object-cover cursor-pointer"
              onClick={() => setFullscreenUrl(p.imageUrl)}
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes('download=1')) {
                  el.src = `${el.src}${el.src.includes('?') ? '&' : '?'}download=1`;
                }
              }}
            />
            <figcaption className="p-2 text-sm flex items-center justify-between gap-2">
              <div>
                <strong className="block">{p.prompt}</strong>
                <p className="text-xs opacity-70">by {p.user}</p>
              </div>
              <button
                onClick={() => handleDelete(p)}
                className="text-red-600 border border-red-500 rounded px-2 py-1 text-xs"
                title="Usuń projekt"
              >
                Usuń
              </button>
            </figcaption>
          </figure>
        ))}
      </section>
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setFullscreenUrl(null)}
        >
          <img
            src={fullscreenUrl}
            alt="Pełny ekran"
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
