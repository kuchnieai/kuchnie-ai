'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ensureProfile } from '@/lib/profile';

type Project = {
  id: string;            // id rekordu w DB
  imageUrl: string;      // podpisany URL do <img> (albo ?download=1)
  storagePath: string;   // ścieżka w Storage (np. "<uid>/<uuid>.png")
  prompt: string;
  user: string;
};

type GenerateResponse = {
  project?: Project;
  prompt?: string;
  imageUrl?: string;
  error?: string;
  details?: string;
};

const LOADING_KEY = 'isGenerating';
const EVENT_GENERATION_FINISHED = 'generation-finished';
const PROMPT_PLACEHOLDER = 'Opisz kuchnię';

type FeatureOption = {
  label: string;
  promptText: string;
};

type FeatureCategory = {
  name: string;
  options: FeatureOption[];
};

const STYLE_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'Nowoczesna', promptText: 'Kuchnia nowoczesna' },
  { label: 'Klasyczna', promptText: 'Kuchnia klasyczna' },
  { label: 'Skandynawska', promptText: 'Kuchnia w stylu skandynawskim' },
  { label: 'Loft / Industrial', promptText: 'Kuchnia w stylu loft / industrialnym' },
  { label: 'Rustykalna', promptText: 'Kuchnia rustykalna' },
  { label: 'Minimalistyczna', promptText: 'Kuchnia minimalistyczna' },
  { label: 'Glamour', promptText: 'Kuchnia w stylu glamour' },
  { label: 'Retro', promptText: 'Kuchnia retro' },
  { label: 'Boho', promptText: 'Kuchnia boho' },
  { label: 'Japandi', promptText: 'Kuchnia w stylu japandi' },
];

const LAYOUT_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'I', promptText: 'Kuchnia na jednej ścianie' },
  { label: 'L', promptText: 'Kuchnia w literę L' },
  { label: 'U', promptText: 'Kuchnia w literę U' },
  { label: 'I I', promptText: 'Kuchnia na dwóch równoległych ścianach nie połączonych ze sobą meblami' },
  { label: 'Wyspa', promptText: 'Kuchnia z wyspą' },
  {
    label: 'Barek',
    promptText:
      'Kuchnia z podwyższonym wąski blatem jako barkiem pod hokery dostawiona do blatu roboczego',
  },
];

const APPLIANCE_FEATURE_OPTIONS: FeatureOption[] = [
  {
    label: 'Lod zab.',
    promptText:
      'Kuchnia z jedną lodówką w zabudowie dwoje drzwi na dole front do wysokości blatu drugi front jak pasuje',
  },
  { label: 'Lod. woln.', promptText: 'Kuchnia z lodówką pojedynczą szerokości 60cm wysoką' },
  { label: 'Lod. side', promptText: 'Kuchnia z lodówką side by side dwoje drzwi szeroka' },
  {
    label: 'Piek pod pł.',
    promptText:
      'Kuchnia z piekarnikiem pod płytą grzewczą 60cm nad okap wolnowiszący lub w zabudowie',
  },
  {
    label: 'Piek w słup.',
    promptText:
      'Kuchnia z piekarnikiem w słupku zazwyczaj razem z mikrofalą też w zabudowie',
  },
  {
    label: 'Zlew okno',
    promptText:
      'Kuchnia ze zlewozmywakiem pod oknem najczęściej półtorakomory z małym ociekaczem w kuchni tylko jeden zlew',
  },
];

const SIZE_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'XS', promptText: 'Mała kuchnia ciasna w bloku' },
  { label: 'S', promptText: 'Niezaduża kuchnia w mieszkaniu' },
  { label: 'Medium', promptText: 'Średnia kuchnia do mieszkania' },
  { label: 'Large', promptText: 'Kuchnia duża do domu' },
  { label: 'XL', promptText: 'Bardzo duża kuchnia najczęściej z wyspą do domu' },
];

const FEATURE_CATEGORIES: FeatureCategory[] = [
  { name: 'Styl kuchni', options: STYLE_FEATURE_OPTIONS },
  { name: 'Układ kuchni', options: LAYOUT_FEATURE_OPTIONS },
  { name: 'AGD', options: APPLIANCE_FEATURE_OPTIONS },
  { name: 'Rozmiar', options: SIZE_FEATURE_OPTIONS },
];

const FEATURE_OPTIONS: FeatureOption[] = [
  ...STYLE_FEATURE_OPTIONS,
  ...LAYOUT_FEATURE_OPTIONS,
  ...APPLIANCE_FEATURE_OPTIONS,
  ...SIZE_FEATURE_OPTIONS,
];

const optionPromptByLabel = (label: string) =>
  FEATURE_OPTIONS.find((opt) => opt.label === label)?.promptText;

const isOptionPromptText = (text: string) =>
  FEATURE_OPTIONS.some((opt) => opt.promptText === text);

const extractOptionLabelsFromPrompt = (value: string) => {
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  return FEATURE_OPTIONS.filter((opt) => parts.includes(opt.promptText)).map((opt) => opt.label);
};

const mergePromptWithSelectedOptions = (currentPrompt: string, selectedLabels: string[]) => {
  const parts = currentPrompt.split(',').map((p) => p.trim()).filter(Boolean);
  const baseParts = parts.filter((part) => !isOptionPromptText(part));
  const optionParts = selectedLabels
    .map((label) => optionPromptByLabel(label))
    .filter((part): part is string => Boolean(part));
  return [...baseParts, ...optionParts].join(', ');
};

function uuidish() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const featureCategories = FEATURE_CATEGORIES;
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>([]);

  const applyOptionsToPrompt = (selected: string[]) => {
    setPrompt((prev) => {
      const merged = mergePromptWithSelectedOptions(prev, selected);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('promptDraft', merged);
      }
      return merged;
    });
  };

  const syncOptionsFromPrompt = (value: string) => {
    const matched = extractOptionLabelsFromPrompt(value);
    setOptions(matched);
  };

  const toggleOption = (opt: string) => {
    setOptions((prev) => {
      const next = prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt];
      applyOptionsToPrompt(next);
      return next;
    });
  };

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('projectsCache');
      if (cached) {
        try {
          return JSON.parse(cached) as Project[];
        } catch {
          /* ignore broken cache */
        }
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(LOADING_KEY) === '1';
    }
    return false;
  });
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [showPromptOverlay, setShowPromptOverlay] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasPrompt = prompt.trim().length > 0;
  const hasSelectedOptions = options.length > 0;
  const [collapsedWidth, setCollapsedWidth] = useState(0);
  const [pendingFrame, setPendingFrame] = useState<{ prompt: string; aspectRatio: string } | null>(null);

  const promptVisibilityLoaded = useRef(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const handler = () => setLoading(false);
    window.addEventListener(EVENT_GENERATION_FINISHED, handler);
    return () => window.removeEventListener(EVENT_GENERATION_FINISHED, handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!promptVisibilityLoaded.current) {
      const savedVisibility = localStorage.getItem('showPromptOverlay');
      promptVisibilityLoaded.current = true;
      if (savedVisibility !== null) {
        setShowPromptOverlay(savedVisibility === 'true');
        return;
      }
    }
    localStorage.setItem('showPromptOverlay', showPromptOverlay ? 'true' : 'false');
  }, [showPromptOverlay]);

  // Przywróć wersję roboczą opisu kuchni po powrocie na stronę
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = sessionStorage.getItem('promptDraft');
      if (savedPrompt) {
        setPrompt(savedPrompt);
        syncOptionsFromPrompt(savedPrompt);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- textarea autogrow ---
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * 4;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    const desiredHeight = el.value ? scrollHeight : lineHeight;
    const newHeight = Math.min(desiredHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.value && scrollHeight > maxHeight ? 'auto' : 'hidden';
  };
  useEffect(() => { autoResize(); }, [prompt]);
  useEffect(() => { autoResize(); }, []); // na wszelki wypadek po montażu

  const applyPromptToEditor = (text: string) => {
    navigator.clipboard.writeText(text);
    setPrompt(text);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('promptDraft', text);
    }
    syncOptionsFromPrompt(text);
    autoResize();
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `${style.fontSize} ${style.fontFamily}`;
    const textWidth = ctx.measureText(PROMPT_PLACEHOLDER).width;
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    setCollapsedWidth(textWidth + paddingLeft + paddingRight);
  }, []);

  // --- gestures / fullscreen ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragTransition, setDragTransition] = useState('');
  const dragAxis = useRef<'x' | 'y' | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const baseScale = useRef(1);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const basePan = useRef({ x: 0, y: 0 });
  const lastPanTouch = useRef<{ x: number; y: number } | null>(null);
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 0;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 0;
  const bgOpacity = 1 - Math.min(1, (dragOffset.y / (screenH || 1)) * 2);
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

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

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    basePan.current = { x: 0, y: 0 };
    baseScale.current = 1;
  }, [fullscreenIndex]);

  useEffect(() => {
    if (scale === 1) {
      setPan({ x: 0, y: 0 });
      basePan.current = { x: 0, y: 0 };
    }
  }, [scale]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('projectsCache', JSON.stringify(projects));
    }
  }, [projects]);

  const showPrev = () => {
    setFullscreenIndex(i => (i === null ? i : (i - 1 + projects.length) % projects.length));
  };
  const showNext = () => {
    setFullscreenIndex(i => (i === null ? i : (i + 1) % projects.length));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
      baseScale.current = scale;
    } else if (scale > 1) {
      lastPanTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      touchStartX.current = e.touches[0]?.clientX ?? null;
      touchStartY.current = e.touches[0]?.clientY ?? null;
      touchStartTime.current = Date.now();
      setDragTransition('');
      dragAxis.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = clamp((dist / pinchStartDist.current) * baseScale.current, 1, 4);
      setScale(newScale);
      const maxX = (screenW * (newScale - 1)) / 2;
      const maxY = (screenH * (newScale - 1)) / 2;
      const clampedX = clamp(pan.x, -maxX, maxX);
      const clampedY = clamp(pan.y, -maxY, maxY);
      setPan({ x: clampedX, y: clampedY });
      basePan.current = { x: clampedX, y: clampedY };
    } else if (scale > 1 && e.touches.length === 1 && lastPanTouch.current) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - lastPanTouch.current.x;
      const dy = currentY - lastPanTouch.current.y;
      const maxX = (screenW * (scale - 1)) / 2;
      const maxY = (screenH * (scale - 1)) / 2;
      setPan({
        x: clamp(basePan.current.x + dx, -maxX, maxX),
        y: clamp(basePan.current.y + dy, -maxY, maxY),
      });
    } else if (scale === 1) {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const currentX = e.touches[0]?.clientX ?? touchStartX.current;
      const currentY = e.touches[0]?.clientY ?? touchStartY.current;
      const diffX = currentX - touchStartX.current;
      const diffY = currentY - touchStartY.current;
      if (!dragAxis.current) {
        dragAxis.current = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      }
      if (dragAxis.current === 'x') {
        setDragOffset({ x: diffX, y: 0 });
      } else {
        setDragOffset({ x: 0, y: diffY > 0 ? diffY : 0 });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDist.current && e.touches.length < 2) {
      pinchStartDist.current = null;
      baseScale.current = scale;
      basePan.current = pan;
      lastPanTouch.current = null;
      return;
    }
    if (scale > 1) {
      basePan.current = pan;
      lastPanTouch.current = null;
      return;
    }
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    if (startX === null || startY === null) return;
    const endTouch = e.changedTouches[0];
    const diffX = (endTouch?.clientX ?? startX) - startX;
    const diffY = (endTouch?.clientY ?? startY) - startY;
    const time = Date.now() - touchStartTime.current;
    const primaryDiff = dragAxis.current === 'x' ? diffX : diffY;
    const velocity = Math.abs(primaryDiff) / Math.max(time, 1);
    const duration = Math.max(0.1, Math.min(0.5, 0.4 / (velocity + 0.4)));
    setDragTransition(`transform ${duration}s ease-out`);
    if (dragAxis.current === 'y' && diffY > 100) {
      setDragOffset({ x: 0, y: window.innerHeight });
      setTimeout(() => {
        setFullscreenIndex(null);
        setDragOffset({ x: 0, y: 0 });
        setDragTransition('');
      }, duration * 1000);
    } else if (dragAxis.current === 'x' && Math.abs(diffX) > 100) {
      const dir = diffX > 0 ? 1 : -1;
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      setDragOffset({ x: dir * w, y: 0 });
      setTimeout(() => {
        dir > 0 ? showPrev() : showNext();
        setDragOffset({ x: 0, y: 0 });
        setDragTransition('');
      }, duration * 1000);
    } else {
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => setDragTransition(''), duration * 1000);
    }
    touchStartX.current = null;
    touchStartY.current = null;
    dragAxis.current = null;
  };

  const selectAspect = (ratio: string) => {
    setAspectRatio(ratio);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aspectRatio', ratio);
    }
  };

  // --- SESJA ---
  useEffect(() => {
    const handleUser = async (u: any) => {
      setUser(u);
      if (u) {
        await ensureProfile(u.id);
      } else {
        setProjects([]);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('projectsCache');
          sessionStorage.removeItem('projectsUser');
        }
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
    if (!user) return;

    const cachedUser =
      typeof window !== 'undefined' ? sessionStorage.getItem('projectsUser') : null;
    if (cachedUser !== user.id) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('projectsUser', user.id);
        sessionStorage.removeItem('projectsCache');
      }
      setProjects([]);
    }

    if (projects.length > 0) return;

    const load = async () => {
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
  }, [user, projects.length]);

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
  const handleGenerate = async ({ focusTextarea = true }: { focusTextarea?: boolean } = {}) => {
    if (!user) { alert('Zaloguj się!'); return; }
    const optionPrompts = options
      .map((label) => optionPromptByLabel(label))
      .filter((text): text is string => Boolean(text));
    if (!prompt.trim() && optionPrompts.length === 0) {
      alert('Wpisz opis kuchni lub wybierz opcję');
      return;
    }

    const userPrompt = prompt; // zapisz oryginalny prompt użytkownika, zanim go wyczyścimy z inputu
    const optionsPrompt = optionPrompts.join(', ');
    const placeholderSource = userPrompt.trim() ? userPrompt : optionsPrompt;
    const placeholderPrompt = placeholderSource && placeholderSource.trim() ? placeholderSource : 'Generowanie...';

    setLoading(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(LOADING_KEY, '1');
    }
    setPendingFrame({ prompt: placeholderPrompt, aspectRatio });

    setPrompt('');
    setOptions([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('promptDraft');
    }
    if (focusTextarea) {
      textareaRef.current?.focus();
    } else {
      textareaRef.current?.blur();
    }
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { throw sessionError; }

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        alert('Brak aktywnej sesji. Zaloguj się ponownie.');
        return;
      }

      // 1) Wywołaj API generowania (wersja bez konfliktów)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          prompt: userPrompt,
          aspectRatio,
          options: optionPrompts, // wysyłamy gotowe fragmenty promptu
          accessToken,            // przekazujemy token dla backendu
        }),
      });

      const data = (await res.json().catch(() => ({}))) as GenerateResponse;
      if (!res.ok) {
        console.error('[API ERROR]', data);
        alert(`Błąd generowania: ${data?.error ?? res.status}\n${data?.details ?? ''}`);
        return;
      }

      const apiProject = data?.project;
      if (!apiProject) {
        alert('API nie zwróciło projektu');
        return;
      }

      if (!apiProject.imageUrl || !apiProject.storagePath) {
        alert('Brak danych obrazka w odpowiedzi API');
        return;
      }

      const newProj: Project = {
        id: apiProject.id || uuidish(),
        imageUrl: apiProject.imageUrl,
        storagePath: apiProject.storagePath,
        prompt: apiProject.prompt || userPrompt,
        user: apiProject.user || user.email,
      };

      // 2) UI + zapis w sessionStorage (na wypadek przejścia na inną stronę)
      setProjects(p => [newProj, ...p]);
      if (typeof window !== 'undefined') {
        try {
          const prev = JSON.parse(sessionStorage.getItem('projectsCache') || '[]') as Project[];
          sessionStorage.setItem('projectsCache', JSON.stringify([newProj, ...prev]));
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.error(e);
      alert(`Wyjątek: ${String(e)}`);
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LOADING_KEY);
        window.dispatchEvent(new Event(EVENT_GENERATION_FINISHED));
      }
      if (mountedRef.current) {
        setPendingFrame(null);
        setLoading(false);
      }
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

      if (isMobile && (navigator as any).canShare) {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], `kuchnia-${uuidish()}.png`, {
          type: blob.type || 'image/png',
        });

        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
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

  const handleClearPrompt = () => {
    setPrompt('');
    setOptions([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('promptDraft');
    }
    textareaRef.current?.blur();
  };

  const showEmptyState = projects.length === 0 && !pendingFrame;

  return (
    <main className="min-h-screen p-6 pb-40">
      <header className="mb-6 flex items-center gap-2">
        <img src="/logo.svg" alt="kuchnie.ai logo" className="w-8 h-8 md:w-10 md:h-10" />
        <h1 className="text-2xl font-bold">kuchnie.ai</h1>
      </header>

      {showEmptyState ? (
        <p className="text-gray-500">Na razie pusto – opisz kuchnię i wyślij!</p>
      ) : (
        <section className="columns-2 md:columns-3 gap-1">
          {pendingFrame && (
            <figure className="mb-1 break-inside-avoid relative">
              <div
                className="relative w-full led-border rounded-xl bg-white shadow-sm"
                style={{ aspectRatio: pendingFrame.aspectRatio.replace(':', ' / ') }}
              >
                <div className="flex h-full w-full items-center justify-center p-4 text-center">
                  <p className="w-full max-h-full overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-600">
                    {pendingFrame.prompt}
                  </p>
                </div>
              </div>
            </figure>
          )}
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
                  const el = e.currentTarget as HTMLImageElement;
                  if (!el.src.includes('download=1')) {
                    el.src = `${el.src}${el.src.includes('?') ? '&' : '?'}download=1`;
                  }
                }}
              />
            </figure>
          ))}
        </section>
      )}

        <div className="fixed bottom-16 left-0 right-0 px-4 py-2">
          <div className="flex items-stretch gap-2">
            <div
              className="relative rounded-xl transition-all duration-300"
              style={{ width: hasPrompt ? '100%' : `${collapsedWidth}px`, flexGrow: hasPrompt ? 1 : 0 }}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={(e) => {
                  const value = e.target.value;
                  setPrompt(value);
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('promptDraft', value);
                  }
                  autoResize();
                  syncOptionsFromPrompt(value);
                }}
                placeholder={PROMPT_PLACEHOLDER}
                className={`w-full rounded-xl px-4 py-3 ${hasPrompt ? 'pr-20' : 'pr-12'} bg-[#f2f2f2] border-none resize-none min-h-12 text-lg overflow-y-auto transition-all duration-300 placeholder-fade-in`}
              />
              {hasPrompt && (
                <button
                  type="button"
                  onClick={handleClearPrompt}
                  className="absolute right-2 top-0 -translate-y-[calc(100%+0.5rem)] flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f2f2] text-3xl leading-none text-gray-600 shadow-sm"
                  aria-label="Wyczyść opis"
                >
                  ×
                </button>
              )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`absolute ${hasPrompt ? 'right-12' : 'right-2'} top-1/2 -translate-y-1/2 p-2 transition-all duration-300`}
              aria-label="Ustawienia"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
            <button
              onClick={() => { void handleGenerate(); }}
              disabled={loading || !hasPrompt}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 transition-all duration-300 ${
                hasPrompt
                  ? 'opacity-100 scale-100 disabled:opacity-50'
                  : 'opacity-0 scale-90 pointer-events-none'
              }`}
              aria-label="Wyślij"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sliding menu */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-50 p-4 bg-white rounded-t-2xl shadow-lg max-h-[75%] overflow-y-auto transform transition-transform duration-300 ${
          menuOpen ? 'translate-y-0' : 'translate-y-full'
        } pb-20`}
      >
        <button
          className="absolute top-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f2f2] text-3xl leading-none text-gray-600 shadow-sm"
          aria-label="Zamknij"
          onClick={() => setMenuOpen(false)}
        >
          ×
        </button>

        <div className="mb-4">
          <p className="font-medium mb-2">Proporcje zdjęcia</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectAspect('3:4')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '3:4' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Pion 4:3
            </button>
            <button
              onClick={() => selectAspect('1:1')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '1:1' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Kwadrat
            </button>
            <button
              onClick={() => selectAspect('4:3')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '4:3' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Poziom 4:3
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {featureCategories.map((category) => (
            <div key={category.name}>
              <p className="font-medium mb-2">{category.name}</p>
              <div className="flex flex-wrap gap-2">
                {category.options.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => toggleOption(f.label)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      options.includes(f.label) ? 'bg-blue-200' : 'bg-[#f2f2f2]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 right-4">
          <button
            type="button"
            onClick={() => {
              if (loading || !hasSelectedOptions) return;
              setMenuOpen(false);
              void handleGenerate({ focusTextarea: false });
            }}
            disabled={loading || !hasSelectedOptions}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] ${
              hasSelectedOptions ? 'text-gray-700' : 'text-gray-400'
            } shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Wyślij"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>

      </div>

      {fullscreenIndex !== null && projects[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-[60] overflow-hidden"
          style={{ backgroundColor: `rgba(0,0,0,${bgOpacity})` }}
          onClick={() => setFullscreenIndex(null)}
        >
          <div
            className="absolute inset-0 flex touch-none"
            style={{ transform: `translate3d(${dragOffset.x - fullscreenIndex * screenW}px, ${dragOffset.y}px, 0)`, transition: dragTransition }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
            onTouchMove={(e) => { e.stopPropagation(); handleTouchMove(e); }}
            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e); }}
          >
            {projects.map((p, i) => (
              <img
                key={p.id}
                src={p.imageUrl}
                alt="Pełny ekran"
                className="w-screen h-screen object-contain flex-shrink-0"
                style={
                  i === fullscreenIndex
                    ? { transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }
                    : undefined
                }
              />
            ))}
          </div>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl p-2"
            style={{ opacity: bgOpacity, transition: 'opacity 0.2s linear' }}
            onClick={(e) => { e.stopPropagation(); showPrev(); }}
            aria-label="Poprzednie zdjęcie"
          >
            ‹
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl p-2"
            style={{ opacity: bgOpacity, transition: 'opacity 0.2s linear' }}
            onClick={(e) => { e.stopPropagation(); showNext(); }}
            aria-label="Następne zdjęcie"
          >
            ›
          </button>
          <div
            className="absolute bottom-4 left-4 right-4 flex flex-col gap-2"
            style={{ opacity: bgOpacity, transition: 'opacity 0.2s linear' }}
          >
            {showPromptOverlay && (
              <div
                className={`relative text-white text-sm bg-black/60 p-3 rounded-md break-words border ${copied ? 'border-white' : 'border-transparent'} max-h-20 overflow-y-auto`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPromptOverlay(false);
                  }}
                  className="absolute top-1 right-1 rounded-full p-1 text-white/80 hover:text-white transition"
                  aria-label="Schowaj prompt"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <p className="pr-8">{projects[fullscreenIndex].prompt}</p>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {!showPromptOverlay && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPromptOverlay(true);
                  }}
                  className="text-white rounded-md px-3 py-1 text-sm bg-black/60 border border-white/50 transition hover:bg-black/70"
                  title="Pokaż prompt"
                >
                  Pokaż prompt
                </button>
              )}
              {showPromptOverlay && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = projects[fullscreenIndex].prompt;
                    applyPromptToEditor(text);
                  }}
                  className="text-white rounded-md px-3 py-1 text-sm bg-black/60 border border-white/50"
                  title="Użyj promptu"
                >
                  Użyj promptu
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(projects[fullscreenIndex].imageUrl);
                }}
                className="text-white rounded-md p-2 bg-black/60 border border-white/50 transition hover:bg-black/70"
                title="Zapisz obraz w galerii"
                aria-label="Pobierz obraz"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(projects[fullscreenIndex]);
                  setFullscreenIndex(null);
                }}
                className="rounded-md p-2 bg-black/60 border border-white/50 transition hover:bg-black/70"
                title="Usuń projekt"
                aria-label="Usuń projekt"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.545-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.217 5.79m14.588 0a48.108 48.108 0 0 0-3.478-.397m-12.132.562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.02-2.09 2.2v.917m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes led-border {
          to { background-position: 200% 0; }
        }
        .led-border::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 2px;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent, #3b82f6, transparent);
          background-size: 200% 100%;
          animation: led-border 4s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
    </main>
  );
}
