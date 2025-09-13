'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ensureProfile, type Profile } from '@/lib/profile';

export default function AuthButtons() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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

    // pobierz użytkownika przy starcie
    supabase.auth.getUser().then(({ data }) => handleUser(data.user ?? null));

    // słuchaj zmian sesji (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null);
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
        <span>Zalogowany: {profile?.nick}</span>
        <button onClick={signOut}>Wyloguj</button>
      </div>
    );
  }

  return <button onClick={signInWithGoogle}>Zaloguj przez Google</button>;
}
