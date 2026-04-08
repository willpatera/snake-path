import type { GeneratorConfig, Piece, Crossing } from './types';
import { dist } from './math';

const NS = 'http://www.w3.org/2000/svg';

export type RenderOptions = {
  gradient: boolean;
  gradientStart: string;
  gradientEnd: string;
  hideEndCap: boolean;
  weave: boolean;
};

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  gradient: false,
  gradientStart: '#D9D9D9',
  gradientEnd: '#000000',
  hideEndCap: false,
  weave: false,
};

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function pieceColor(i: number, total: number, options: RenderOptions): string {
  if (options.gradient && total > 1) {
    return lerpColor(options.gradientStart, options.gradientEnd, i / (total - 1));
  }
  return 'black';
}

/**
 * Extract the contiguous run of samples nearest to a point.
 * Returns only samples that form an unbroken sequence near the target.
 */
function extractContiguousNear(
  samples: { x: number; y: number }[],
  point: { x: number; y: number },
  radius: number,
): { x: number; y: number }[] {
  // Find the sample closest to the point
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const d = dist(samples[i], point);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }

  // Expand outward from bestIdx while within radius
  let lo = bestIdx;
  let hi = bestIdx;
  while (lo > 0 && dist(samples[lo - 1], point) < radius) lo--;
  while (hi < samples.length - 1 && dist(samples[hi + 1], point) < radius) hi++;

  return samples.slice(lo, hi + 1);
}

export function renderToSVG(
  pieces: Piece[],
  crossings: Crossing[],
  headPos: { x: number; y: number } | null,
  config: GeneratorConfig,
  options: RenderOptions = DEFAULT_RENDER_OPTIONS,
): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('width', String(config.canvasSize));
  svg.setAttribute('height', String(config.canvasSize));
  svg.setAttribute('viewBox', `0 0 ${config.canvasSize} ${config.canvasSize}`);

  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', String(config.canvasSize));
  bg.setAttribute('height', String(config.canvasSize));
  bg.setAttribute('fill', 'white');
  svg.appendChild(bg);

  const borderWidth = config.strokeWidth + 4;
  const totalPieces = pieces.length;

  if (options.hideEndCap) {
    // 3-pass rendering with round caps throughout.
    // Round caps ensure no gaps between segments.
    // Drawing all borders first, then all cores, ensures no white slivers
    // (borders are fully beneath cores except at the path edges).
    // Crossing bridges then restore over/under z-ordering.

    // Pass 1: all borders (round caps)
    for (const piece of pieces) {
      if (piece.samples.length < 2) continue;
      const pts = piece.samples.map(p => `${p.x},${p.y}`).join(' ');
      svg.appendChild(makePolyline(pts, 'white', borderWidth, 'round'));
    }

    // Pass 2: all cores (round caps)
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.samples.length < 2) continue;
      const pts = piece.samples.map(p => `${p.x},${p.y}`).join(' ');
      const color = pieceColor(i, totalPieces, options);
      svg.appendChild(makePolyline(pts, color, config.strokeWidth, 'round'));
    }

    // Pass 3: crossing bridges — redraw border+core locally at each crossing
    // to restore the over/under effect that the two-pass approach loses.
    if (crossings.length > 0) {
      const weaveRadius = config.strokeWidth * 1.8;
      const sorted = [...crossings].sort((a, b) => a.id - b.id);

      for (let ci = 0; ci < sorted.length; ci++) {
        const cx = sorted[ci];
        // Determine which piece should appear on top at this crossing
        const onTopId = (options.weave && ci % 2 !== 0) ? cx.underPieceId : cx.overPieceId;
        const topPiece = pieces.find(p => p.id === onTopId);
        if (!topPiece) continue;

        const near = extractContiguousNear(topPiece.samples, cx.point, weaveRadius);
        if (near.length < 2) continue;

        const pts = near.map(p => `${p.x},${p.y}`).join(' ');
        const idx = pieces.findIndex(p => p.id === onTopId);
        const color = pieceColor(idx, totalPieces, options);

        svg.appendChild(makePolyline(pts, 'white', borderWidth, 'round'));
        svg.appendChild(makePolyline(pts, color, config.strokeWidth, 'round'));
      }
    }
  } else {
    // Standard per-piece rendering: border+core pairs in order.
    // Round caps overlap at joints, hiding any slivers naturally.
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.samples.length < 2) continue;
      const pts = piece.samples.map(p => `${p.x},${p.y}`).join(' ');
      const color = pieceColor(i, totalPieces, options);

      svg.appendChild(makePolyline(pts, 'white', borderWidth, 'round'));
      svg.appendChild(makePolyline(pts, color, config.strokeWidth, 'round'));
    }

    // Weave bridges (only needed when weave is on in round-cap mode)
    if (options.weave && crossings.length > 0) {
      const weaveRadius = config.strokeWidth * 1.8;
      const sorted = [...crossings].sort((a, b) => a.id - b.id);

      for (let ci = 0; ci < sorted.length; ci++) {
        const cx = sorted[ci];
        const onTopId = (ci % 2 !== 0) ? cx.underPieceId : cx.overPieceId;
        const topPiece = pieces.find(p => p.id === onTopId);
        if (!topPiece) continue;

        const near = extractContiguousNear(topPiece.samples, cx.point, weaveRadius);
        if (near.length < 2) continue;

        const pts = near.map(p => `${p.x},${p.y}`).join(' ');
        const idx = pieces.findIndex(p => p.id === onTopId);
        const color = pieceColor(idx, totalPieces, options);

        svg.appendChild(makePolyline(pts, 'white', borderWidth, 'round'));
        svg.appendChild(makePolyline(pts, color, config.strokeWidth, 'round'));
      }
    }
  }

  // Head indicator
  if (headPos) {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', String(headPos.x));
    circle.setAttribute('cy', String(headPos.y));
    circle.setAttribute('r', String(config.strokeWidth));
    circle.setAttribute('fill', 'red');
    circle.setAttribute('opacity', '0.6');
    svg.appendChild(circle);
  }

  return svg;
}

function makePolyline(points: string, stroke: string, strokeWidth: number, linecap = 'round'): SVGPolylineElement {
  const polyline = document.createElementNS(NS, 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('stroke', stroke);
  polyline.setAttribute('stroke-width', String(strokeWidth));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke-linecap', linecap);
  polyline.setAttribute('stroke-linejoin', 'round');
  return polyline;
}

export function svgToString(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}
