'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; imageUrl: string; prompt: string; user: string };

export default function Gallery() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, image_url, prompt, user')
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
        })),
      );
    };
    load();
  }, [user]);

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
            <figcaption className="p-2 text-sm">
              <strong>{p.prompt}</strong>
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}

