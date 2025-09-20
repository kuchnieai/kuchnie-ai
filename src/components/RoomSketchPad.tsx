'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type NormalizedPoint = { x: number; y: number };
export type DimensionOperation = {
  id: string;
  type: 'dimension';
  start: NormalizedPoint;
  end: NormalizedPoint;
  label: number;
  measurement: string;
};

export type Operation =
  | { id: string; type: 'freehand'; thickness: number; points: NormalizedPoint[] }
  | { id: string; type: 'line'; thickness: number; start: NormalizedPoint; end: NormalizedPoint }
  | { id: string; type: 'text'; position: NormalizedPoint; text: string; size: number }
  | DimensionOperation;
export type RoomSketchValue = { operations: Operation[] };

type DraftOperation =
  | { type: 'freehand'; thickness: number; points: NormalizedPoint[] }
  | { type: 'line'; thickness: number; start: NormalizedPoint; end: NormalizedPoint }
  | { type: 'dimension'; label: number; start: NormalizedPoint; end: NormalizedPoint };

type Tool = 'freehand' | 'line' | 'text' | 'dimension';

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
const PRIMARY_STROKE_COLOR = '#0f172a';
const DIMENSION_STROKE_COLOR = '#ef4444';
const DIMENSION_LINE_WIDTH = 2;
const DIMENSION_LABEL_FONT_SIZE = 16;
const DIMENSION_MEASUREMENT_FONT_SIZE = 12;
const DIMENSION_MEASUREMENT_GAP = 6;

function isDimensionOperation(operation: Operation): operation is DimensionOperation {
  return operation.type === 'dimension';
}

const TOOL_CONFIG: { value: Tool; label: string; description: string; icon: string }[] = [
  { value: 'freehand', label: 'Odręczny', description: 'Rysuj swobodnie palcem lub myszą.', icon: '✏️' },
  { value: 'line', label: 'Linia', description: 'Rysuj proste odcinki.', icon: '📐' },
  {
    value: 'dimension',
    label: 'Wymiary',
    description: 'Dodaj linie pomocnicze z numeracją.',
    icon: '📏',
  },
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

function drawOperation(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  operation: DrawOperation,
  options?: { isDraft?: boolean },
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
    ctx.strokeStyle = PRIMARY_STROKE_COLOR;
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
    ctx.strokeStyle = PRIMARY_STROKE_COLOR;
    ctx.globalAlpha = options?.isDraft ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (operation.type === 'dimension') {
    const start = denormalizePoint(operation.start, metrics);
    const end = denormalizePoint(operation.end, metrics);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = DIMENSION_LINE_WIDTH;
    ctx.strokeStyle = DIMENSION_STROKE_COLOR;
    ctx.globalAlpha = options?.isDraft ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const label = `${operation.label}`;
    ctx.font = `${DIMENSION_LABEL_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padding = 4;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width + padding * 2;
    const textHeight = DIMENSION_LABEL_FONT_SIZE + padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(centerX - textWidth / 2, centerY - textHeight / 2, textWidth, textHeight);

    ctx.fillStyle = DIMENSION_STROKE_COLOR;
    ctx.fillText(label, centerX, centerY);

    const measurement = operation.measurement.trim();
    if (measurement.length > 0) {
      ctx.font = `${DIMENSION_MEASUREMENT_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      const measurementPadding = 3;
      const measurementMetrics = ctx.measureText(measurement);
      const measurementWidth = measurementMetrics.width + measurementPadding * 2;
      const measurementHeight = DIMENSION_MEASUREMENT_FONT_SIZE + measurementPadding * 2;
      const measurementCenterY = centerY + textHeight / 2 + measurementHeight / 2 + DIMENSION_MEASUREMENT_GAP;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(
        centerX - measurementWidth / 2,
        measurementCenterY - measurementHeight / 2,
        measurementWidth,
        measurementHeight,
      );

      ctx.fillStyle = '#000000';
      ctx.fillText(measurement, centerX, measurementCenterY);
    }
    ctx.restore();
    return;
  }

  const position = denormalizePoint(operation.position, metrics);
  ctx.save();
  ctx.fillStyle = PRIMARY_STROKE_COLOR;
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
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);
  ctx.restore();

  ctx.save();
  ctx.scale(metrics.dpr, metrics.dpr);
  operations.forEach((operation) => {
    drawOperation(ctx, metrics, operation);
  });
  if (draft) {
    drawOperation(ctx, metrics, draft, { isDraft: true });
  }
  ctx.restore();
}

function thicknessToFontSize(thickness: number): number {
  return Math.round(thickness * 6);
}

function convertDraftToOperation(draft: DraftOperation, operations: Operation[]): Operation | null {
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
    };
  }

  if (draft.type === 'dimension') {
    const start = { x: clampNormalized(draft.start.x), y: clampNormalized(draft.start.y) };
    const end = { x: clampNormalized(draft.end.x), y: clampNormalized(draft.end.y) };

    if (start.x === end.x && start.y === end.y) {
      return null;
    }

    const existingDimensions = operations.filter(isDimensionOperation);
    const label =
      Number.isFinite(draft.label) && draft.label > 0
        ? Math.round(draft.label)
        : existingDimensions.length + 1;

    return {
      id,
      type: 'dimension',
      start,
      end,
      label,
      measurement: '',
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
    };
  }

  return {
    id,
    type: 'line',
    thickness: draft.thickness,
    start,
    end,
  };
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
  const draftRef = useRef<DraftOperation | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const [tool, setTool] = useState<Tool>('freehand');
  const [thickness, setThickness] = useState<number>(THICKNESS_PRESETS[1]);
  const [draft, setDraft] = useState<DraftOperation | null>(null);
  const dimensionOperations = useMemo(
    () =>
      value.operations
        .filter(isDimensionOperation)
        .slice()
        .sort((a, b) => a.label - b.label),
    [value.operations],
  );

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

  const handleDimensionMeasurementChange = useCallback(
    (id: string, measurement: string) => {
      onChange({
        operations: operationsRef.current.map((operation) =>
          operation.type === 'dimension' && operation.id === id
            ? { ...operation, measurement }
            : operation,
        ),
      });
    },
    [onChange],
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
    drawAll(context, metrics, operationsRef.current, draftRef.current);
  }, []);

  useEffect(() => {
    operationsRef.current = value.operations;
    redraw();
  }, [value.operations, redraw]);

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

  const commitDraft = useCallback(() => {
    const currentDraft = draftRef.current;
    if (!currentDraft) {
      return;
    }

    const operation = convertDraftToOperation(currentDraft, operationsRef.current);
    setDraft(null);

    if (!operation) {
      return;
    }

    onChange({ operations: [...operationsRef.current, operation] });
  }, [onChange]);

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
        };
        onChange({ operations: [...operationsRef.current, operation] });
        return;
      }

      pointerIdRef.current = event.pointerId;
      canvas.setPointerCapture(event.pointerId);

      if (tool === 'freehand') {
        setDraft({ type: 'freehand', thickness, points: [point] });
        return;
      }

      if (tool === 'dimension') {
        const currentDimensions = operationsRef.current.filter(isDimensionOperation);
        setDraft({ type: 'dimension', label: currentDimensions.length + 1, start: point, end: point });
        return;
      }

      setDraft({ type: 'line', thickness, start: point, end: point });
    },
    [onChange, thickness, tool],
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

      if (previous.type === 'dimension') {
        return { ...previous, end: point };
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
    onChange({ operations: nextOperations });
  }, [onChange]);

  const handleClear = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }
    onChange({ operations: [] });
  }, [onChange]);

  const canUndo = value.operations.length > 0;
  const canClear = value.operations.length > 0;

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
              disabled={tool === 'dimension'}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60 ${
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

      {dimensionOperations.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900">Tabela wymiarów</h4>
            <p className="text-xs text-slate-500">
              Uzupełnij rzeczywiste wartości w centymetrach dla każdej czerwonej linii pomocniczej.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Wymiar
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Rzeczywista długość [cm]
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/70">
                {dimensionOperations.map((operation) => (
                  <tr key={operation.id}>
                    <td className="px-3 py-2 font-medium text-slate-900">#{operation.label}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={operation.measurement}
                          onChange={(event) => handleDimensionMeasurementChange(operation.id, event.target.value)}
                          placeholder="np. 120"
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">cm</span>
                      </div>
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
          {tool === 'text'
            ? 'Kliknij na kratkę, aby dodać tekst.'
            : tool === 'dimension'
              ? 'Kliknij i przeciągnij, aby dodać linię wymiaru, a następnie wpisz wartość w tabeli powyżej.'
              : 'Przeciągnij po kratce, aby narysować element.'}
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
