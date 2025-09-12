'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  imageUrl: string;
  prompt: string;
  user: string;
  favorite: boolean;
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<Project | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Wczytaj stan z localStorage przy pierwszym renderze
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedProjects = localStorage.getItem('projects');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }
    if (storedProjects) {
      try {
        const parsed = JSON.parse(storedProjects);
        setProjects(
          parsed.map((p: any) => ({
            ...p,
            favorite: p.favorite || false,
          })),
        );
      } catch {}
    }
  }, []);

  // 1) Pobierz usera przy starcie + słuchaj zmian sesji (login/logout)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem('user', JSON.stringify(session.user));
      } else {
        localStorage.removeItem('user');
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Synchronizuj usera w localStorage przy każdej zmianie
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // 2) (opcjonalnie) poproś o nick po zalogowaniu – jeśli go brak
  useEffect(() => {
    if (user && !user.user_metadata?.nick) {
      const nick = window.prompt('Podaj swój nick:')?.trim();
      if (nick) {
        supabase.auth
          .updateUser({ data: { nick } })
          .then(({ data, error }) => {
            if (error) {
              alert('Nie udało się zapisać nicku');
              return;
            }
            setUser(data.user);
          });
      }
    }
  }, [user]);

  const handleChangeNick = async () => {
    const nick = window.prompt(
      'Podaj nowy nick:',
      user?.user_metadata?.nick || '',
    )?.trim();
    if (!nick) return;
    const { data, error } = await supabase.auth.updateUser({ data: { nick } });
    if (error) {
      alert('Nie udało się zapisać nicku');
      return;
    }
    setUser(data.user);
  };

  const toggleFavorite = async (id: string, fav: boolean) => {
    const { error } = await supabase
      .from('projects')
      .update({ favorite: !fav })
      .eq('id', id);
    if (error) {
      console.error('[DB favorite error]', error);
      return;
    }
    setProjects((ps) =>
      ps.map((p) => (p.id === id ? { ...p, favorite: !fav } : p)),
    );
  };

  // 3) Wczytaj projekty zalogowanego usera
  useEffect(() => {
    if (!user) {
      setProjects([]);
      localStorage.removeItem('projects');
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, image_url, prompt, user, favorite')
        .eq('user', user.email) // filtrujemy po mailu
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DB fetch error]', error);
        return;
      }

      setProjects(
        (data || []).map((row: any) => ({
          id: row.id,
          imageUrl: row.image_url,
          prompt: row.prompt,
          user: row.user,
          favorite: row.favorite || false,
        })),
      );
    };
    load();
  }, [user]);

  // Zapisuj projekty do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

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
        const id = crypto.randomUUID();
        const base64 = data.imageUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const filePath = `${user.id}/${id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, bytes, { contentType: 'image/png' });
        if (uploadError) {
          console.error('[Storage upload error]', uploadError);
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from('images').getPublicUrl(filePath);

        const newProject: Project = {
          id,
          imageUrl: publicUrl,
          prompt,
          user: user.email,
          favorite: false,
        };
        setProjects((p) => [newProject, ...p]);

        const { error } = await supabase.from('projects').insert({
          id: newProject.id,
          image_url: newProject.imageUrl,
          prompt: newProject.prompt,
          user: newProject.user,
          favorite: newProject.favorite,
        });
        if (error) {
          console.error('[DB insert error]', error);
        }

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
      options: { redirectTo: `${window.location.origin}/` },
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
    setProjects([]);
    localStorage.removeItem('user');
    localStorage.removeItem('projects');
  };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">kuchnie.ai</h1>
        </div>

        <div className="flex items-center gap-2 relative">
          {user ? (
            <>
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="mr-2"
              >
                {user.user_metadata?.nick || user.email}
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleChangeNick();
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Zmień nick
                  </button>
                  <Link
                    href="/gallery"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    Moja galeria
                  </Link>
                </div>
              )}
              <button onClick={signOut} className="border rounded px-3 py-1">Wyloguj</button>
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
              className="w-full h-48 object-cover cursor-pointer"
              onClick={() => setSelectedImage(p)}
            />
            <figcaption className="p-2 text-sm flex items-center justify-between">
              <div>
                <strong>{p.prompt}</strong>
                <p className="text-xs opacity-70">by {p.user}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleFavorite(p.id, p.favorite)}>
                  {p.favorite ? '❤️' : '🤍'}
                </button>
                <a href={p.imageUrl} download>
                  ⬇️
                </a>
              </div>
            </figcaption>
          </figure>
        ))}
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.imageUrl}
            alt={selectedImage.prompt}
            className="max-w-full max-h-full"
          />
        </div>
      )}
    </main>
  );
}
