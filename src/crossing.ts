import type { Crossing, GeneratorConfig, Piece, RenderSegment, Vec2 } from './types';
import { dist } from './math';
import type { SpatialIndex } from './spatial-index';

export type CrossingCheck = {
  valid: boolean;
  crossing?: Crossing;
};

/**
 * Check if a new piece creates a valid crossing with existing pieces.
 * At most 1 crossing allowed per new piece.
 */
export function detectCrossing(
  newPiece: Piece,
  pieces: Piece[],
  spatialIndex: SpatialIndex,
  existingCrossings: Crossing[],
  config: GeneratorConfig,
  nextCrossingId: number,
): CrossingCheck {
  const queryRadius = config.strokeWidth + config.clearancePadding + config.turnRadius;
  const nearbyIds = spatialIndex.queryPolyline(newPiece.samples, queryRadius);

  // Skip recent pieces (continuous path neighbors)
  const recentWindow = 8;
  const minCheckId = Math.max(0, newPiece.id - recentWindow);

  const found: { point: Vec2; pieceId: number; angle: number }[] = [];

  for (const pid of nearbyIds) {
    if (pid >= minCheckId) continue;
    const other = pieces[pid];
    if (!other) continue;

    const ix = polylineIntersection(newPiece.samples, other.samples);
    if (ix) {
      const angle = intersectionAngle(newPiece, other);
      found.push({ point: ix, pieceId: pid, angle });
    }
  }

  if (found.length === 0) return { valid: true };

  // Pick the best crossing (highest angle) — allow pieces that intersect multiple old segments
  const validCrossings = found.filter(c => c.angle >= config.minCrossingAngle);
  if (found.length > 0 && validCrossings.length === 0) return { valid: false };
  if (validCrossings.length === 0) return { valid: true };

  // Only register at most 1 crossing per piece
  const c = validCrossings.reduce((a, b) => a.angle > b.angle ? a : b);

  // Not near edges
  const margin = config.boundaryPadding;
  if (
    c.point.x < margin || c.point.x > config.canvasSize - margin ||
    c.point.y < margin || c.point.y > config.canvasSize - margin
  ) return { valid: false };

  // Not too close to existing crossings
  for (const ec of existingCrossings) {
    if (dist(c.point, ec.point) < config.minCrossingSpacing) return { valid: false };
  }

  return {
    valid: true,
    crossing: {
      id: nextCrossingId,
      point: c.point,
      overPieceId: newPiece.id,
      underPieceId: c.pieceId,
      angleDeg: c.angle,
    },
  };
}

/**
 * Check clearance: new piece must maintain min distance from existing geometry.
 */
export function checkClearance(
  newPiece: Piece,
  pieces: Piece[],
  spatialIndex: SpatialIndex,
  crossings: Crossing[],
  config: GeneratorConfig,
  clearanceOverride?: number,
): boolean {
  const minDist = clearanceOverride ?? (config.strokeWidth + config.clearancePadding);
  const nearbyIds = spatialIndex.queryPolyline(newPiece.samples, minDist + config.strokeWidth);

  const recentWindow = 8;
  const minCheckId = Math.max(0, newPiece.id - recentWindow);

  for (const pid of nearbyIds) {
    if (pid >= minCheckId) continue;
    const other = pieces[pid];
    if (!other) continue;

    for (const p of newPiece.samples) {
      for (const q of other.samples) {
        if (dist(p, q) < minDist) {
          const hasCrossing = crossings.some(
            cx => (cx.overPieceId === newPiece.id && cx.underPieceId === pid) ||
                  (cx.overPieceId === pid && cx.underPieceId === newPiece.id),
          );
          if (!hasCrossing) return false;
        }
      }
    }
  }
  return true;
}

/** Find intersection point between two polylines (first found). */
function polylineIntersection(a: Vec2[], b: Vec2[]): Vec2 | null {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const ix = segSegIntersection(a[i], a[i + 1], b[j], b[j + 1]);
      if (ix) return ix;
    }
  }
  return null;
}

/** Segment-segment intersection. */
function segSegIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): Vec2 | null {
  const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: a1.x + t * dx1, y: a1.y + t * dy1 };
  }
  return null;
}

/** Compute crossing angle between two pieces. */
function intersectionAngle(a: Piece, b: Piece): number {
  const ha = (a.headingStart + a.headingEnd) / 2;
  const hb = (b.headingStart + b.headingEnd) / 2;
  let angle = Math.abs(ha - hb);
  angle = angle % Math.PI;
  if (angle > Math.PI / 2) angle = Math.PI - angle;
  return (angle * 180) / Math.PI;
}

/**
 * Build render segments from pieces, splitting under-pieces at crossings.
 */
export function buildRenderSegments(
  pieces: Piece[],
  crossings: Crossing[],
  config: GeneratorConfig,
): RenderSegment[] {
  const segments: RenderSegment[] = [];
  const gapHalf = config.strokeWidth * 2;

  // Base: all pieces as continuous paths
  for (const piece of pieces) {
    segments.push({ pieceId: piece.id, samples: piece.samples, layer: 'base' });
  }

  // Bridge overlays: over-piece segments near each crossing, drawn on top
  for (const cx of crossings) {
    const overPiece = pieces.find(p => p.id === cx.overPieceId);
    if (!overPiece) continue;

    const bridgeSamples = overPiece.samples.filter(
      s => dist(s, cx.point) < gapHalf,
    );
    if (bridgeSamples.length >= 2) {
      segments.push({ pieceId: overPiece.id, samples: bridgeSamples, layer: 'bridge' });
    }
  }

  return segments;
}
