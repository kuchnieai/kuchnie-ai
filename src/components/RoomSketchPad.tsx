'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type NormalizedPoint = { x: number; y: number };
type StrokeColor = 'dimension' | 'note';

export type Operation =
  | { id: string; type: 'freehand'; thickness: number; points: NormalizedPoint[]; color?: StrokeColor }
  | {
      id: string;
      type: 'line';
      thickness: number;
      start: NormalizedPoint;
      end: NormalizedPoint;
      color?: StrokeColor;
    }
  | { id: string; type: 'text'; position: NormalizedPoint; text: string; size: number; color?: StrokeColor };
export type RoomSketchValue = { operations: Operation[]; measurements: Record<string, string> };

type DraftOperation =
  | { type: 'freehand'; thickness: number; points: NormalizedPoint[]; color: StrokeColor }
  | { type: 'line'; thickness: number; start: NormalizedPoint; end: NormalizedPoint; color: StrokeColor };

type Tool = 'freehand' | 'line' | 'text';

type CanvasMetrics = {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
};

type DrawOperation = Operation | DraftOperation;

type Props = {
  value: RoomSketchValue;
  onChange: (next: RoomSketchValue) => void;
  className?: string;
};

export type RoomSketchPadProps = Props;

const THICKNESS_PRESETS = [2, 4, 6, 10] as const;
const STROKE_COLOR_MAP: Record<StrokeColor, string> = {
  dimension: '#0f172a',
  note: '#2563eb',
};

const COLOR_OPTIONS: { value: StrokeColor; label: string; description: string }[] = [
  { value: 'dimension', label: 'Wymiary (czarny)', description: 'Linie z numeracją wymiarów.' },
  { value: 'note', label: 'Notatki (niebieski)', description: 'Swobodne szkice i tekst bez numerów.' },
];

const TOOL_CONFIG: { value: Tool; label: string; description: string; icon: string }[] = [
  { value: 'freehand', label: 'Odręczny', description: 'Rysuj swobodnie palcem lub myszą.', icon: '✏️' },
  { value: 'line', label: 'Linia', description: 'Rysuj proste odcinki.', icon: '📐' },
  { value: 'text', label: 'Tekst', description: 'Dodaj podpisy lub wymiary.', icon: '🔤' },
];

function clampNormalized(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function denormalizePoint(point: NormalizedPoint, metrics: CanvasMetrics): { x: number; y: number } {
  return {
    x: point.x * metrics.width,
    y: point.y * metrics.height,
  };
}

function createOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getCanvasMetrics(canvas: HTMLCanvasElement, container: HTMLElement): CanvasMetrics {
  const rect = container.getBoundingClientRect();
  const innerWidth = container.clientWidth;
  const innerHeight = container.clientHeight;

  const width = innerWidth > 0 ? innerWidth : rect.width > 0 ? rect.width : 1;
  const height = innerHeight > 0 ? innerHeight : rect.height > 0 ? rect.height : 1;
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const pixelWidth = Math.max(Math.round(width * dpr), 1);
  const pixelHeight = Math.max(Math.round(height * dpr), 1);

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  canvas.style.width = '100%';
  canvas.style.height = '100%';

  return { width, height, pixelWidth, pixelHeight, dpr };
}

function resolveStrokeColor(color: StrokeColor | undefined): StrokeColor {
  return color === 'note' ? 'note' : 'dimension';
}

function isDimensionLine(operation: Operation): operation is Operation & { type: 'line' } {
  return operation.type === 'line' && resolveStrokeColor(operation.color) === 'dimension';
}

function drawMeasurementBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  options?: { isDraft?: boolean },
) {
  const radius = 12;
  ctx.save();
  ctx.globalAlpha = options?.isDraft ? 0.75 : 1;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = STROKE_COLOR_MAP.dimension;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = STROKE_COLOR_MAP.dimension;
  ctx.font = '600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawOperation(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  operation: DrawOperation,
  options?: { isDraft?: boolean; measurementLabel?: string },
): void {
  if (operation.type === 'freehand') {
    const points = operation.points;
    if (points.length === 0) {
      return;
    }

    const denormalized = points.map((point) => denormalizePoint(point, metrics));
    const [{ x: firstX, y: firstY }] = denormalized;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = operation.thickness;
    const strokeColor = STROKE_COLOR_MAP[resolveStrokeColor(operation.color)];
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = options?.isDraft ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(firstX, firstY);
    for (let index = 1; index < denormalized.length; index += 1) {
      const point = denormalized[index];
      ctx.lineTo(point.x, point.y);
    }
    if (denormalized.length === 1) {
      ctx.lineTo(firstX, firstY);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (operation.type === 'line') {
    const start = denormalizePoint(operation.start, metrics);
    const end = denormalizePoint(operation.end, metrics);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = operation.thickness;
    const strokeColor = STROKE_COLOR_MAP[resolveStrokeColor(operation.color)];
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = options?.isDraft ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (options?.measurementLabel) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      drawMeasurementBadge(ctx, midX, midY, options.measurementLabel, options);
    }
    ctx.restore();
    return;
  }

  const position = denormalizePoint(operation.position, metrics);
  ctx.save();
  const textColor = STROKE_COLOR_MAP[resolveStrokeColor(operation.color)];
  ctx.fillStyle = textColor;
  ctx.globalAlpha = options?.isDraft ? 0.7 : 1;
  ctx.font = `${operation.size}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(operation.text, position.x, position.y);
  ctx.restore();
}

function drawAll(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  operations: Operation[],
  draft: DraftOperation | null,
  measurementLabels: Map<string, string>,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);
  ctx.restore();

  ctx.save();
  ctx.scale(metrics.dpr, metrics.dpr);
  operations.forEach((operation) => {
    const measurementLabel = measurementLabels.get(operation.id);
    drawOperation(ctx, metrics, operation, { measurementLabel });
  });
  if (draft) {
    const measurementLabel =
      draft.type === 'line' && resolveStrokeColor(draft.color) === 'dimension'
        ? String(measurementLabels.size + 1)
        : undefined;
    drawOperation(ctx, metrics, draft, { isDraft: true, measurementLabel });
  }
  ctx.restore();
}

function thicknessToFontSize(thickness: number): number {
  return Math.round(thickness * 6);
}

function convertDraftToOperation(draft: DraftOperation): Operation | null {
  const id = createOperationId();

  if (draft.type === 'freehand') {
    if (draft.points.length === 0) {
      return null;
    }
    const points = draft.points.length === 1 ? [...draft.points, draft.points[0]] : draft.points;
    return {
      id,
      type: 'freehand',
      thickness: draft.thickness,
      points: points.map((point) => ({ x: clampNormalized(point.x), y: clampNormalized(point.y) })),
      color: draft.color,
    };
  }

  const start = { x: clampNormalized(draft.start.x), y: clampNormalized(draft.start.y) };
  const end = { x: clampNormalized(draft.end.x), y: clampNormalized(draft.end.y) };

  if (start.x === end.x && start.y === end.y) {
    return {
      id,
      type: 'freehand',
      thickness: draft.thickness,
      points: [start, end],
      color: draft.color,
    };
  }

  return {
    id,
    type: 'line',
    thickness: draft.thickness,
    start,
    end,
    color: draft.color,
  };
}

function buildMeasurementMap(
  operations: Operation[],
  sourceMeasurements: Record<string, string>,
): Record<string, string> {
  const dimensionLines = operations.filter(isDimensionLine);
  if (dimensionLines.length === 0) {
    return {};
  }

  return dimensionLines.reduce<Record<string, string>>((acc, operation) => {
    acc[operation.id] = sourceMeasurements[operation.id] ?? '';
    return acc;
  }, {});
}

function computeMeasurementLabels(operations: Operation[]): Map<string, string> {
  const dimensionLines = operations.filter(isDimensionLine);
  const labels = new Map<string, string>();
  dimensionLines.forEach((operation, index) => {
    labels.set(operation.id, String(index + 1));
  });
  return labels;
}

function getNormalizedPoint(clientX: number, clientY: number, rect: DOMRect): NormalizedPoint {
  const width = rect.width > 0 ? rect.width : 1;
  const height = rect.height > 0 ? rect.height : 1;
  const x = clampNormalized((clientX - rect.left) / width);
  const y = clampNormalized((clientY - rect.top) / height);
  return { x, y };
}

export default function RoomSketchPad({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef<CanvasMetrics | null>(null);
  const operationsRef = useRef<Operation[]>(value.operations);
  const measurementsRef = useRef<Record<string, string>>(value.measurements);
  const draftRef = useRef<DraftOperation | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const [tool, setTool] = useState<Tool>('freehand');
  const [thickness, setThickness] = useState<number>(THICKNESS_PRESETS[1]);
  const [draft, setDraft] = useState<DraftOperation | null>(null);
  const [strokeColor, setStrokeColor] = useState<StrokeColor>('dimension');

  const combinedClassName = useMemo(
    () =>
      [
        '-ml-4 box-border w-[calc(100%_+_2rem)] flex flex-col gap-4 rounded-none border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:box-content sm:ml-0 sm:w-full sm:rounded-3xl sm:p-6',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' '),
    [className],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const metrics = metricsRef.current;
    if (!canvas || !metrics) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const measurementLabels = computeMeasurementLabels(operationsRef.current);
    drawAll(context, metrics, operationsRef.current, draftRef.current, measurementLabels);
  }, []);

  useEffect(() => {
    operationsRef.current = value.operations;
    redraw();
  }, [value.operations, redraw]);

  useEffect(() => {
    measurementsRef.current = value.measurements;
  }, [value.measurements]);

  useEffect(() => {
    draftRef.current = draft;
    redraw();
  }, [draft, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    let frame = 0;
    const updateMetrics = () => {
      metricsRef.current = getCanvasMetrics(canvas, container);
      redraw();
    };

    updateMetrics();

    const observer = new ResizeObserver(() => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(updateMetrics);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [redraw]);

  const updateSketch = useCallback(
    (nextOperations: Operation[], measurementOverride?: Record<string, string>) => {
      const measurementsSource = measurementOverride ?? measurementsRef.current;
      const nextMeasurements = buildMeasurementMap(nextOperations, measurementsSource);
      operationsRef.current = nextOperations;
      measurementsRef.current = nextMeasurements;
      onChange({ operations: nextOperations, measurements: nextMeasurements });
    },
    [onChange],
  );

  const commitDraft = useCallback(() => {
    const currentDraft = draftRef.current;
    if (!currentDraft) {
      return;
    }

    const operation = convertDraftToOperation(currentDraft);
    setDraft(null);

    if (!operation) {
      return;
    }

    updateSketch([...operationsRef.current, operation]);
  }, [updateSketch]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') {
        return;
      }

      const canvas = canvasRef.current;
      const metrics = metricsRef.current;
      if (!canvas || !metrics) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const point = getNormalizedPoint(event.clientX, event.clientY, rect);

      if (tool === 'text') {
        const userInput = window.prompt('Wpisz treść etykiety:', '');
        const text = userInput ? userInput.trim() : '';
        if (text.length === 0) {
          return;
        }

        const operation: Operation = {
          id: createOperationId(),
          type: 'text',
          position: point,
          text,
          size: thicknessToFontSize(thickness),
          color: strokeColor,
        };
        updateSketch([...operationsRef.current, operation]);
        return;
      }

      pointerIdRef.current = event.pointerId;
      canvas.setPointerCapture(event.pointerId);

      if (tool === 'freehand') {
        setDraft({ type: 'freehand', thickness, points: [point], color: strokeColor });
        return;
      }

      setDraft({ type: 'line', thickness, start: point, end: point, color: strokeColor });
    },
    [strokeColor, thickness, tool, updateSketch],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const canvas = canvasRef.current;
    const metrics = metricsRef.current;
    if (!canvas || !metrics) {
      return;
    }

    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const point = getNormalizedPoint(event.clientX, event.clientY, rect);

    setDraft((previous) => {
      if (!previous) {
        return previous;
      }

      if (previous.type === 'freehand') {
        return { ...previous, points: [...previous.points, point] };
      }

      return { ...previous, end: point };
    });
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Safari może rzucić błąd, gdy pointer capture nie jest aktywny.
        }
      }

      pointerIdRef.current = null;
      commitDraft();
    },
    [commitDraft],
  );

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    pointerIdRef.current = null;
    setDraft(null);

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignorujemy
      }
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }

    const nextOperations = operationsRef.current.slice(0, -1);
    updateSketch(nextOperations);
  }, [updateSketch]);

  const handleClear = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }
    updateSketch([]);
  }, [updateSketch]);

  const isTextTool = tool === 'text';
  const canUndo = value.operations.length > 0;
  const canClear = value.operations.length > 0;

  const measurementEntries = useMemo(() => {
    const labels = computeMeasurementLabels(value.operations);
    return value.operations
      .filter(isDimensionLine)
      .map((operation) => ({
        id: operation.id,
        label: labels.get(operation.id) ?? '',
        value: value.measurements[operation.id] ?? '',
      }));
  }, [value.measurements, value.operations]);

  const handleMeasurementChange = useCallback(
    (operationId: string, measurementValue: string) => {
      const nextMeasurements = { ...measurementsRef.current, [operationId]: measurementValue };
      updateSketch(operationsRef.current, nextMeasurements);
    },
    [updateSketch],
  );

  return (
    <div className={combinedClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Szkic pomieszczenia</h3>
          <p className="text-sm text-slate-600">
            Wybierz narzędzie i rysuj po kratce. Wszystko zapisuje się lokalnie na tym urządzeniu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOOL_CONFIG.map((toolOption) => {
            const isActive = toolOption.value === tool;
            return (
              <button
                key={toolOption.value}
                type="button"
                onClick={() => setTool(toolOption.value)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isActive
                    ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
                }`}
                title={toolOption.description}
              >
                <span aria-hidden>{toolOption.icon}</span>
                {toolOption.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Grubość linii:</span>
        {THICKNESS_PRESETS.map((preset) => {
          const isActive = thickness === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setThickness(preset)}
              aria-pressed={isActive}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                isActive
                  ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
              }`}
            >
              {preset}px
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Kolor:</span>
        {COLOR_OPTIONS.map((option) => {
          const isActive = strokeColor === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStrokeColor(option.value)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                isActive
                  ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
              }`}
              title={option.description}
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: STROKE_COLOR_MAP[option.value] }}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[280px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white max-h-[min(100vh,640px)] sm:min-h-[320px] sm:max-h-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ touchAction: 'none', cursor: tool === 'text' ? 'text' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />
      </div>

      {measurementEntries.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Tabela wymiarów</h4>
            <p className="text-xs text-slate-600">Uzupełnij rzeczywiste długości dla oznaczonych odcinków.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm text-slate-700">
              <thead>
                <tr>
                  <th scope="col" className="w-20 px-3 py-2 text-left font-semibold text-slate-700">
                    Nr linii
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-700">
                    Rzeczywisty wymiar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {measurementEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{entry.label}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.value}
                        onChange={(event) => handleMeasurementChange(entry.id, event.target.value)}
                        placeholder="np. 3,2 m"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isTextTool ? 'Kliknij na kratkę, aby dodać tekst.' : 'Przeciągnij po kratce, aby narysować element.'}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cofnij
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!canClear}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wyczyść szkic
          </button>
        </div>
      </div>
    </div>
  );
}
