'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; imageUrl: string; prompt: string; user: string };

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 1) Pobierz usera przy starcie + słuchaj zmian sesji (login/logout)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Generowanie → upload do Storage → zapis do DB → URL do podglądu (z fallbackiem)
  const handleGenerate = async () => {
    console.log('[UI] Generuj klik');
    if (!user) { alert('Zaloguj się!'); return; }
    if (!prompt.trim()) { alert('Wpisz opis kuchni'); return; }

    setLoading(true);
    try {
      // 2.1) Call Twojego API
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

      // Oczekujemy zewnętrznego URL obrazka
      const remoteUrl: string | undefined = data?.imageUrl;
      if (!remoteUrl) {
        console.log('[API OK, brak imageUrl] data=', data);
        alert('API nie zwróciło imageUrl (sprawdź konsolę).');
        return;
      }

      // 2.2) Pobierz obrazek jako blob → ArrayBuffer
      const imgResp = await fetch(remoteUrl);
      if (!imgResp.ok) throw new Error(`Pobieranie obrazu nieudane: ${imgResp.status}`);
      const blob = await imgResp.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // 2.3) Ścieżka w Storage: images/<UID>/<losowe>.png
      const filePath = `${user.id}/${crypto.randomUUID()}.png`;

      // 2.4) Upload do prywatnego bucketa "images"
      const { error: upErr } = await supabase
        .storage
        .from('images')
        .upload(filePath, arrayBuffer, { contentType: 'image/png' });

      if (upErr) {
        console.error('[storage.upload] error', upErr);
        throw upErr;
      }

      // 2.5) Dodaj rekord w tabeli projects
      const { error: insErr } = await supabase.from('projects').insert({
        user_id: user.id,
        user_email: user.email,
        prompt,
        image_url: filePath, // zapisujemy ŚCIEŻKĘ w storage, nie pełny URL
      });
      if (insErr) {
        console.error('[db.insert projects] error', insErr);
        throw insErr;
      }

      // 2.6) URL do podglądu:
      //    Najpierw próbujemy createSignedUrl (1h). Jeśli iOS/Safari zwróci "Load failed",
      //    robimy fallback: pobieramy plik i tworzymy lokalny ObjectURL.
      let viewUrl = '';
      try {
        const { data: signed, error: signErr } = await supabase
          .storage
          .from('images')
          .createSignedUrl(filePath, 60 * 60); // ważny 1h

        if (signErr || !signed?.signedUrl) {
          console.warn('[storage.createSignedUrl] failed, fallback to download:', signErr);
          throw signErr ?? new Error('createSignedUrl zwrócił pusty wynik');
        }

        viewUrl = signed.signedUrl;
      } catch (signErr) {
        // Fallback – ściągamy plik i tworzymy ObjectURL (działa niezależnie od Safari focha)
        const { data: dl, error: dlErr } = await supabase.storage.from('images').download(filePath);
        if (dlErr) {
          console.error('[storage.download] error', dlErr);
          throw dlErr;
        }
        viewUrl = URL.createObjectURL(dl); // lokalny URL do <img>
      }

      // 2.7) Aktualizuj UI natychmiast
      setProjects(p => [{
        id: crypto.randomUUID(),
        imageUrl: viewUrl,
        prompt,
        user: user.email,
      }, ...p]);

      setPrompt('');
    } catch (e: any) {
      console.error('[handleGenerate] exception', e);
      alert(`Wyjątek: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOWANIE ---

  // Google OAuth (główny scenariusz)
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  };

  // Fallback: magic link mailem (opcjonalnie)
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
            <img src={p.imageUrl} alt={p.prompt} className="w-full h-48 object-cover" />
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
