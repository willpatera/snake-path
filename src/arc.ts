import type { Piece, Vec2 } from './types';
import { add, headingVec, normalizeAngle, scale } from './math';

const SAMPLES_PER_PIECE = 16;

/**
 * Build a straight piece from current position + heading.
 */
export function buildStraight(
  from: Vec2,
  heading: number,
  straightLength: number,
  id: number,
): Piece {
  const dir = headingVec(heading);
  const to = add(from, scale(dir, straightLength));

  const samples: Vec2[] = [];
  for (let i = 0; i <= SAMPLES_PER_PIECE; i++) {
    const t = i / SAMPLES_PER_PIECE;
    samples.push(add(from, scale(dir, straightLength * t)));
  }

  return {
    id,
    type: 'straight',
    from,
    to,
    headingStart: heading,
    headingEnd: heading,
    length: straightLength,
    samples,
  };
}

/**
 * Build an arc piece.
 *
 * direction = 'left' → center is to the left of heading direction
 *                       arc sweeps clockwise around center (in screen coords Y-down)
 * direction = 'right' → center is to the right
 *                        arc sweeps counter-clockwise
 */
export function buildArc(
  from: Vec2,
  heading: number,
  direction: 'left' | 'right',
  angleDeg: number,
  radius: number,
  id: number,
): Piece {
  const sweepRad = (angleDeg * Math.PI) / 180;

  // Center of the turning circle
  const perpAngle = direction === 'left'
    ? heading - Math.PI / 2
    : heading + Math.PI / 2;
  const center = add(from, scale(headingVec(perpAngle), radius));

  // Start angle: from center to `from` point
  const startAngle = Math.atan2(from.y - center.y, from.x - center.x);

  // For left turn: clockwise (negative sweep in math)
  // For right turn: counter-clockwise (positive sweep)
  const signedSweep = direction === 'left' ? -sweepRad : sweepRad;

  // Sample points along the arc
  const samples: Vec2[] = [];
  for (let i = 0; i <= SAMPLES_PER_PIECE; i++) {
    const t = i / SAMPLES_PER_PIECE;
    const angle = startAngle + signedSweep * t;
    samples.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  const to = samples[samples.length - 1];
  const endAngle = startAngle + signedSweep;

  // Heading at end: tangent to circle
  const headingEnd = direction === 'left'
    ? normalizeAngle(endAngle - Math.PI / 2)
    : normalizeAngle(endAngle + Math.PI / 2);

  return {
    id,
    type: 'arc',
    direction,
    angleDeg,
    radius,
    from,
    to,
    headingStart: heading,
    headingEnd,
    length: radius * sweepRad,
    samples,
    center,
    startAngle,
    sweepRad: signedSweep,
  };
}
