'use client';

import { useEffect, useState, useRef } from 'react';
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

function truncatePrompt(text: string, wordLimit = 5): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, wordLimit).join(' ') + (words.length > wordLimit ? '…' : '');
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aspectRatio') : null;
    if (saved) setAspectRatio(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = fullscreenIndex !== null ? 'hidden' : '';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [fullscreenIndex]);

  useEffect(() => {
    setCopied(false);
  }, [fullscreenIndex]);

  const showPrev = () => {
    setFullscreenIndex(i => (i === null ? i : (i - 1 + projects.length) % projects.length));
  };
  const showNext = () => {
    setFullscreenIndex(i => (i === null ? i : (i + 1) % projects.length));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    if (startX === null || startY === null) return;
    const endTouch = e.changedTouches[0];
    const diffX = (endTouch?.clientX ?? startX) - startX;
    const diffY = (endTouch?.clientY ?? startY) - startY;
    if (diffY > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      setFullscreenIndex(null);
    } else if (Math.abs(diffX) > 50) {
      diffX > 0 ? showPrev() : showNext();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const selectAspect = (ratio: string) => {
    setAspectRatio(ratio);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aspectRatio', ratio);
    }
    setMenuOpen(false);
  };

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

  // --- PEŁNY EKRAN: NAWIGACJA KL. ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (fullscreenIndex === null) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      } else if (e.key === 'Escape') {
        setFullscreenIndex(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreenIndex, projects.length]);

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
        body: JSON.stringify({ prompt, aspectRatio }),
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

  // --- ZAPIS DO GALERII ---
  const handleDownload = async (url: string) => {
    try {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && navigator.canShare) {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], `kuchnia-${uuidish()}.png`, {
          type: blob.type || 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'kuchnie.ai',
            text: 'Zapisz obraz w galerii',
          });
          return;
        }
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = `kuchnia-${uuidish()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Błąd zapisu obrazka', e);
      alert('Nie udało się zapisać obrazka');
    }
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
    <main className="min-h-screen p-6 pb-24">
      <header className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="kuchnie.ai logo" className="w-8 h-8 md:w-10 md:h-10" />
          <h1 className="text-2xl font-bold">kuchnie.ai</h1>
        </div>
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

      {projects.length === 0 ? (
        <p className="text-gray-500">Na razie pusto – wygeneruj coś!</p>
      ) : (
        <section className="columns-2 md:columns-3 gap-1">
          {projects.map((p, i) => (
            <figure
              key={p.id}
              className="mb-1 break-inside-avoid relative"
            >
              <img
                src={p.imageUrl}
                alt={p.prompt}
                className="w-full h-auto object-cover cursor-pointer"
                onClick={() => setFullscreenIndex(i)}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.src.includes('download=1')) {
                    el.src = `${el.src}${el.src.includes('?') ? '&' : '?'}download=1`;
                  }
                }}
              />
            </figure>
          ))}
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="border rounded-full p-3 h-10 w-10 flex items-center justify-center"
              aria-label="Opcje orientacji"
            >
              +
            </button>
            {menuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-32 bg-white border rounded shadow z-50">
                <button
                  onClick={() => selectAspect('3:4')}
                  className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${aspectRatio === '3:4' ? 'font-bold' : ''}`}
                >
                  Pion 4:3
                </button>
                <button
                  onClick={() => selectAspect('1:1')}
                  className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${aspectRatio === '1:1' ? 'font-bold' : ''}`}
                >
                  Kwadrat
                </button>
                <button
                  onClick={() => selectAspect('4:3')}
                  className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${aspectRatio === '4:3' ? 'font-bold' : ''}`}
                >
                  Poziom 4:3
                </button>
              </div>
            )}
          </div>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Opisz swoją kuchnię…"
            className="flex-1 border rounded-full px-4 py-2"
          />
          {prompt.trim() !== '' && (
            <button onClick={handleGenerate} disabled={loading} className="border rounded-full px-4 py-2">
              {loading ? 'Generuję...' : 'Generuj'}
            </button>
          )}
        </div>
      </div>

      {fullscreenIndex !== null && projects[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreenIndex(null)}
        >
          <button
            className="absolute left-4 text-white text-3xl p-2"
            onClick={(e) => { e.stopPropagation(); showPrev(); }}
            aria-label="Poprzednie zdjęcie"
          >
            ‹
          </button>
          <img
            src={projects[fullscreenIndex].imageUrl}
            alt="Pełny ekran"
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e); }}
          />
          <div
            className={`absolute bottom-4 left-4 right-40 text-white text-sm bg-black/60 p-2 rounded break-words border cursor-pointer ${copied ? 'border-white' : 'border-transparent'}`}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(projects[fullscreenIndex].prompt);
              setCopied(true);
              setTimeout(() => setCopied(false), 1000);
            }}
          >
            <p>{projects[fullscreenIndex].prompt}</p>
            <p className="mt-2">Copy prompt</p>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(projects[fullscreenIndex].imageUrl); }}
              className="text-white rounded px-3 py-1 text-sm bg-black/60"
              title="Zapisz obraz w galerii"
            >
              Pobierz
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(projects[fullscreenIndex]); setFullscreenIndex(null); }}
              className="text-white rounded px-3 py-1 text-sm bg-black/60"
              title="Usuń projekt"
            >
              Usuń
            </button>
          </div>
          <button
            className="absolute right-4 text-white text-3xl p-2"
            onClick={(e) => { e.stopPropagation(); showNext(); }}
            aria-label="Następne zdjęcie"
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
}
