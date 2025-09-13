'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthButtons() {
  const [user, setUser] = useState<null | { email?: string }>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span>Zalogowany: {user.email}</span>
        <button onClick={signOut} className="border rounded px-3 py-1">Wyloguj</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border rounded px-3 py-1"
      >
        Zaloguj
      </button>
      {open && (
        <div className="absolute right-0 mt-1 flex flex-col rounded border bg-white text-black shadow">
          <Link href="/login" className="px-4 py-2 hover:bg-gray-100">
            mail
          </Link>
          <button
            onClick={signInWithGoogle}
            className="px-4 py-2 text-left hover:bg-gray-100"
          >
            konto google
          </button>
          <Link href="/add-company" className="px-4 py-2 hover:bg-gray-100">
            dodaj firmę
          </Link>
        </div>
      )}
    </div>
  );
}
