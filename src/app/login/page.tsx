'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nick, setNick] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nick, postal_code: postalCode } },
    });
    if (error) {
      alert(error.message);
    } else {
      router.push('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-xl">Logowanie / Rejestracja</h2>
      <form className="flex flex-col gap-2 max-w-xs">
        <input
          className="border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2"
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Kod pocztowy"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button onClick={handleLogin} className="border rounded px-3 py-1">
            Zaloguj
          </button>
          <button onClick={handleRegister} className="border rounded px-3 py-1">
            Zarejestruj
          </button>
        </div>
      </form>
    </div>
  );
}
