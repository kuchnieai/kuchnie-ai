'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthButtons() {
  const [user, setUser] = useState<null | { email?: string }>(null);

  useEffect(() => {
    // pobierz użytkownika przy starcie
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    // słuchaj zmian sesji (login/logout)
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
      options: {
        // po logowaniu wróć na stronę główną (możesz zmienić)
        redirectTo: `${window.location.origin}/`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // odśwież UI po wylogowaniu (opcjonalnie)
    window.location.reload();
  };

  if (user) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>Zalogowany: {user.email}</span>
        <button onClick={signOut}>Wyloguj</button>
      </div>
    );
  }

  return <button onClick={signInWithGoogle}>Zaloguj przez Google</button>;
}
