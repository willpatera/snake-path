import type { Vec2 } from './types';

export const TAU = Math.PI * 2;

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dist(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function normalize(v: Vec2): Vec2 {
  const l = length(v);
  if (l < 1e-12) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function headingVec(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function normalizeAngle(a: number): number {
  let r = a % TAU;
  if (r < 0) r += TAU;
  return r;
}

export function angleDiff(a: number, b: number): number {
  let d = normalizeAngle(b - a);
  if (d > Math.PI) d -= TAU;
  return d;
}

/** Clamp value to [min, max] */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Check if angle `a` is within the angular arc from `start` going `sweep` radians.
 * `sweep` can be positive (CCW) or negative (CW).
 */
export function isAngleInArc(a: number, start: number, sweep: number): boolean {
  const na = normalizeAngle(a - start);
  if (sweep >= 0) {
    return na <= sweep + 1e-9;
  } else {
    // Negative sweep means clockwise
    const ns = normalizeAngle(-sweep);
    const ra = normalizeAngle(start - a);
    return ra <= ns + 1e-9;
  }
}

/**
 * Find intersection points of two circles.
 * Returns 0, 1, or 2 points.
 */
export function circleCircleIntersections(
  c1: Vec2, r1: number,
  c2: Vec2, r2: number,
): Vec2[] {
  const d = dist(c1, c2);
  if (d > r1 + r2 + 1e-9) return [];
  if (d < Math.abs(r1 - r2) - 1e-9) return [];
  if (d < 1e-9) return [];

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq < 0) return [];
  const h = Math.sqrt(Math.max(0, hSq));

  const px = c1.x + a * (c2.x - c1.x) / d;
  const py = c1.y + a * (c2.y - c1.y) / d;

  if (h < 1e-9) {
    return [{ x: px, y: py }];
  }

  const dx = h * (c2.y - c1.y) / d;
  const dy = h * (c2.x - c1.x) / d;

  return [
    { x: px + dx, y: py - dy },
    { x: px - dx, y: py + dy },
  ];
}

/**
 * Compute the angular sweep from startAngle to endAngle for an arc.
 * If clockwise, sweep is negative.
 */
export function arcSweep(startAngle: number, endAngle: number, clockwise: boolean): number {
  if (clockwise) {
    let s = normalizeAngle(startAngle - endAngle);
    if (s < 1e-9) s = TAU;
    return -s;
  } else {
    let s = normalizeAngle(endAngle - startAngle);
    if (s < 1e-9) s = TAU;
    return s;
  }
}

/**
 * Distance from a point to the nearest point on a polyline (given as samples).
 */
export function pointToPolylineDist(p: Vec2, samples: Vec2[]): number {
  let minD = Infinity;
  for (let i = 0; i < samples.length - 1; i++) {
    minD = Math.min(minD, pointToSegmentDist(p, samples[i], samples[i + 1]));
  }
  if (samples.length === 1) {
    minD = dist(p, samples[0]);
  }
  return minD;
}

/** Distance from point to line segment */
export function pointToSegmentDist(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const ap = sub(p, a);
  const t = clamp(dot(ap, ab) / (dot(ab, ab) || 1e-12), 0, 1);
  const proj = add(a, scale(ab, t));
  return dist(p, proj);
}

/**
 * Minimum distance between two polylines (sample-based).
 */
export function polylinePolylineDist(a: Vec2[], b: Vec2[]): number {
  let minD = Infinity;
  for (const p of a) {
    for (const q of b) {
      const d = dist(p, q);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

/**
 * Find intersection points between two arcs (given as circle params + angular ranges).
 */
export function arcArcIntersections(
  c1: Vec2, r1: number, start1: number, sweep1: number,
  c2: Vec2, r2: number, start2: number, sweep2: number,
): Vec2[] {
  const pts = circleCircleIntersections(c1, r1, c2, r2);
  const result: Vec2[] = [];
  for (const p of pts) {
    const a1 = Math.atan2(p.y - c1.y, p.x - c1.x);
    const a2 = Math.atan2(p.y - c2.y, p.x - c2.x);
    if (isAngleInArc(a1, start1, sweep1) && isAngleInArc(a2, start2, sweep2)) {
      result.push(p);
    }
  }
  return result;
}
