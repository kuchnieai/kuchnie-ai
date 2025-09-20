'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type NormalizedPoint = {
  x: number;
  y: number;
};

type BaseStroke = {
  id: string;
  thickness: number;
};

export type FreehandOperation = BaseStroke & {
  type: 'freehand';
  points: NormalizedPoint[];
};

export type StraightLineOperation = BaseStroke & {
  type: 'line';
  start: NormalizedPoint;
  end: NormalizedPoint;
};

export type TextOperation = {
  id: string;
  type: 'text';
  position: NormalizedPoint;
  text: string;
  size: number;
};

export type Operation = FreehandOperation | StraightLineOperation | TextOperation;

export type RoomSketchValue = {
  operations: Operation[];
};

type Tool = 'freehand' | 'line' | 'text';

const BASE_WIDTH = 800; // referencyjna szerokość dla skalowania grubości linii i tekstu

const LINE_COLOR = '#0f172a';
const TEXT_COLOR = '#0f172a';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const THICKNESS_PRESETS = [2, 4, 6, 10];

type RoomSketchPadProps = {
  value: RoomSketchValue;
  onChange: (next: RoomSketchValue) => void;
  className?: string;
};

export function RoomSketchPad({ value, onChange, className }: RoomSketchPadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const operationsRef = useRef<Operation[]>(value.operations ?? []);
  const draftRef = useRef<Operation | null>(null);

  const [tool, setTool] = useState<Tool>('freehand');
  const [thickness, setThickness] = useState<number>(THICKNESS_PRESETS[1]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    operationsRef.current = Array.isArray(value.operations) ? [...value.operations] : [];
    drawAll();
  }, [value.operations, drawAll]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    drawAll();
  }, [drawAll]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    resizeCanvas();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resizeCanvas());
      const container = containerRef.current;
      if (container) {
        observer.observe(container);
      }
    }

    return () => {
      observer?.disconnect();
    };
  }, [isMounted, resizeCanvas]);

  const getCanvasMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const drawOperation = useCallback(
    (ctx: CanvasRenderingContext2D, operation: Operation, width: number, height: number) => {
      const scale = width / BASE_WIDTH;

      if (operation.type === 'text') {
        const fontSize = Math.max(12, operation.size * 3) * scale;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize}px "Inter", "Segoe UI", system-ui, sans-serif`;
        ctx.fillText(operation.text, operation.position.x * width, operation.position.y * height);
        return;
      }

      const strokeWidth = Math.max(1, operation.thickness * scale);
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = strokeWidth;

      if (operation.type === 'freehand') {
        if (operation.points.length < 2) {
          return;
        }

        ctx.beginPath();
        const [first, ...rest] = operation.points;
        ctx.moveTo(first.x * width, first.y * height);
        for (const point of rest) {
          ctx.lineTo(point.x * width, point.y * height);
        }
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(operation.start.x * width, operation.start.y * height);
      ctx.lineTo(operation.end.x * width, operation.end.y * height);
      ctx.stroke();
    },
    [],
  );

  const drawAll = useCallback(
    (draft?: Operation | null) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const metrics = getCanvasMetrics();
      if (!metrics) {
        return;
      }

      const { width, height } = metrics;
      context.clearRect(0, 0, width, height);

      const operations = draft ? [...operationsRef.current, draft] : operationsRef.current;

      for (const operation of operations) {
        drawOperation(context, operation, width, height);
      }
    },
    [drawOperation, getCanvasMetrics],
  );

  const getNormalizedPoint = useCallback((event: PointerEvent): NormalizedPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, []);

  const commitOperations = useCallback(
    (next: Operation[]) => {
      operationsRef.current = next;
      drawAll();
      onChange({
        operations: next.map((operation) => {
          if (operation.type === 'freehand') {
            return {
              ...operation,
              points: operation.points.map((point) => ({ ...point })),
            };
          }
          if (operation.type === 'line') {
            return {
              ...operation,
              start: { ...operation.start },
              end: { ...operation.end },
            };
          }
          return {
            ...operation,
            position: { ...operation.position },
          };
        }),
      });
    },
    [drawAll, onChange],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === 'mouse' && event.buttons !== 1) {
        return;
      }

      if (!canvasRef.current) {
        return;
      }

      event.preventDefault();
      const point = getNormalizedPoint(event.nativeEvent);
      if (!point) {
        return;
      }

      if (tool === 'text') {
        const input = window.prompt('Wpisz tekst, który chcesz umieścić na planie:', '');
        const text = input?.trim();
        if (text) {
          const next: Operation[] = [
            ...operationsRef.current,
            {
              id: createId(),
              type: 'text',
              position: point,
              text,
              size: thickness,
            },
          ];
          commitOperations(next);
        }
        return;
      }

      const draft: Operation =
        tool === 'freehand'
          ? {
              id: createId(),
              type: 'freehand',
              thickness,
              points: [point],
            }
          : {
              id: createId(),
              type: 'line',
              thickness,
              start: point,
              end: point,
            };

      draftRef.current = draft;
      drawAll(draft);
      canvasRef.current.setPointerCapture(event.pointerId);
    },
    [commitOperations, drawAll, getNormalizedPoint, thickness, tool],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current;
      if (!draft) {
        return;
      }

      event.preventDefault();
      const point = getNormalizedPoint(event.nativeEvent);
      if (!point) {
        return;
      }

      if (draft.type === 'freehand') {
        draftRef.current = {
          ...draft,
          points: [...draft.points, point],
        };
      } else if (draft.type === 'line') {
        draftRef.current = {
          ...draft,
          end: point,
        };
      }

      drawAll(draftRef.current);
    },
    [drawAll, getNormalizedPoint],
  );

  const finalizeDraft = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current;
      if (!draft) {
        return;
      }

      event.preventDefault();
      draftRef.current = null;

      const releasePointer = () => {
        if (canvasRef.current) {
          try {
            canvasRef.current.releasePointerCapture(event.pointerId);
          } catch {
            // ignorujemy błędy przy zwalnianiu capture
          }
        }
      };

      if (draft.type === 'freehand') {
        if (draft.points.length < 2) {
          drawAll();
          releasePointer();
          return;
        }
      } else if (draft.type === 'line') {
        const { start, end } = draft;
        if (start.x === end.x && start.y === end.y) {
          drawAll();
          releasePointer();
          return;
        }
      }

      const next = [...operationsRef.current, draft];
      commitOperations(next);
      releasePointer();
    },
    [commitOperations, drawAll],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      finalizeDraft(event);
    },
    [finalizeDraft],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      finalizeDraft(event);
    },
    [finalizeDraft],
  );

  const handleUndo = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }

    const next = operationsRef.current.slice(0, -1);
    commitOperations(next);
  }, [commitOperations]);

  const handleClear = useCallback(() => {
    commitOperations([]);
  }, [commitOperations]);

  const disableUndo = operationsRef.current.length === 0;

  const toolOptions = useMemo(
    () => [
      { id: 'freehand' as const, label: 'Szkic', description: 'Rysuj dowolne linie' },
      { id: 'line' as const, label: 'Linia prosta', description: 'Od punktu do punktu' },
      { id: 'text' as const, label: 'Tekst', description: 'Wstaw cyfry i litery' },
    ],
    [],
  );

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Narzędzie</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {toolOptions.map((option) => {
              const isActive = tool === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTool(option.id)}
                  className={`flex flex-col items-start rounded-2xl border px-4 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                    isActive
                      ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_24px_-16px_rgba(2,132,199,0.6)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-normal text-slate-500">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">Grubość</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {THICKNESS_PRESETS.map((value) => {
              const isActive = thickness === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setThickness(value)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                    isActive
                      ? 'border-sky-400 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className="block rounded-full bg-slate-600"
                    style={{ height: `${Math.max(2, value / 1.5)}px`, width: '2rem' }}
                    aria-hidden
                  />
                  {value}px
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-end">
          <button
            type="button"
            onClick={handleUndo}
            disabled={disableUndo}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cofnij
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Wyczyść szkic
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mt-6 h-80 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-inner"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148, 163, 184, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="Obszar szkicu w kratkę"
        />
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl bg-white/70 p-3 text-xs text-slate-600 shadow-sm backdrop-blur">
          Rysuj palcem lub myszką. Wybierz narzędzie i grubość linii, aby zaznaczyć ściany i dodać wymiary.
        </div>
      </div>
    </div>
  );
}

export default RoomSketchPad;
