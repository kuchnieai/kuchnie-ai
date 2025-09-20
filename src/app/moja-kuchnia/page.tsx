'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import type {
  DimensionOperation,
  NormalizedPoint,
  Operation,
  RoomSketchPadProps,
  RoomSketchValue,
} from '@/components/RoomSketchPad';

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

const RoomSketchPad = dynamic<RoomSketchPadProps>(() => import('@/components/RoomSketchPad'), {
  ssr: false,
});

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

function createEmptySketch(): RoomSketchValue {
  return { operations: [] };
}

const createEmptySelections = () =>
  CATEGORIES.reduce<Record<string, string[]>>((acc, category) => {
    acc[category.id] = [];
    return acc;
  }, {});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeSketchNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function sanitizeNormalizedPoint(value: unknown): NormalizedPoint | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = sanitizeSketchNumber(value.x);
  const y = sanitizeSketchNumber(value.y);
  if (x === null || y === null) {
    return null;
  }

  return { x, y };
}

function sanitizeOperation(value: unknown): Operation | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== 'string') {
    return null;
  }

  if (value.type === 'freehand') {
    const rawPoints = Array.isArray(value.points) ? value.points : [];
    const points = rawPoints
      .map((entry) => sanitizeNormalizedPoint(entry))
      .filter((entry): entry is NormalizedPoint => entry !== null);
    if (points.length === 0) {
      return null;
    }

    const thickness =
      typeof value.thickness === 'number' && Number.isFinite(value.thickness) && value.thickness > 0
        ? value.thickness
        : 2;

    return {
      id: value.id,
      type: 'freehand',
      thickness,
      points,
    };
  }

  if (value.type === 'line') {
    const start = sanitizeNormalizedPoint(value.start);
    const end = sanitizeNormalizedPoint(value.end);
    if (!start || !end) {
      return null;
    }

    const thickness =
      typeof value.thickness === 'number' && Number.isFinite(value.thickness) && value.thickness > 0
        ? value.thickness
        : 2;

    return {
      id: value.id,
      type: 'line',
      thickness,
      start,
      end,
    };
  }

  if (value.type === 'dimension') {
    const start = sanitizeNormalizedPoint(value.start);
    const end = sanitizeNormalizedPoint(value.end);
    if (!start || !end) {
      return null;
    }

    const label =
      typeof value.label === 'number' && Number.isFinite(value.label) && value.label > 0
        ? Math.round(value.label)
        : 0;
    const measurement = typeof value.measurement === 'string' ? value.measurement : '';

    return {
      id: value.id,
      type: 'dimension',
      start,
      end,
      label,
      measurement,
    } satisfies DimensionOperation;
  }

  if (value.type === 'text') {
    const position = sanitizeNormalizedPoint(value.position);
    if (!position || typeof value.text !== 'string') {
      return null;
    }

    const size = typeof value.size === 'number' && Number.isFinite(value.size) && value.size > 0 ? value.size : 16;

    return {
      id: value.id,
      type: 'text',
      position,
      text: value.text,
      size,
    };
  }

  return null;
}

function sanitizeSketchValue(value: unknown): RoomSketchValue {
  if (!isRecord(value)) {
    return createEmptySketch();
  }

  const rawOperations = Array.isArray(value.operations) ? value.operations : [];
  const operations = rawOperations
    .map((entry) => sanitizeOperation(entry))
    .filter((entry): entry is Operation => entry !== null);

  let dimensionCounter = 1;
  const normalizedOperations = operations.map((operation) => {
    if (operation.type !== 'dimension') {
      return operation;
    }

    const normalized: DimensionOperation = {
      ...operation,
      label: dimensionCounter,
    };
    dimensionCounter += 1;
    return normalized;
  });

  return { operations: normalizedOperations };
}

export default function MyKitchenPage() {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => createEmptySelections());
  const [sketch, setSketch] = useState<RoomSketchValue>(() => createEmptySketch());
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
          sketch?: unknown;
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

        if ('sketch' in parsed) {
          setSketch(sanitizeSketchValue(parsed.sketch));
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

    const payload = JSON.stringify({ selections, notes, sketch });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [selections, notes, sketch, isLoaded]);

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

  const selectAllOptions = (category: Category) => {
    setSelections((prev) => ({
      ...prev,
      [category.id]: category.options.map((option) => option.value),
    }));
  };

  const clearCategory = (category: Category) => {
    setSelections((prev) => ({
      ...prev,
      [category.id]: [],
    }));
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
  const hasSketch = sketch.operations.length > 0;

  const handleReset = () => {
    setSelections(createEmptySelections());
    setSketch(createEmptySketch());
    setNotes('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm ring-1 ring-slate-200">
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
            {CATEGORIES.map((category) => {
              const selectedValues = selections[category.id] ?? [];
              const allValues = category.options.map((option) => option.value);
              const isMulti = category.type === 'multi';
              const everySelected = isMulti && allValues.every((value) => selectedValues.includes(value));

              return (
                <section
                  key={category.id}
                  className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-900">{category.title}</h2>
                      <p className="text-sm leading-relaxed text-slate-600">{category.description}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {category.type === 'single' ? 'Wybierz jedną opcję' : 'Możesz wybrać wiele opcji'}
                      </span>
                      {isMulti && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => selectAllOptions(category)}
                            className="rounded-full border border-transparent bg-slate-100 px-3 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={everySelected}
                          >
                            Zaznacz wszystkie
                          </button>
                          <button
                            type="button"
                            onClick={() => clearCategory(category)}
                            className="rounded-full border border-transparent px-3 py-1 font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={selectedValues.length === 0}
                          >
                            Wyczyść
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {category.options.map((option) => {
                      const isSelected = selectedValues.includes(option.value);
                      const optionLabel = option.description
                        ? `${option.label} – ${option.description}`
                        : option.label;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={optionLabel}
                          title={option.description}
                          onClick={() => toggleOption(category, option.value)}
                          className={`group relative flex min-w-[160px] items-center gap-3 rounded-full border px-4 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:min-w-[200px] ${
                            isSelected
                              ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_12px_30px_-16px_rgba(14,116,144,0.45)]'
                              : 'border-slate-200 bg-white/90 text-slate-600 hover:border-sky-200 hover:bg-sky-50/80 hover:text-slate-700'
                          }`}
                        >
                          {option.swatch ? (
                            <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
                              <span
                                aria-hidden
                                className="h-8 w-8 rounded-full border border-white/70 shadow-inner"
                                style={{ background: option.swatch }}
                              />
                            </span>
                          ) : (
                            <span aria-hidden className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
                              {option.icon ?? '✨'}
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-semibold text-slate-900">{option.label}</span>
                            {option.description && (
                              <span className="text-xs font-normal text-slate-500">
                                {option.description}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 space-y-2 text-xs text-slate-500">
                    {selectedValues.length > 0 ? (
                      selectedValues.map((value) => {
                        const option = category.options.find((opt) => opt.value === value);
                        if (!option) {
                          return null;
                        }

                        return (
                          <p key={value} className="flex items-start gap-2">
                            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" aria-hidden />
                            <span>
                              <span className="font-semibold text-slate-600">{option.label}:</span>{' '}
                              {option.description ?? 'Dodano do planu.'}
                            </span>
                          </p>
                        );
                      })
                    ) : (
                      <p className="italic text-slate-400">Wybierz elementy, które pasują do Twojej kuchni.</p>
                    )}
                  </div>
                </section>
              );
            })}

            <RoomSketchPad value={sketch} onChange={setSketch} />

            <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
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
                className="mt-4 min-h-[180px] w-full resize-y rounded-2xl border border-slate-200 bg-white/90 p-4 text-base text-slate-700 shadow-inner transition focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </section>
          </div>

          <aside className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-lg backdrop-blur-sm lg:sticky lg:top-24">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Twoja kuchnia marzeń</h2>
              <p className="mt-2 text-sm text-slate-600">
                Podsumowanie zaznaczonych elementów. Możesz wrócić do tej listy w dowolnym momencie.
              </p>
            </div>

            <div className="space-y-5">
              {hasSummary ? (
                summary.map((entry) => (
                  <div key={entry.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      {entry.title}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {entry.items.map((item) => {
                        const category = CATEGORIES.find((cat) => cat.options.some((option) => option.value === item));
                        const option = category?.options.find((opt) => opt.value === item);
                        return (
                          <li key={item} className="flex items-start gap-2">
                            <span aria-hidden className="mt-1 text-slate-400">
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notatki</p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              disabled={!hasSummary && !hasNotes && !hasSketch}
            >
              Resetuj stronę
            </button>
            {!hasSummary && !hasNotes && !hasSketch && (
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
