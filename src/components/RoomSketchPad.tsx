'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export type NormalizedPoint = { x: number; y: number };

export type DimensionDetailField = 'width' | 'height' | 'floorLevel' | 'depth' | 'wallOffset';

export type DimensionDetailType = 'window' | 'radiator' | 'water' | 'powerCable' | 'socket' | 'ventilation';

export type DimensionDetail = {
  id: string;
  type: DimensionDetailType;
  values: Partial<Record<DimensionDetailField, string>>;
};

export type DimensionOperation = {
  id: string;
  type: 'dimension';
  start: NormalizedPoint;
  end: NormalizedPoint;
  label: number;
  measurement: string;
  details: DimensionDetail[];
};

export type Operation =
  | { id: string; type: 'freehand'; thickness: number; points: NormalizedPoint[] }
  | { id: string; type: 'line'; thickness: number; start: NormalizedPoint; end: NormalizedPoint }
  | { id: string; type: 'text'; position: NormalizedPoint; text: string; size: number }
  | DimensionOperation;
export type RoomSketchValue = { operations: Operation[] };

export type DimensionDetailDefinition = {
  type: DimensionDetailType;
  label: string;
  fields: { name: DimensionDetailField; label: string }[];
};

export const DIMENSION_DETAIL_DEFINITIONS: DimensionDetailDefinition[] = [
  {
    type: 'window',
    label: 'Okno',
    fields: [
      { name: 'width', label: 'Szerokość' },
      { name: 'height', label: 'Wysokość' },
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'depth', label: 'Głębokość' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
  {
    type: 'radiator',
    label: 'Grzejnik',
    fields: [
      { name: 'width', label: 'Szerokość' },
      { name: 'height', label: 'Wysokość' },
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'depth', label: 'Głębokość' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
  {
    type: 'water',
    label: 'Woda',
    fields: [
      { name: 'width', label: 'Szerokość' },
      { name: 'height', label: 'Wysokość' },
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'depth', label: 'Głębokość' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
  {
    type: 'powerCable',
    label: 'Prąd (kabel)',
    fields: [
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
  {
    type: 'socket',
    label: 'Gniazdko',
    fields: [
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
  {
    type: 'ventilation',
    label: 'Wentylacja',
    fields: [
      { name: 'width', label: 'Szerokość' },
      { name: 'height', label: 'Wysokość' },
      { name: 'floorLevel', label: 'Poziom od podłogi z płytką' },
      { name: 'depth', label: 'Głębokość' },
      { name: 'wallOffset', label: 'Wymiar od lewej/prawej ściany' },
    ],
  },
];

const DIMENSION_DETAIL_DEFINITION_MAP: Record<DimensionDetailType, DimensionDetailDefinition> =
  DIMENSION_DETAIL_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.type] = definition;
    return acc;
  }, {} as Record<DimensionDetailType, DimensionDetailDefinition>);

type DraftOperation =
  | { type: 'freehand'; thickness: number; points: NormalizedPoint[] }
  | { type: 'line'; thickness: number; start: NormalizedPoint; end: NormalizedPoint }
  | { type: 'dimension'; label: number; start: NormalizedPoint; end: NormalizedPoint };

type Tool = 'select' | 'freehand' | 'line' | 'text' | 'dimension' | 'pan';

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

type DragState = {
  pointerId: number;
  operationId: string;
  origin: Operation;
  startPoint: NormalizedPoint;
  hasMoved: boolean;
};

type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type Props = {
  value: RoomSketchValue;
  onChange: (next: RoomSketchValue) => void;
  className?: string;
};

export type RoomSketchPadProps = Props;

const DEFAULT_THICKNESS = 4;
const PRIMARY_STROKE_COLOR = '#0f172a';
const DIMENSION_STROKE_COLOR = '#ef4444';
const DIMENSION_LINE_WIDTH = 2;
const DIMENSION_LABEL_FONT_SIZE = 16;
const HIT_TEST_THRESHOLD_PX = 12;

function isDimensionOperation(operation: Operation): operation is DimensionOperation {
  return operation.type === 'dimension';
}

const SELECT_TOOL_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.586 12.586 19 19" />
    <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z" />
  </svg>
);

const TOOL_CONFIG: { value: Tool; label: string; description: string; icon: ReactNode }[] = [
  {
    value: 'select',
    label: 'Zaznacz',
    description: 'Wybierz element, aby go przesunąć lub usunąć.',
    icon: SELECT_TOOL_ICON,
  },
  { value: 'freehand', label: 'Odręczny', description: 'Rysuj swobodnie palcem lub myszą.', icon: '✏️' },
  { value: 'line', label: 'Linia', description: 'Rysuj proste odcinki.', icon: '📐' },
  {
    value: 'dimension',
    label: 'Wymiary',
    description: 'Dodaj linie pomocnicze z numeracją.',
    icon: '📏',
  },
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
  options?: { isDraft?: boolean; isSelected?: boolean },
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

    if (options?.isSelected) {
      ctx.beginPath();
      ctx.lineWidth = operation.thickness + 6;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.moveTo(firstX, firstY);
      for (let index = 1; index < denormalized.length; index += 1) {
        const point = denormalized[index];
        ctx.lineTo(point.x, point.y);
      }
      if (denormalized.length === 1) {
        ctx.lineTo(firstX, firstY);
      }
      ctx.stroke();
    }

    ctx.lineWidth = operation.thickness;
    ctx.strokeStyle = options?.isSelected ? '#0284c7' : PRIMARY_STROKE_COLOR;
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

    if (options?.isSelected) {
      ctx.beginPath();
      ctx.lineWidth = operation.thickness + 6;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.lineWidth = operation.thickness;
    ctx.strokeStyle = options?.isSelected ? '#0284c7' : PRIMARY_STROKE_COLOR;
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
    if (options?.isSelected) {
      ctx.beginPath();
      ctx.lineWidth = DIMENSION_LINE_WIDTH + 6;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.lineWidth = DIMENSION_LINE_WIDTH;
    ctx.strokeStyle = options?.isSelected ? '#0284c7' : DIMENSION_STROKE_COLOR;
    ctx.globalAlpha = options?.isDraft ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const label = `Ściana ${operation.label}`;
    ctx.font = `${DIMENSION_LABEL_FONT_SIZE}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padding = 4;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width + padding * 2;
    const textHeight = DIMENSION_LABEL_FONT_SIZE + padding * 2;

    ctx.fillStyle = options?.isSelected ? 'rgba(224, 242, 254, 0.95)' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(centerX - textWidth / 2, centerY - textHeight / 2, textWidth, textHeight);

    ctx.fillStyle = options?.isSelected ? '#0369a1' : DIMENSION_STROKE_COLOR;
    ctx.fillText(label, centerX, centerY);
    ctx.restore();
    return;
  }

  const position = denormalizePoint(operation.position, metrics);
  ctx.save();
  const padding = 4;
  const text = operation.text;
  ctx.font = `${operation.size}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.textBaseline = 'top';
  if (options?.isSelected) {
    const metricsText = ctx.measureText(text);
    const textWidth = metricsText.width + padding * 2;
    const textHeight = operation.size + padding * 2;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.95)';
    ctx.fillRect(position.x - padding, position.y - padding, textWidth, textHeight);
  }
  ctx.fillStyle = options?.isSelected ? '#0284c7' : PRIMARY_STROKE_COLOR;
  ctx.globalAlpha = options?.isDraft ? 0.7 : 1;
  ctx.fillText(text, position.x, position.y);
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
  selectedOperationId: string | null,
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
    drawOperation(ctx, metrics, operation, { isSelected: operation.id === selectedOperationId });
  });
  if (draft) {
    drawOperation(ctx, metrics, draft, { isDraft: true });
  }
  ctx.restore();
}

function cloneOperation(operation: Operation): Operation {
  if (operation.type === 'freehand') {
    return { ...operation, points: operation.points.map((point) => ({ ...point })) };
  }

  if (operation.type === 'line') {
    return {
      ...operation,
      start: { ...operation.start },
      end: { ...operation.end },
    };
  }

  if (operation.type === 'dimension') {
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
}

function translateNormalizedPoint(
  point: NormalizedPoint,
  deltaX: number,
  deltaY: number,
): NormalizedPoint {
  return {
    x: sanitizeNormalized(point.x + deltaX),
    y: sanitizeNormalized(point.y + deltaY),
  };
}

function translateOperation(operation: Operation, deltaX: number, deltaY: number): Operation {
  if (operation.type === 'freehand') {
    return {
      ...operation,
      points: operation.points.map((point) => translateNormalizedPoint(point, deltaX, deltaY)),
    };
  }

  if (operation.type === 'line') {
    return {
      ...operation,
      start: translateNormalizedPoint(operation.start, deltaX, deltaY),
      end: translateNormalizedPoint(operation.end, deltaX, deltaY),
    };
  }

  if (operation.type === 'dimension') {
    return {
      ...operation,
      start: translateNormalizedPoint(operation.start, deltaX, deltaY),
      end: translateNormalizedPoint(operation.end, deltaX, deltaY),
    };
  }

  return {
    ...operation,
    position: translateNormalizedPoint(operation.position, deltaX, deltaY),
  };
}

function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const closestX = x1 + clamped * dx;
  const closestY = y1 + clamped * dy;
  return Math.hypot(px - closestX, py - closestY);
}

function isPointNearFreehand(
  point: { x: number; y: number },
  operation: Extract<Operation, { type: 'freehand' }>,
  metrics: CanvasMetrics,
): boolean {
  if (operation.points.length === 0) {
    return false;
  }

  const denormalized = operation.points.map((segmentPoint) => ({
    x: segmentPoint.x * metrics.width,
    y: segmentPoint.y * metrics.height,
  }));

  if (denormalized.length === 1) {
    const [{ x, y }] = denormalized;
    return Math.hypot(point.x - x, point.y - y) <= HIT_TEST_THRESHOLD_PX;
  }

  for (let index = 0; index < denormalized.length - 1; index += 1) {
    const start = denormalized[index];
    const end = denormalized[index + 1];
    const distance = distancePointToSegment(point.x, point.y, start.x, start.y, end.x, end.y);
    if (distance <= HIT_TEST_THRESHOLD_PX) {
      return true;
    }
  }

  return false;
}

function isPointNearLine(
  point: { x: number; y: number },
  operation: Extract<Operation, { type: 'line' | 'dimension' }>,
  metrics: CanvasMetrics,
): boolean {
  const start = { x: operation.start.x * metrics.width, y: operation.start.y * metrics.height };
  const end = { x: operation.end.x * metrics.width, y: operation.end.y * metrics.height };
  const distance = distancePointToSegment(point.x, point.y, start.x, start.y, end.x, end.y);
  return distance <= HIT_TEST_THRESHOLD_PX;
}

function isPointNearText(
  point: { x: number; y: number },
  operation: Extract<Operation, { type: 'text' }>,
  metrics: CanvasMetrics,
): boolean {
  const originX = operation.position.x * metrics.width;
  const originY = operation.position.y * metrics.height;
  const textHeight = operation.size;
  const approximateWidth = Math.max(operation.text.length * (operation.size * 0.6), textHeight);
  const padding = 6;

  const minX = originX - padding;
  const maxX = originX + approximateWidth + padding;
  const minY = originY - padding;
  const maxY = originY + textHeight + padding;

  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

function getOperationBoundingBox(operation: Operation, metrics: CanvasMetrics): BoundingBox | null {
  if (operation.type === 'freehand') {
    const points = operation.points;
    if (points.length === 0) {
      return null;
    }

    let minX = points[0]!.x * metrics.width;
    let maxX = minX;
    let minY = points[0]!.y * metrics.height;
    let maxY = minY;

    for (let index = 1; index < points.length; index += 1) {
      const point = points[index]!;
      const px = point.x * metrics.width;
      const py = point.y * metrics.height;
      if (px < minX) {
        minX = px;
      }
      if (px > maxX) {
        maxX = px;
      }
      if (py < minY) {
        minY = py;
      }
      if (py > maxY) {
        maxY = py;
      }
    }

    const padding = Math.max(operation.thickness, 8);
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }

  if (operation.type === 'line') {
    const startX = operation.start.x * metrics.width;
    const startY = operation.start.y * metrics.height;
    const endX = operation.end.x * metrics.width;
    const endY = operation.end.y * metrics.height;
    const padding = Math.max(operation.thickness / 2, 6);
    return {
      minX: Math.min(startX, endX) - padding,
      minY: Math.min(startY, endY) - padding,
      maxX: Math.max(startX, endX) + padding,
      maxY: Math.max(startY, endY) + padding,
    };
  }

  if (operation.type === 'dimension') {
    const startX = operation.start.x * metrics.width;
    const startY = operation.start.y * metrics.height;
    const endX = operation.end.x * metrics.width;
    const endY = operation.end.y * metrics.height;
    const padding = 8;
    let minX = Math.min(startX, endX) - padding;
    let maxX = Math.max(startX, endX) + padding;
    let minY = Math.min(startY, endY) - padding;
    let maxY = Math.max(startY, endY) + padding;

    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const label = `${operation.label}`;
    const approximateWidth = Math.max(label.length * (DIMENSION_LABEL_FONT_SIZE * 0.6), DIMENSION_LABEL_FONT_SIZE);
    const halfLabelWidth = (approximateWidth + padding * 2) / 2;
    const halfLabelHeight = (DIMENSION_LABEL_FONT_SIZE + padding * 2) / 2;

    minX = Math.min(minX, centerX - halfLabelWidth);
    maxX = Math.max(maxX, centerX + halfLabelWidth);
    minY = Math.min(minY, centerY - halfLabelHeight);
    maxY = Math.max(maxY, centerY + halfLabelHeight);

    return { minX, minY, maxX, maxY };
  }

  const originX = operation.position.x * metrics.width;
  const originY = operation.position.y * metrics.height;
  const textHeight = operation.size;
  const approximateWidth = Math.max(operation.text.length * (operation.size * 0.6), textHeight);
  const padding = 6;

  return {
    minX: originX - padding,
    minY: originY - padding,
    maxX: originX + approximateWidth + padding,
    maxY: originY + textHeight + padding,
  };
}

function isPointNearOperation(point: NormalizedPoint, operation: Operation, metrics: CanvasMetrics): boolean {
  const px = point.x * metrics.width;
  const py = point.y * metrics.height;

  if (operation.type === 'freehand') {
    return isPointNearFreehand({ x: px, y: py }, operation, metrics);
  }

  if (operation.type === 'line') {
    return isPointNearLine({ x: px, y: py }, operation, metrics);
  }

  if (operation.type === 'dimension') {
    if (isPointNearLine({ x: px, y: py }, operation, metrics)) {
      return true;
    }
    const start = { x: operation.start.x * metrics.width, y: operation.start.y * metrics.height };
    const end = { x: operation.end.x * metrics.width, y: operation.end.y * metrics.height };
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const padding = 4;
    const label = `Ściana ${operation.label}`;
    const approximateWidth = Math.max(label.length * (DIMENSION_LABEL_FONT_SIZE * 0.6), DIMENSION_LABEL_FONT_SIZE);
    const halfWidth = (approximateWidth + padding * 2) / 2;
    const halfHeight = (DIMENSION_LABEL_FONT_SIZE + padding * 2) / 2;
    return px >= centerX - halfWidth && px <= centerX + halfWidth && py >= centerY - halfHeight && py <= centerY + halfHeight;
  }

  return isPointNearText({ x: px, y: py }, operation, metrics);
}

function findOperationAtPoint(
  point: NormalizedPoint,
  operations: Operation[],
  metrics: CanvasMetrics,
): Operation | null {
  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const operation = operations[index];
    if (isPointNearOperation(point, operation, metrics)) {
      return operation;
    }
  }
  return null;
}

function renumberDimensionOperations(operations: Operation[]): Operation[] {
  let nextLabel = 1;

  return operations.map((operation) => {
    if (operation.type !== 'dimension') {
      return operation;
    }

    if (operation.label === nextLabel) {
      nextLabel += 1;
      return operation;
    }

    const updatedOperation = { ...operation, label: nextLabel };
    nextLabel += 1;
    return updatedOperation;
  });
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
      details: [],
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef<CanvasMetrics | null>(null);
  const operationsRef = useRef<Operation[]>(value.operations);
  const draftRef = useRef<DraftOperation | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerPositionsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const textPointerRef = useRef<{ pointerId: number; point: NormalizedPoint } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const selectedOperationIdRef = useRef<string | null>(null);
  const redoStackRef = useRef<Operation[]>([]);
  const lastAppliedOperationsRef = useRef<Operation[] | null>(null);

  const [tool, setTool] = useState<Tool>('freehand');
  const thickness = DEFAULT_THICKNESS;
  const [draft, setDraft] = useState<DraftOperation | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [detailPickerForOperationId, setDetailPickerForOperationId] = useState<string | null>(null);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState<{ left: number; top: number } | null>(null);
  const viewportRef = useRef<ViewportState>(viewport);

  const updateDeleteButtonPosition = useCallback(() => {
    if (!selectedOperationId) {
      setDeleteButtonPosition((previous) => (previous ? null : previous));
      return;
    }

    const metrics = metricsRef.current;
    const container = containerRef.current;
    if (!metrics || !container) {
      setDeleteButtonPosition((previous) => (previous ? null : previous));
      return;
    }

    const operations = operationsRef.current;
    const operation = operations.find((item) => item.id === selectedOperationId);
    if (!operation) {
      setDeleteButtonPosition((previous) => (previous ? null : previous));
      return;
    }

    const boundingBox = getOperationBoundingBox(operation, metrics);
    if (!boundingBox) {
      setDeleteButtonPosition((previous) => (previous ? null : previous));
      return;
    }

    const centerX = (boundingBox.minX + boundingBox.maxX) / 2;
    const bottomY = boundingBox.maxY;
    const screenX = viewport.offsetX + centerX * viewport.scale;
    const screenY = viewport.offsetY + bottomY * viewport.scale;
    const margin = 12;
    const buttonSize = 40;
    const halfButton = buttonSize / 2;
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : metrics.width;
    const containerHeight = container.clientHeight > 0 ? container.clientHeight : metrics.height;
    const maxLeft = containerWidth - halfButton;
    const maxTop = containerHeight - halfButton;
    const constrainedLeft = Math.min(Math.max(screenX, halfButton), maxLeft > halfButton ? maxLeft : Math.max(containerWidth / 2, halfButton));
    const desiredTop = screenY + margin;
    const constrainedTop = Math.min(
      Math.max(desiredTop, halfButton),
      maxTop > halfButton ? maxTop : Math.max(containerHeight / 2, halfButton),
    );

    setDeleteButtonPosition((previous) => {
      if (previous && Math.abs(previous.left - constrainedLeft) < 0.5 && Math.abs(previous.top - constrainedTop) < 0.5) {
        return previous;
      }
      return { left: constrainedLeft, top: constrainedTop };
    });
  }, [selectedOperationId, viewport]);

  const applyOperations = useCallback(
    (updater: (operations: Operation[]) => Operation[], options: { preserveRedo?: boolean } = {}) => {
      const updatedOperations = updater(operationsRef.current);
      const nextOperations = renumberDimensionOperations(updatedOperations);
      operationsRef.current = nextOperations;
      lastAppliedOperationsRef.current = nextOperations;
      if (!options.preserveRedo) {
        if (redoStackRef.current.length > 0) {
          redoStackRef.current = [];
        }
      }
      const canvas = canvasRef.current;
      const metrics = metricsRef.current;
      if (canvas && metrics) {
        const context = canvas.getContext('2d');
        if (context) {
          drawAll(
            context,
            metrics,
            nextOperations,
            draftRef.current,
            viewportRef.current,
            selectedOperationIdRef.current,
          );
        }
      }
      onChange({ operations: nextOperations });
      updateDeleteButtonPosition();
    },
    [onChange, updateDeleteButtonPosition],
  );

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
    const base =
      '-ml-4 box-border w-[calc(100%_+_2rem)] flex flex-col gap-4 rounded-none border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:box-content sm:ml-0 sm:w-full sm:rounded-3xl sm:p-6';
    return [base, className ?? ''].filter(Boolean).join(' ');
  }, [className]);

  const getToolButtonClassName = useCallback(
    (isActive: boolean) =>
      `flex h-10 w-10 items-center justify-center rounded-full border text-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
        isActive
          ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-[0_10px_30px_-18px_rgba(14,116,144,0.6)]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
      }`,
    [],
  );
  const canvasContainerClassName =
    'relative w-full overflow-hidden bg-white transition-[border-radius] rounded-2xl border border-slate-200 shadow-sm min-h-[calc(350px*1.25)] max-h-[min(125vh,1000px)] sm:min-h-[400px] sm:max-h-none';

  const zoomPercentage = useMemo(() => Math.round(viewport.scale * 100), [viewport.scale]);

  const canvasCursor = useMemo(() => {
    if (tool === 'text') {
      return 'text';
    }
    if (tool === 'select') {
      return 'pointer';
    }
    if (tool === 'pan') {
      return isPanningActive ? 'grabbing' : 'grab';
    }
    return 'crosshair';
  }, [isPanningActive, tool]);

  const handleDimensionMeasurementChange = useCallback(
    (id: string, measurement: string) => {
      applyOperations((operations) =>
        operations.map((operation) =>
          operation.type === 'dimension' && operation.id === id
            ? { ...operation, measurement }
            : operation,
        ),
      );
    },
    [applyOperations],
  );

  const handleToggleDetailPicker = useCallback((operationId: string) => {
    setDetailPickerForOperationId((previous) => (previous === operationId ? null : operationId));
  }, []);

  const handleAddDimensionDetail = useCallback(
    (operationId: string, detailType: DimensionDetailType) => {
      const definition = DIMENSION_DETAIL_DEFINITION_MAP[detailType];
      if (!definition) {
        return;
      }

      applyOperations((operations) =>
        operations.map((operation) => {
          if (operation.type !== 'dimension' || operation.id !== operationId) {
            return operation;
          }

          const detailValues: Partial<Record<DimensionDetailField, string>> = {};
          definition.fields.forEach((field) => {
            detailValues[field.name] = '';
          });

          const detail: DimensionDetail = {
            id: createOperationId(),
            type: detailType,
            values: detailValues,
          };

          return { ...operation, details: [...operation.details, detail] };
        }),
      );

      setDetailPickerForOperationId(null);
    },
    [applyOperations],
  );

  const handleRemoveDimensionDetail = useCallback(
    (operationId: string, detailId: string) => {
      applyOperations((operations) =>
        operations.map((operation) => {
          if (operation.type !== 'dimension' || operation.id !== operationId) {
            return operation;
          }

          const nextDetails = operation.details.filter((detail) => detail.id !== detailId);
          if (nextDetails.length === operation.details.length) {
            return operation;
          }

          return { ...operation, details: nextDetails };
        }),
      );
    },
    [applyOperations],
  );

  const handleDimensionDetailFieldChange = useCallback(
    (operationId: string, detailId: string, fieldName: DimensionDetailField, fieldValue: string) => {
      applyOperations((operations) =>
        operations.map((operation) => {
          if (operation.type !== 'dimension' || operation.id !== operationId) {
            return operation;
          }

          let hasChanged = false;
          const nextDetails = operation.details.map((detail) => {
            if (detail.id !== detailId) {
              return detail;
            }

            const definition = DIMENSION_DETAIL_DEFINITION_MAP[detail.type];
            if (!definition || !definition.fields.some((field) => field.name === fieldName)) {
              return detail;
            }

            const currentValue = detail.values[fieldName] ?? '';
            if (currentValue === fieldValue) {
              return detail;
            }

            hasChanged = true;
            return {
              ...detail,
              values: { ...detail.values, [fieldName]: fieldValue },
            };
          });

          if (!hasChanged) {
            return operation;
          }

          return { ...operation, details: nextDetails };
        }),
      );
    },
    [applyOperations],
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
    drawAll(
      context,
      metrics,
      operationsRef.current,
      draftRef.current,
      viewportRef.current,
      selectedOperationIdRef.current,
    );
  }, []);

  useEffect(() => {
    operationsRef.current = value.operations;
    redraw();
    if (lastAppliedOperationsRef.current !== value.operations) {
      if (redoStackRef.current.length > 0) {
        redoStackRef.current = [];
      }
    }
    lastAppliedOperationsRef.current = value.operations;
    updateDeleteButtonPosition();
  }, [redraw, updateDeleteButtonPosition, value.operations]);

  useEffect(() => {
    draftRef.current = draft;
    redraw();
  }, [draft, redraw]);

  useEffect(() => {
    viewportRef.current = viewport;
    redraw();
  }, [viewport, redraw]);

  useEffect(() => {
    selectedOperationIdRef.current = selectedOperationId;
    redraw();
  }, [selectedOperationId, redraw]);

  useEffect(() => {
    updateDeleteButtonPosition();
  }, [updateDeleteButtonPosition]);

  useEffect(() => {
    if (selectedOperationId && !value.operations.some((operation) => operation.id === selectedOperationId)) {
      setSelectedOperationId(null);
    }
  }, [selectedOperationId, value.operations]);

  useEffect(() => {
    if (detailPickerForOperationId && !value.operations.some((operation) => operation.id === detailPickerForOperationId)) {
      setDetailPickerForOperationId(null);
    }
  }, [detailPickerForOperationId, value.operations]);

  useEffect(() => {
    if (tool !== 'select') {
      setSelectedOperationId(null);
      dragStateRef.current = null;
    }
  }, [tool]);

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
      updateDeleteButtonPosition();
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
  }, [redraw, updateDeleteButtonPosition]);

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

    applyOperations((operations) => [...operations, operation]);
  }, [applyOperations]);

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
    dragStateRef.current = null;
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

      if (tool === 'select') {
        const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);
        const metrics = metricsRef.current;
        dragStateRef.current = null;

        if (!metrics) {
          setSelectedOperationId(null);
          return;
        }

        const operation = findOperationAtPoint(point, operationsRef.current, metrics);
        setSelectedOperationId(operation ? operation.id : null);

        if (operation) {
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignorujemy
          }
          dragStateRef.current = {
            pointerId: event.pointerId,
            operationId: operation.id,
            origin: cloneOperation(operation),
            startPoint: point,
            hasMoved: false,
          };
        }
        return;
      }

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

      if (tool === 'select') {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const point = getNormalizedPoint(event.clientX, event.clientY, rect, viewportRef.current);
        const deltaX = point.x - dragState.startPoint.x;
        const deltaY = point.y - dragState.startPoint.y;

        if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
          return;
        }

        event.preventDefault();
        const translatedOperation = translateOperation(dragState.origin, deltaX, deltaY);
        operationsRef.current = operationsRef.current.map((operation) =>
          operation.id === dragState.operationId ? translatedOperation : operation,
        );
        dragStateRef.current = { ...dragState, hasMoved: true };
        redraw();
        updateDeleteButtonPosition();
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
    [redraw, tool, updateDeleteButtonPosition, updatePinch, updateViewport],
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
          applyOperations((operations) => [...operations, operation]);
        }
        return;
      }

      if (panStateRef.current && panStateRef.current.pointerId === event.pointerId) {
        panStateRef.current = null;
        setIsPanningActive(false);
        return;
      }

      const dragState = dragStateRef.current;
      if (dragState && dragState.pointerId === event.pointerId) {
        dragStateRef.current = null;
        if (tool === 'select' && dragState.hasMoved) {
          applyOperations((operations) => operations);
        }
        return;
      }

      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      pointerIdRef.current = null;
      commitDraft();
    },
    [applyOperations, commitDraft, setIsPanningActive, thickness, tool],
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

      const dragState = dragStateRef.current;
      if (dragState && dragState.pointerId === event.pointerId) {
        if (dragState.hasMoved) {
          operationsRef.current = operationsRef.current.map((operation) =>
            operation.id === dragState.operationId ? dragState.origin : operation,
          );
          redraw();
          updateDeleteButtonPosition();
        }
        dragStateRef.current = null;
      }

      if (pointerIdRef.current === event.pointerId) {
        pointerIdRef.current = null;
        setDraft(null);
      }
    },
    [redraw, setIsPanningActive, updateDeleteButtonPosition],
  );

  const handleUndo = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }

    const operationToUndo = operationsRef.current[operationsRef.current.length - 1]!;
    redoStackRef.current = [...redoStackRef.current, operationToUndo];

    applyOperations((operations) => operations.slice(0, -1), { preserveRedo: true });
  }, [applyOperations]);

  const handleClear = useCallback(() => {
    if (operationsRef.current.length === 0) {
      return;
    }
    applyOperations(() => []);
    setSelectedOperationId(null);
    dragStateRef.current = null;
  }, [applyOperations]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedOperationId) {
      return;
    }
    const idToDelete = selectedOperationId;
    applyOperations((operations) => operations.filter((operation) => operation.id !== idToDelete));
    setSelectedOperationId(null);
    dragStateRef.current = null;
  }, [applyOperations, selectedOperationId]);

  const canUndo = value.operations.length > 0;
  const canClear = value.operations.length > 0;
  const canDeleteSelected = Boolean(selectedOperationId);

  return (
    <div className={combinedClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Szkic pomieszczenia</h3>
          <p className="text-sm text-slate-600">
            Wybierz narzędzie i rysuj po kratce. Wszystko zapisuje się lokalnie na tym urządzeniu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex flex-wrap gap-2">
            {TOOL_CONFIG.map((toolOption) => {
              const isActive = toolOption.value === tool;
              return (
                <button
                  key={toolOption.value}
                  type="button"
                  onClick={() => setTool(toolOption.value)}
                  aria-pressed={isActive}
                  aria-label={toolOption.label}
                  className={getToolButtonClassName(isActive)}
                  title={toolOption.description}
                >
                  <span aria-hidden>{toolOption.icon}</span>
                  <span className="sr-only">{toolOption.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleClear}
              disabled={!canClear}
              aria-label="Wyczyść szkic"
              title="Wyczyść szkic"
              className={`${getToolButtonClassName(false)} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span aria-hidden>🗑️</span>
              <span className="sr-only">Wyczyść szkic</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Cofnij ostatni krok"
              title="Cofnij ostatni krok"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>↩️</span>
              <span className="sr-only">Cofnij</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className={canvasContainerClassName}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ touchAction: 'none', cursor: canvasCursor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />
        {canDeleteSelected && deleteButtonPosition && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            aria-label="Usuń zaznaczony element"
            title="Usuń zaznaczony element"
            className="pointer-events-auto absolute z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-rose-200 bg-white text-xl text-rose-600 shadow-[0_10px_30px_-18px_rgba(225,29,72,0.6)] transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            style={{ left: `${deleteButtonPosition.left}px`, top: `${deleteButtonPosition.top}px` }}
          >
            <span aria-hidden>🗑️</span>
            <span className="sr-only">Usuń zaznaczony element</span>
          </button>
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
          <span aria-hidden>Zoom: {zoomPercentage}%</span>
          <span className="sr-only">Aktualny poziom powiększenia: {zoomPercentage} procent</span>
        </div>
        <div
          aria-hidden
          className="pointer-events-auto absolute right-0 top-0 h-full w-5 border-l border-slate-200/70 touch-pan-y bg-gradient-to-l from-white via-white/70 to-transparent sm:w-6"
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
                {dimensionOperations.map((operation) => {
                  const isSelected = operation.id === selectedOperationId;
                  const details = operation.details ?? [];
                  const isPickerOpen = detailPickerForOperationId === operation.id;
                  return (
                    <Fragment key={operation.id}>
                      <tr className={isSelected ? 'bg-sky-50/70' : undefined} aria-selected={isSelected}>
                        <td className="px-3 py-2 font-medium text-slate-900">Ściana {operation.label}</td>
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
                      <tr className={isSelected ? 'bg-sky-50/40' : 'bg-slate-50/40'}>
                        <td colSpan={2} className="px-3 pb-3 pt-0">
                          <div className="space-y-3 rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleDetailPicker(operation.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                                aria-expanded={isPickerOpen}
                                aria-label={`Dodaj element do wymiaru Ściana ${operation.label}`}
                              >
                                <span aria-hidden>＋</span>
                              </button>
                              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Dodaj element do tego wymiaru
                              </span>
                            </div>

                            {isPickerOpen && (
                              <div className="flex flex-wrap gap-2">
                                {DIMENSION_DETAIL_DEFINITIONS.map((definition) => (
                                  <button
                                    key={definition.type}
                                    type="button"
                                    onClick={() => handleAddDimensionDetail(operation.id, definition.type)}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                                  >
                                    {definition.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            {details.length > 0 && (
                              <div className="space-y-3">
                                {details.map((detail) => {
                                  const definition = DIMENSION_DETAIL_DEFINITION_MAP[detail.type];
                                  if (!definition) {
                                    return null;
                                  }

                                  return (
                                    <div
                                      key={detail.id}
                                      className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                          {definition.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDimensionDetail(operation.id, detail.id)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                                          aria-label={`Usuń element ${definition.label}`}
                                        >
                                          <span aria-hidden>✕</span>
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {definition.fields.map((field) => (
                                          <label
                                            key={field.name}
                                            className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500"
                                          >
                                            <span>{field.label}</span>
                                            <input
                                              type="text"
                                              value={detail.values[field.name] ?? ''}
                                              onChange={(event) =>
                                                handleDimensionDetailFieldChange(
                                                  operation.id,
                                                  detail.id,
                                                  field.name,
                                                  event.target.value,
                                                )
                                              }
                                              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                              placeholder="np. 120"
                                            />
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {tool === 'select'
            ? 'Kliknij element, aby go zaznaczyć. Przeciągnij, aby zmienić jego położenie lub skorzystaj z czerwonego przycisku kosza obok zaznaczenia.'
            : tool === 'dimension'
              ? 'Kliknij i przeciągnij, aby dodać linię wymiaru, a następnie wpisz wartość w tabeli powyżej.'
              : 'Przeciągnij po kratce, aby narysować element. Przybliżaj dwoma palcami, aby dopracować szczegóły.'}
        </div>
      </div>
    </div>
  );
}
