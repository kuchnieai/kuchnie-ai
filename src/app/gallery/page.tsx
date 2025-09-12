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

export default function Gallery() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Przy pierwszym renderze pobierz dane z localStorage
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

  // Synchronizuj usera w localStorage przy zmianach
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

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
        .eq('user', user.email)
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

  // Zapisuj projekty w localStorage
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten projekt?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('[DB delete error]', error);
      alert('Nie udało się usunąć projektu');
      return;
    }
    setProjects((p) => p.filter((proj) => proj.id !== id));
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

  if (!user) {
    return <main className="p-6">Musisz się zalogować, aby zobaczyć galerię.</main>;
  }

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center gap-2">
        <Link href="/" className="text-lg">
          &larr; Wróć
        </Link>
        <h2 className="text-2xl font-bold">Moja galeria</h2>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <p className="col-span-full text-gray-500">Brak projektów</p>
        )}
        {projects.map((p) => (
          <figure key={p.id} className="border rounded overflow-hidden">
            <img
              src={p.imageUrl}
              alt={p.prompt}
              className="w-full h-48 object-cover"
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
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600 text-xs"
                >
                  Usuń
                </button>
              </div>
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}

