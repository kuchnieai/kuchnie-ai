'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; imageUrl: string; prompt: string; user: string };

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // pobierz usera przy starcie + słuchaj zmian sesji (login/logout)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleGenerate = async () => {
    console.log('[UI] Generuj klik');
    if (!user) { alert('Zaloguj się!'); return; }
    if (!prompt.trim()) { alert('Wpisz opis kuchni'); return; }

    setLoading(true);
    try {
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

      if (data?.imageUrl) {
        setProjects(p => [
          { id: crypto.randomUUID(), imageUrl: data.imageUrl, prompt, user: user.email },
          ...p,
        ]);
        setPrompt('');
      } else {
        console.log('[API OK, brak imageUrl] data=', data);
        alert('API nie zwróciło imageUrl (sprawdź konsolę).');
      }
    } catch (e) {
      console.error(e);
      alert(`Wyjątek: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOWANIE ---

  // 1) Google OAuth (główny scenariusz)
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // po logowaniu wróć na stronę główną (możesz zmienić)
        redirectTo: `${window.location.origin}/`,
      },
    });
  };

  // 2) Fallback: magic link mailem (opcjonalnie)
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
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="kuchnie.ai logo" width={32} height={32} />
          <h1 className="text-2xl font-bold">kuchnie.ai</h1>
        </div>

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
