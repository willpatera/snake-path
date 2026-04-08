import type { Piece, GeneratorConfig } from './types';
import type { CrossingCheck } from './crossing';
import type { SpatialIndex } from './spatial-index';

/**
 * Score a candidate piece. Higher = better.
 *
 * Preferences:
 *  1. Go straight (highest)
 *  2. Small turns over big turns
 *  3. Crossing bonus when valid
 *  4. Prefer open space (lookahead)
 *  5. Distribute across canvas
 */
export function scoreCandidate(
  piece: Piece,
  crossingCheck: CrossingCheck,
  config: GeneratorConfig,
  spatialIndex: SpatialIndex,
  pieces: Piece[],
): number {
  let score = 1.0;

  // 1. Straight preference (moderate — don't overpower edge avoidance)
  if (piece.type === 'straight') {
    score += 3.0;
  } else {
    const angle = piece.angleDeg ?? 0;
    score += 1.5 * (1 - angle / 180);
  }

  // 2. Crossing bonus
  if (crossingCheck.crossing) {
    score += config.crossingBias * 4.0;
  }

  // 3. Open space ahead
  const queryRadius = (config.strokeWidth + config.clearancePadding) * 4;
  const nearbyIds = spatialIndex.queryPoint(piece.to, queryRadius);
  let nearbyCount = 0;
  const recentWindow = 8;
  const minCheckId = Math.max(0, piece.id - recentWindow);
  for (const id of nearbyIds) {
    if (id < minCheckId) nearbyCount++;
  }
  score += Math.max(0, 3.0 - nearbyCount * 0.5);

  // 4. Edge distance — STRONG multiplicative penalty when close to edge
  const edgeDist = Math.min(
    piece.to.x, piece.to.y,
    config.canvasSize - piece.to.x,
    config.canvasSize - piece.to.y,
  );
  const dangerZone = config.boundaryPadding * 4;
  if (edgeDist < dangerZone) {
    // Multiplicative: score drops toward 0 as we approach edge
    score *= Math.max(0.05, edgeDist / dangerZone);
  } else {
    score += 1.0; // mild bonus for being in the interior
  }

  // 5. Balance — prefer undervisited quadrants
  if (pieces.length > 0) {
    const q = quadrant(piece.to, config.canvasSize);
    let count = 0;
    for (const p of pieces) {
      if (quadrant(p.to, config.canvasSize) === q) count++;
    }
    score += (1 - count / pieces.length) * 2.0;
  }

  return Math.max(0.01, score);
}

function quadrant(p: { x: number; y: number }, size: number): number {
  const h = size / 2;
  if (p.x < h && p.y < h) return 0;
  if (p.x >= h && p.y < h) return 1;
  if (p.x < h) return 2;
  return 3;
}

/**
 * Weighted random selection using scores.
 */
export function weightedSelect(scores: number[], random: () => number): number {
  const total = scores.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = random() * total;
  for (let i = 0; i < scores.length; i++) {
    r -= scores[i];
    if (r <= 0) return i;
  }
  return scores.length - 1;
}
