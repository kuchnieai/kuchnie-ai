'use client';

import { useEffect, useMemo, useState } from 'react';

type Option = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  swatch?: string;
};

type Category = {
  id: string;
  title: string;
  description: string;
  type: 'single' | 'multi';
  options: Option[];
};

const ROOM_FEATURE_OPTIONS: Option[] = [
  {
    value: 'open-plan',
    label: 'Otwarta na salon',
    description: 'Strefa dzienna płynnie łączy się z kuchnią.',
    icon: '🛋️',
  },
  {
    value: 'separate-room',
    label: 'Oddzielne pomieszczenie',
    description: 'Zamknięta kuchnia z własnym wejściem.',
    icon: '🚪',
  },
  {
    value: 'large-window',
    label: 'Duże okno',
    description: 'Dużo naturalnego światła i widok na zewnątrz.',
    icon: '🌞',
  },
  {
    value: 'dining-area',
    label: 'Miejsce na stół',
    description: 'Przestrzeń na rodzinne posiłki lub wyspę z hokerami.',
    icon: '🍽️',
  },
  {
    value: 'pantry',
    label: 'Spiżarnia lub schowek',
    description: 'Dodatkowe miejsce na przechowywanie zapasów.',
    icon: '🧺',
  },
  {
    value: 'high-ceiling',
    label: 'Wysoki sufit',
    description: 'Możliwość wyższej zabudowy i dekoracyjnego oświetlenia.',
    icon: '🏠',
  },
  {
    value: 'sloped-ceiling',
    label: 'Skosy',
    description: 'Adaptacja poddasza lub skośnych ścian.',
    icon: '⛰️',
  },
];

const LAYOUT_OPTIONS: Option[] = [
  {
    value: 'single-wall',
    label: 'Jedna linia',
    description: 'Szafki ustawione wzdłuż jednej ściany.',
    icon: '〰️',
  },
  {
    value: 'l-shaped',
    label: 'Litera L',
    description: 'Wygodny układ na dwie sąsiadujące ściany.',
    icon: '⬐',
  },
  {
    value: 'u-shaped',
    label: 'Litera U',
    description: 'Maksimum blatu i miejsce na gotowanie w centrum.',
    icon: '⬓',
  },
  {
    value: 'galley',
    label: 'Dwurzędowa',
    description: 'Dwie równoległe linie zabudowy.',
    icon: '⫽',
  },
  {
    value: 'island',
    label: 'Z wyspą',
    description: 'Oddzielona strefa robocza lub miejsce spotkań.',
    icon: '🪑',
  },
  {
    value: 'peninsula',
    label: 'Z półwyspem',
    description: 'Blat wysunięty z zabudowy jako dodatkowa strefa.',
    icon: '🧭',
  },
];

const APPLIANCE_OPTIONS: Option[] = [
  {
    value: 'built-in-fridge',
    label: 'Lodówka w zabudowie',
    description: 'Front ukryty w zabudowie meblowej.',
    icon: '🧊',
  },
  {
    value: 'freestanding-fridge',
    label: 'Lodówka wolnostojąca',
    description: 'Wyeksponowana lodówka solo lub side-by-side.',
    icon: '🥶',
  },
  {
    value: 'column-oven',
    label: 'Piekarnik w słupku',
    description: 'Wygodne ustawienie z mikrofalą na wysokości wzroku.',
    icon: '🔥',
  },
  {
    value: 'cooktop-oven',
    label: 'Piekarnik pod płytą',
    description: 'Klasyczne rozwiązanie z płytą nad piekarnikiem.',
    icon: '🍞',
  },
  {
    value: 'dishwasher-60',
    label: 'Zmywarka 60 cm',
    description: 'Pełnowymiarowa zmywarka do większej rodziny.',
    icon: '💧',
  },
  {
    value: 'dishwasher-45',
    label: 'Zmywarka 45 cm',
    description: 'Wąska zmywarka idealna do mniejszego wnętrza.',
    icon: '🫧',
  },
  {
    value: 'island-hood',
    label: 'Okap wyspowy',
    description: 'Dekoracyjny okap zawieszony nad wyspą.',
    icon: '🌬️',
  },
  {
    value: 'laundry',
    label: 'Pralka w zabudowie',
    description: 'Ukryta pralka w ciągu meblowym kuchni.',
    icon: '🧼',
  },
];

const COLOR_OPTIONS: Option[] = [
  {
    value: 'white-wood',
    label: 'Biel i jasne drewno',
    description: 'Lekka i przytulna baza skandynawskiego stylu.',
    swatch: 'linear-gradient(135deg, #f8fafc, #f1f5f9 40%, #facc15)',
  },
  {
    value: 'warm-beige',
    label: 'Ciepłe beże',
    description: 'Naturalne odcienie piasku i kawy z mlekiem.',
    swatch: 'linear-gradient(135deg, #f5e9da, #f1d8c0 50%, #e2b699)',
  },
  {
    value: 'cool-grey',
    label: 'Chłodne szarości',
    description: 'Nowoczesne, stonowane tonacje.',
    swatch: 'linear-gradient(135deg, #e2e8f0, #cbd5f5 50%, #94a3b8)',
  },
  {
    value: 'black-wood',
    label: 'Czerń z drewnem',
    description: 'Kontrastowa elegancja z drewnianymi akcentami.',
    swatch: 'linear-gradient(135deg, #111827, #1f2937 50%, #b45309)',
  },
  {
    value: 'green-accents',
    label: 'Zielone akcenty',
    description: 'Natura w kuchni: szałwia, oliwka, rośliny.',
    swatch: 'linear-gradient(135deg, #ecfdf5, #a7f3d0 50%, #047857)',
  },
  {
    value: 'navy-gold',
    label: 'Granat i mosiądz',
    description: 'Głębia koloru ze złotymi detalami.',
    swatch: 'linear-gradient(135deg, #0f172a, #1e293b 45%, #fbbf24)',
  },
];

const CATEGORIES: Category[] = [
  {
    id: 'room',
    title: 'Cechy pomieszczenia',
    description: 'Zaznacz elementy, które opisują Twoją przestrzeń.',
    type: 'multi',
    options: ROOM_FEATURE_OPTIONS,
  },
  {
    id: 'layout',
    title: 'Układ kuchni',
    description: 'Wybierz układ, który najlepiej pasuje do pomieszczenia.',
    type: 'single',
    options: LAYOUT_OPTIONS,
  },
  {
    id: 'appliances',
    title: 'Sprzęt AGD',
    description: 'Określ, jakie urządzenia muszą się znaleźć w kuchni.',
    type: 'multi',
    options: APPLIANCE_OPTIONS,
  },
  {
    id: 'colors',
    title: 'Kolor przewodni',
    description: 'Jakie barwy mają budować klimat Twojej kuchni?',
    type: 'single',
    options: COLOR_OPTIONS,
  },
];

const STORAGE_KEY = 'kuchnie-ai:moja-kuchnia';

const createEmptySelections = () =>
  CATEGORIES.reduce<Record<string, string[]>>((acc, category) => {
    acc[category.id] = [];
    return acc;
  }, {});

export default function MyKitchenPage() {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => createEmptySelections());
  const [notes, setNotes] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          selections?: Record<string, unknown>;
          notes?: unknown;
        };

        if (parsed.selections && typeof parsed.selections === 'object') {
          const base = createEmptySelections();
          for (const [key, value] of Object.entries(parsed.selections)) {
            if (Array.isArray(value)) {
              base[key] = value.filter((item): item is string => typeof item === 'string');
            }
          }
          setSelections(base);
        }

        if (typeof parsed.notes === 'string') {
          setNotes(parsed.notes);
        }
      }
    } catch {
      // ignorujemy uszkodzone dane w pamięci
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') {
      return;
    }

    const payload = JSON.stringify({ selections, notes });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [selections, notes, isLoaded]);

  const toggleOption = (category: Category, value: string) => {
    setSelections((prev) => {
      const current = prev[category.id] ?? [];
      let next: string[];

      if (category.type === 'single') {
        next = current.includes(value) ? [] : [value];
      } else {
        next = current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value];
      }

      return {
        ...prev,
        [category.id]: next,
      };
    });
  };

  const summary = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        title: category.title,
        items: selections[category.id] ?? [],
      })).filter((entry) => entry.items.length > 0),
    [selections],
  );

  const hasSummary = summary.length > 0;
  const hasNotes = notes.trim().length > 0;

  const handleReset = () => {
    setSelections(createEmptySelections());
    setNotes('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 shadow-sm ring-1 ring-orange-100">
            Moja kuchnia
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Zapisz marzenia o kuchni w jednym miejscu
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Zaznacz cechy swojego pomieszczenia, wybierz wymarzony układ i sprzęty, a także określ ulubioną
            kolorystykę. Wszystkie wybory zapisujemy lokalnie na tym urządzeniu.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ta karta to Twój osobisty moodboard – możesz do niej wracać podczas rozmów z projektantem lub tworzenia
            wizualizacji w Kuchnie AI.
          </p>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-[2fr,1fr] lg:items-start">
          <div className="space-y-8">
            {CATEGORIES.map((category) => (
              <section
                key={category.id}
                className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{category.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{category.description}</p>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 ring-1 ring-orange-200">
                    {category.type === 'single' ? 'Wybierz jedną opcję' : 'Możesz wybrać wiele opcji'}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {category.options.map((option) => {
                    const isSelected = (selections[category.id] ?? []).includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleOption(category, option.value)}
                        className={`group relative flex items-start gap-4 rounded-2xl border bg-white/80 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                          isSelected
                            ? 'border-orange-300 shadow-[0_20px_45px_-28px_rgba(249,115,22,0.55)]'
                            : 'border-slate-200 hover:border-orange-200 hover:shadow-sm'
                        }`}
                      >
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-lg">
                          {option.swatch ? (
                            <span
                              aria-hidden
                              className="h-10 w-10 rounded-xl border border-white shadow-inner"
                              style={{ background: option.swatch }}
                            />
                          ) : (
                            <span aria-hidden>{option.icon ?? '✨'}</span>
                          )}
                        </span>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-900">{option.label}</p>
                          {option.description && (
                            <p className="text-sm leading-relaxed text-slate-600">{option.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">
                            <span aria-hidden>✓</span> Wybrane
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Notatki i inspiracje</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Zapisz dodatkowe pomysły, linki do inspiracji albo konkretne wymiary i materiały.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Zapisywane automatycznie
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Np. blat z konglomeratu kwarcowego, uchwyty w kolorze szczotkowanego złota, płytki metro na ścianie..."
                className="mt-4 min-h-[180px] w-full resize-y rounded-2xl border border-slate-200 bg-white/90 p-4 text-base text-slate-700 shadow-inner transition focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </section>
          </div>

          <aside className="space-y-6 rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm lg:sticky lg:top-24">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Twoja kuchnia marzeń</h2>
              <p className="mt-2 text-sm text-slate-600">
                Podsumowanie zaznaczonych elementów. Możesz wrócić do tej listy w dowolnym momencie.
              </p>
            </div>

            <div className="space-y-5">
              {hasSummary ? (
                summary.map((entry) => (
                  <div key={entry.title} className="rounded-2xl bg-orange-50/60 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                      {entry.title}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {entry.items.map((item) => {
                        const category = CATEGORIES.find((cat) => cat.options.some((option) => option.value === item));
                        const option = category?.options.find((opt) => opt.value === item);
                        return (
                          <li key={item} className="flex items-start gap-2">
                            <span aria-hidden className="mt-1 text-orange-500">
                              •
                            </span>
                            <span>{option?.label ?? item}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Zaznacz wybrane opcje, aby zobaczyć tutaj szybkie podsumowanie. To świetny punkt wyjścia do dalszych
                  rozmów z projektantem lub konfiguracji wizualizacji.
                </p>
              )}
            </div>

            {hasNotes && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Notatki</p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
              disabled={!hasSummary && !hasNotes}
            >
              Wyczyść wybory
            </button>
            {!hasSummary && !hasNotes && (
              <p className="text-center text-xs text-slate-400">
                Zacznij wybierać elementy, aby utworzyć swój plan kuchni.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
