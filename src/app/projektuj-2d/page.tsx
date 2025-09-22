'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type CabinetDefinition = {
  id: string;
  name: string;
  width: number; // cm
  depth: number; // cm
  description?: string;
};

type CabinetInstance = {
  id: string;
  name: string;
  width: number; // cm
  depth: number; // cm
  x: number; // px on board
  y: number; // px on board
};

type CabinetGroup = {
  title: string;
  items: CabinetDefinition[];
};

const SCALE = 2; // px per cm
const GRID_SIZE_CM = 5;
const GRID_SIZE = GRID_SIZE_CM * SCALE;
const BOARD_WIDTH = 900; // px
const BOARD_HEIGHT = 520; // px

const CABINET_GROUPS: CabinetGroup[] = [
  {
    title: 'Szafki dolne',
    items: [
      { id: 'base30', name: 'Dolna 30 × 60 cm', width: 30, depth: 60, description: 'Wąska szafka cargo' },
      { id: 'base40', name: 'Dolna 40 × 60 cm', width: 40, depth: 60 },
      { id: 'base45', name: 'Dolna 45 × 60 cm', width: 45, depth: 60 },
      { id: 'base50', name: 'Dolna 50 × 60 cm', width: 50, depth: 60 },
      { id: 'base60', name: 'Dolna 60 × 60 cm', width: 60, depth: 60 },
      { id: 'base80', name: 'Dolna 80 × 60 cm', width: 80, depth: 60 },
      { id: 'sink80', name: 'Szafka zlewozmywakowa 80 × 60 cm', width: 80, depth: 60 },
      { id: 'corner', name: 'Narożna 90 × 90 cm', width: 90, depth: 90, description: 'Szafka typu L' },
      { id: 'drawer90', name: 'Szuflady 90 × 60 cm', width: 90, depth: 60 },
    ],
  },
  {
    title: 'Szafki górne',
    items: [
      { id: 'wall40', name: 'Górna 40 × 35 cm', width: 40, depth: 35 },
      { id: 'wall60', name: 'Górna 60 × 35 cm', width: 60, depth: 35 },
      { id: 'wall80', name: 'Górna 80 × 35 cm', width: 80, depth: 35 },
      { id: 'wall100', name: 'Górna 100 × 35 cm', width: 100, depth: 35 },
    ],
  },
  {
    title: 'Słupki i AGD',
    items: [
      { id: 'tall60', name: 'Słupek 60 × 60 cm', width: 60, depth: 60, description: 'Wysoka zabudowa' },
      { id: 'fridge', name: 'Lodówka 60 × 70 cm', width: 60, depth: 70, description: 'Standardowa lodówka' },
      { id: 'fridgeSide', name: 'Lodówka side-by-side 90 × 70 cm', width: 90, depth: 70 },
      { id: 'island120', name: 'Wyspa 120 × 90 cm', width: 120, depth: 90 },
      { id: 'table140', name: 'Stół 140 × 90 cm', width: 140, depth: 90 },
    ],
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function KitchenPlanner2D() {
  const [elements, setElements] = useState<CabinetInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const boardDimensions = useMemo(
    () => ({
      width: Math.round(BOARD_WIDTH / SCALE),
      height: Math.round(BOARD_HEIGHT / SCALE),
    }),
    [],
  );

  const handleAddCabinet = (definition: CabinetDefinition) => {
    const nextId = createId();
    const boardWidth = boardRef.current?.clientWidth ?? BOARD_WIDTH;
    const boardHeight = boardRef.current?.clientHeight ?? BOARD_HEIGHT;
    const elementWidth = definition.width * SCALE;
    const elementHeight = definition.depth * SCALE;

    setElements((prev) => {
      const offset = (prev.length % 6) * 18;
      const baseX = clamp(24 + offset, 0, Math.max(0, boardWidth - elementWidth));
      const baseY = clamp(24 + offset, 0, Math.max(0, boardHeight - elementHeight));

      return [
        ...prev,
        {
          id: nextId,
          name: definition.name,
          width: definition.width,
          depth: definition.depth,
          x: baseX,
          y: baseY,
        },
      ];
    });
    setSelectedId(nextId);
  };

  const handleRotateSelected = () => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((element) =>
        element.id === selectedId
          ? {
              ...element,
              width: element.depth,
              depth: element.width,
            }
          : element,
      ),
    );
  };

  const handleRemoveSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  };

  const handleClear = () => {
    setElements([]);
    setSelectedId(null);
  };

  const handleStartDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    id: string,
  ) => {
    event.preventDefault();
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    pointerOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setSelectedId(id);
    setDraggingId(id);
  };

  useEffect(() => {
    if (!draggingId) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();

      setElements((prev) => {
        const element = prev.find((item) => item.id === draggingId);
        if (!element) {
          return prev;
        }

        const elementWidth = element.width * SCALE;
        const elementHeight = element.depth * SCALE;

        const rawX = event.clientX - boardRect.left - pointerOffsetRef.current.x;
        const rawY = event.clientY - boardRect.top - pointerOffsetRef.current.y;

        const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        const clampedX = clamp(snappedX, 0, Math.max(0, boardRect.width - elementWidth));
        const clampedY = clamp(snappedY, 0, Math.max(0, boardRect.height - elementHeight));

        return prev.map((item) =>
          item.id === draggingId
            ? {
                ...item,
                x: clampedX,
                y: clampedY,
              }
            : item,
        );
      });
    };

    const handlePointerUp = () => {
      setDraggingId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingId]);

  const instructions = [
    'Dodaj moduły z biblioteki po lewej, aby rozpocząć układanie kuchni.',
    'Przeciągaj elementy na planie. Pozycje zatrzaskują się co 5 cm.',
    'Użyj przycisku Obróć, aby zamienić szerokość z głębokością zaznaczonego modułu.',
  ];

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="space-y-3 border-b border-neutral-200 pb-8 text-neutral-900">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Projektuj 2D</p>
          <h1 className="text-3xl font-semibold text-neutral-900">Generator kuchni 2D</h1>
          <p className="max-w-2xl text-sm leading-6 text-neutral-600">
            Twórz top‑view w czerni i bieli, korzystając z najpopularniejszych modułów kuchennych.
            Każdy element możesz przesuwać, obracać oraz układać w siatce co 5 centymetrów.
          </p>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)_260px]">
          <aside className="space-y-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900">Biblioteka modułów</h2>
            <p className="text-sm text-neutral-600">
              Wszystkie wymiary podane są w centymetrach. Wybierz szafkę, aby dodać ją na plan.
            </p>
            <div className="space-y-6">
              {CABINET_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                    {group.title}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleAddCabinet(item)}
                          className="w-full rounded-2xl border border-neutral-400 px-4 py-3 text-left transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <span className="block font-medium text-neutral-900">{item.name}</span>
                          <span className="block text-xs text-neutral-500">
                            {item.width} × {item.depth} cm
                            {item.description ? ` • ${item.description}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Instrukcja</h2>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                {instructions.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-400 text-xs font-semibold text-neutral-600">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-neutral-300 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                <p>
                  Pole robocze: {boardDimensions.width} cm × {boardDimensions.height} cm
                </p>
                <p>Skala: 1 cm = {SCALE} px • Siatka: {GRID_SIZE_CM} cm</p>
              </div>

              <div
                ref={boardRef}
                className="relative mt-4 rounded-2xl border border-neutral-400 bg-white"
                style={{
                  width: BOARD_WIDTH,
                  height: BOARD_HEIGHT,
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)',
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                  cursor: draggingId ? 'grabbing' : 'default',
                  touchAction: 'none',
                }}
                onPointerDown={(event) => {
                  if (event.target === boardRef.current) {
                    setSelectedId(null);
                  }
                }}
              >
                {elements.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                    Dodaj moduł z lewej strony, aby rozpocząć układanie planu.
                  </div>
                )}

                {elements.map((element) => {
                  const isSelected = element.id === selectedId;
                  return (
                    <div
                      key={element.id}
                      role="button"
                      tabIndex={0}
                      className={`absolute select-none rounded-xl border ${
                        isSelected
                          ? 'border-black bg-neutral-100 shadow-[0_0_0_2px_rgba(0,0,0,0.3)]'
                          : 'border-neutral-500 bg-neutral-200'
                      } flex flex-col items-center justify-center text-xs font-medium text-neutral-800`}
                      style={{
                        width: element.width * SCALE,
                        height: element.depth * SCALE,
                        left: element.x,
                        top: element.y,
                        zIndex: isSelected ? 2 : 1,
                      }}
                      onPointerDown={(event) => handleStartDrag(event, element.id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(element.id);
                      }}
                    >
                      <span className="px-2 text-center leading-tight">{element.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-600">
                        {element.width} × {element.depth} cm
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900">Wybrany moduł</h2>
            {selectedElement ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-neutral-900">{selectedElement.name}</p>
                  <p className="text-neutral-600">
                    {selectedElement.width} cm szerokości × {selectedElement.depth} cm głębokości
                  </p>
                  <p className="text-neutral-500">
                    Położenie: {Math.round(selectedElement.x / SCALE)} cm, {Math.round(selectedElement.y / SCALE)} cm
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleRotateSelected}
                    className="flex-1 rounded-full border border-neutral-500 px-4 py-2 font-semibold uppercase tracking-widest text-neutral-800 transition hover:bg-neutral-200"
                  >
                    Obróć 90°
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    className="flex-1 rounded-full border border-neutral-500 px-4 py-2 font-semibold uppercase tracking-widest text-neutral-800 transition hover:bg-neutral-200"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">
                Zaznacz moduł na planie, aby zobaczyć szczegóły i dostępne akcje.
              </p>
            )}

            <div className="border-t border-dashed border-neutral-300 pt-4 text-sm text-neutral-600">
              <p>
                W dowolnym momencie możesz wyczyścić projekt i zacząć od nowa. To idealne miejsce na szybkie koncepcje
                układu kuchni przed przejściem do zaawansowanych wizualizacji.
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="mt-4 w-full rounded-full border border-neutral-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-800 transition hover:bg-neutral-200"
              >
                Wyczyść plan
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
