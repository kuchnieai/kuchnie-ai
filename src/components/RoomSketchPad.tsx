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

type Tool = 'freehand' | 'line' | 'text' | 'dimension' | 'pan';

type ViewportState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type PinchState = {
  initialDistance: number;
  initialScale: number;
  worldMidpoint: { x: number; y: number };
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  initialOffsetX: number;
  initialOffsetY: number;
};

type CanvasMetrics = {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
};

type DrawOperation = Operation | DraftOperation;

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitEnterFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

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
  { value: 'pan', label: 'Łapka', description: 'Przesuwaj widok szkicu.', icon: '🤚' },
  { value: 'text', label: 'Tekst', description: 'Dodaj podpisy lub wymiary.', icon: '🔤' },
];

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const GRID_SPACING = 24;

function sanitizeOffset(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

function normalizeViewport(viewport: ViewportState): ViewportState {
  return {
    scale: clampScale(viewport.scale),
    offsetX: sanitizeOffset(viewport.offsetX),
    offsetY: sanitizeOffset(viewport.offsetY),
  };
}

function sanitizeNormalized(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

function clampScale(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 1;
  }
  if (value < MIN_SCALE) {
    return MIN_SCALE;
  }
  if (value > MAX_SCALE) {
    return MAX_SCALE;
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

function drawGrid(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, viewport: ViewportState): void {
  const { offsetX, offsetY, scale } = viewport;
  const visibleStartX = (-offsetX) / scale;
  const visibleEndX = (metrics.width - offsetX) / scale;
  const visibleStartY = (-offsetY) / scale;
  const visibleEndY = (metrics.height - offsetY) / scale;

  const startX = Math.floor(visibleStartX / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const endX = Math.ceil(visibleEndX / GRID_SPACING) * GRID_SPACING + GRID_SPACING;
  const startY = Math.floor(visibleStartY / GRID_SPACING) * GRID_SPACING - GRID_SPACING;
  const endY = Math.ceil(visibleEndY / GRID_SPACING) * GRID_SPACING + GRID_SPACING;

  ctx.save();
  ctx.lineWidth = 1 / scale;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.beginPath();
  for (let x = startX; x <= endX; x += GRID_SPACING) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += GRID_SPACING) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawAll(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  operations: Operation[],
  draft: DraftOperation | null,
  viewport: ViewportState,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, metrics.pixelWidth, metrics.pixelHeight);
  ctx.restore();

  ctx.save();
  ctx.scale(metrics.dpr, metrics.dpr);
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);
  drawGrid(ctx, metrics, viewport);
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
      points: points.map((point) => ({ x: sanitizeNormalized(point.x), y: sanitizeNormalized(point.y) })),
    };
  }

  if (draft.type === 'dimension') {
    const start = { x: sanitizeNormalized(draft.start.x), y: sanitizeNormalized(draft.start.y) };
    const end = { x: sanitizeNormalized(draft.end.x), y: sanitizeNormalized(draft.end.y) };

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

  const start = { x: sanitizeNormalized(draft.start.x), y: sanitizeNormalized(draft.start.y) };
  const end = { x: sanitizeNormalized(draft.end.x), y: sanitizeNormalized(draft.end.y) };

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

function getNormalizedPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: ViewportState,
): NormalizedPoint {
  const width = rect.width > 0 ? rect.width : 1;
  const height = rect.height > 0 ? rect.height : 1;
  const localX = (clientX - rect.left - viewport.offsetX) / viewport.scale;
  const localY = (clientY - rect.top - viewport.offsetY) / viewport.scale;
  const x = sanitizeNormalized(localX / width);
  const y = sanitizeNormalized(localY / height);
  return { x, y };
}

export default function RoomSketchPad({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef<CanvasMetrics | null>(null);
  const operationsRef = useRef<Operation[]>(value.operations);
  const draftRef = useRef<DraftOperation | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerPositionsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const textPointerRef = useRef<{ pointerId: number; point: NormalizedPoint } | null>(null);

  const [tool, setTool] = useState<Tool>('freehand');
  const [thickness, setThickness] = useState<number>(THICKNESS_PRESETS[1]);
  const [draft, setDraft] = useState<DraftOperation | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewportRef = useRef<ViewportState>(viewport);

  const updateViewport = useCallback((updater: (previous: ViewportState) => ViewportState) => {
    setViewport((previous) => {
      const next = normalizeViewport(updater(previous));
      if (
        Math.abs(previous.scale - next.scale) < 0.001 &&
        Math.abs(previous.offsetX - next.offsetX) < 0.5 &&
        Math.abs(previous.offsetY - next.offsetY) < 0.5
      ) {
        return previous;
      }
      return next;
    });
  }, []);
  const dimensionOperations = useMemo(
    () =>
      value.operations
        .filter(isDimensionOperation)
        .slice()
        .sort((a, b) => a.label - b.label),
    [value.operations],
  );

  const combinedClassName = useMemo(() => {
    const base = isFullscreen
      ? 'box-border flex h-full w-full flex-col gap-4 overflow-hidden rounded-none border border-slate-200 bg-white/95 p-4 shadow-none sm:p-6'
      : '-ml-4 box-border w-[calc(100%_+_2rem)] flex flex-col gap-4 rounded-none border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:box-content sm:ml-0 sm:w-full sm:rounded-3xl sm:p-6';
    return [base, className ?? ''].filter(Boolean).join(' ');
  }, [className, isFullscreen]);

  const handleEnterFullscreen = useCallback(() => {
    const element = rootRef.current as FullscreenElement | null;
    if (!element) {
      return;
    }

    const requestFullscreen =
      element.requestFullscreen?.bind(element) ??
      element.webkitRequestFullscreen?.bind(element) ??
      element.webkitEnterFullscreen?.bind(element);

    if (!requestFullscreen) {
      return;
    }

    try {
      const result = requestFullscreen();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // ignorujemy błędy związane z odmową pełnego ekranu
        });
      }
    } catch {
      // ignorujemy błędy związane z odmową pełnego ekranu
    }
  }, []);

  const handleExitFullscreen = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const doc = document as FullscreenDocument;
    const fullscreenElement = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (!fullscreenElement) {
      return;
    }

    const exitFullscreen =
      document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(doc);

    if (!exitFullscreen) {
      return;
    }

    try {
      const result = exitFullscreen();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // ignorujemy błędy związane z wyjściem z pełnego ekranu
        });
      }
    } catch {
      // ignorujemy błędy związane z wyjściem z pełnego ekranu
    }
  }, []);

  const handleResetViewport = useCallback(() => {
    updateViewport(() => ({ scale: 1, offsetX: 0, offsetY: 0 }));
  }, [updateViewport]);

  const isViewportDefault = useMemo(
    () =>
      Math.abs(viewport.scale - 1) < 0.001 &&
      Math.abs(viewport.offsetX) < 0.5 &&
      Math.abs(viewport.offsetY) < 0.5,
    [viewport],
  );

  const zoomPercentage = useMemo(() => Math.round(viewport.scale * 100), [viewport.scale]);

  const canvasCursor = useMemo(() => {
    if (tool === 'text') {
      return 'text';
    }
    if (tool === 'pan') {
      return isPanningActive ? 'grabbing' : 'grab';
    }
    return 'crosshair';
  }, [isPanningActive, tool]);

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
    drawAll(context, metrics, operationsRef.current, draftRef.current, viewportRef.current);
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
    viewportRef.current = viewport;
    redraw();
  }, [viewport, redraw]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => {};
    }

    const doc = document as FullscreenDocument;

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(fullscreenElement === rootRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  const beginPinch = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const pointers = Array.from(pointerPositionsRef.current.values());
    if (pointers.length < 2) {
      return;
    }
    const [first, second] = pointers;
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance === 0) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const midpointX = (first.clientX + second.clientX) / 2 - rect.left;
    const midpointY = (first.clientY + second.clientY) / 2 - rect.top;
    const currentViewport = viewportRef.current;
    const worldMidpoint = {
      x: (midpointX - currentViewport.offsetX) / currentViewport.scale,
      y: (midpointY - currentViewport.offsetY) / currentViewport.scale,
    };

    pinchStateRef.current = {
      initialDistance: distance,
      initialScale: currentViewport.scale,
      worldMidpoint,
    };
    pointerIdRef.current = null;
    setDraft(null);
    if (panStateRef.current) {
      panStateRef.current = null;
      setIsPanningActive(false);
    }
    textPointerRef.current = null;
  }, [setDraft, setIsPanningActive]);

  const updatePinch = useCallback(() => {
    const pinchState = pinchStateRef.current;
    const container = containerRef.current;
    if (!pinchState || !container) {
      return;
    }
    const pointers = Array.from(pointerPositionsRef.current.values());
    if (pointers.length < 2) {
      return;
    }
    const [first, second] = pointers;
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance === 0) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const midpointX = (first.clientX + second.clientX) / 2 - rect.left;
    const midpointY = (first.clientY + second.clientY) / 2 - rect.top;
    const nextScale = clampScale((distance / pinchState.initialDistance) * pinchState.initialScale);

    updateViewport(() => ({
      scale: nextScale,
      offsetX: midpointX - pinchState.worldMidpoint.x * nextScale,
      offsetY: midpointY - pinchState.worldMidpoint.y * nextScale,
    }));
  }, [updateViewport]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

      if (event.pointerType === 'touch' && pointerPositionsRef.current.size >= 2) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // ignorujemy
        }
        beginPinch();
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (tool === 'text') {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // ignorujemy
        }
        const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);
        textPointerRef.current = { pointerId: event.pointerId, point };
        return;
      }

      if (tool === 'pan') {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // ignorujemy
        }
        panStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          initialOffsetX: viewportRef.current.offsetX,
          initialOffsetY: viewportRef.current.offsetY,
        };
        setIsPanningActive(true);
        return;
      }

      pointerIdRef.current = event.pointerId;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ignorujemy
      }

      const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);

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
    [beginPinch, setIsPanningActive, thickness, tool],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      pointerPositionsRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

      if (pinchStateRef.current) {
        event.preventDefault();
        updatePinch();
        return;
      }

      if (textPointerRef.current?.pointerId === event.pointerId) {
        const rect = canvas.getBoundingClientRect();
        const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);
        textPointerRef.current = { pointerId: event.pointerId, point };
        return;
      }

      const currentPan = panStateRef.current;
      if (currentPan && currentPan.pointerId === event.pointerId) {
        event.preventDefault();
        const deltaX = event.clientX - currentPan.startX;
        const deltaY = event.clientY - currentPan.startY;
        updateViewport((previous) => ({
          scale: previous.scale,
          offsetX: currentPan.initialOffsetX + deltaX,
          offsetY: currentPan.initialOffsetY + deltaY,
        }));
        return;
      }

      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);

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
    },
    [updatePinch, updateViewport],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      pointerPositionsRef.current.delete(event.pointerId);

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // ignorujemy
        }
      }

      if (pinchStateRef.current && pointerPositionsRef.current.size < 2) {
        pinchStateRef.current = null;
      }

      if (textPointerRef.current && textPointerRef.current.pointerId === event.pointerId) {
        const placement = textPointerRef.current;
        textPointerRef.current = null;
        const userInput = window.prompt('Wpisz treść etykiety:', '');
        const text = userInput ? userInput.trim() : '';
        if (text.length > 0) {
          const operation: Operation = {
            id: createOperationId(),
            type: 'text',
            position: placement.point,
            text,
            size: thicknessToFontSize(thickness),
          };
          onChange({ operations: [...operationsRef.current, operation] });
        }
        return;
      }

      if (panStateRef.current && panStateRef.current.pointerId === event.pointerId) {
        panStateRef.current = null;
        setIsPanningActive(false);
        return;
      }

      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      pointerIdRef.current = null;
      commitDraft();
    },
    [commitDraft, onChange, setIsPanningActive, thickness],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      pointerPositionsRef.current.delete(event.pointerId);

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // ignorujemy
        }
      }

      if (pinchStateRef.current && pointerPositionsRef.current.size < 2) {
        pinchStateRef.current = null;
      }

      if (textPointerRef.current && textPointerRef.current.pointerId === event.pointerId) {
        textPointerRef.current = null;
      }

      if (panStateRef.current && panStateRef.current.pointerId === event.pointerId) {
        panStateRef.current = null;
        setIsPanningActive(false);
      }

      if (pointerIdRef.current === event.pointerId) {
        pointerIdRef.current = null;
        setDraft(null);
      }
    },
    [setIsPanningActive],
  );

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
    <div ref={rootRef} className={combinedClassName}>
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
              disabled={tool === 'dimension' || tool === 'pan'}
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
          aria-pressed={isFullscreen}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
            isFullscreen
              ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
              : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
          }`}
        >
          {isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
        </button>
        <button
          type="button"
          onClick={handleResetViewport}
          disabled={isViewportDefault}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50 ${
            isViewportDefault
              ? 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
              : 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
          }`}
        >
          Wyśrodkuj
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Zoom: {zoomPercentage}%
        </span>
      </div>

      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white ${
          isFullscreen
            ? 'flex-1 min-h-0'
            : 'min-h-[280px] max-h-[min(100vh,640px)] sm:min-h-[320px] sm:max-h-none'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ touchAction: 'none', cursor: canvasCursor }}
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
              : tool === 'pan'
                ? 'Przeciągnij, aby przesunąć widok. Przybliżaj dwoma palcami, aby zmienić powiększenie.'
                : 'Przeciągnij po kratce, aby narysować element. Przybliżaj dwoma palcami, aby dopracować szczegóły.'}
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
