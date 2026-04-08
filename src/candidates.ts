import type { Piece, GeneratorConfig, Vec2 } from './types';
import { buildStraight, buildArc } from './arc';

/**
 * Generate all candidate pieces from current position + heading.
 * Returns: 1 straight + left arcs at each angle + right arcs at each angle.
 */
export function generateCandidates(
  position: Vec2,
  heading: number,
  config: GeneratorConfig,
  nextId: number,
): Piece[] {
  const candidates: Piece[] = [];

  // Straights at multiple lengths
  candidates.push(buildStraight(position, heading, config.straightLength, nextId));
  candidates.push(buildStraight(position, heading, config.straightLength * 0.5, nextId));
  candidates.push(buildStraight(position, heading, config.straightLength * 0.25, nextId));

  // Arcs at full radius, half radius, and quarter radius
  const radii = [config.turnRadius];
  const halfR = config.turnRadius * 0.5;
  if (halfR >= 8) radii.push(halfR);
  const quarterR = config.turnRadius * 0.25;
  if (quarterR >= 6) radii.push(quarterR);

  for (const radius of radii) {
    for (const angleDeg of config.angles) {
      candidates.push(buildArc(position, heading, 'left', angleDeg, radius, nextId));
      candidates.push(buildArc(position, heading, 'right', angleDeg, radius, nextId));
    }
  }

  return candidates;
}

/**
 * Filter: reject candidates that leave the boundary.
 */
export function filterBoundary(candidates: Piece[], config: GeneratorConfig, padOverride?: number): Piece[] {
  const pad = padOverride ?? config.boundaryPadding;
  const min = pad;
  const max = config.canvasSize - pad;

  return candidates.filter(piece => {
    for (const p of piece.samples) {
      if (p.x < min || p.x > max || p.y < min || p.y > max) return false;
    }
    return true;
  });
}
