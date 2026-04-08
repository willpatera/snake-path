import type { GeneratorConfig, Piece } from './types';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Woven road-style rendering:
 *  Each piece is drawn in order as a white border + black core pair.
 *  Since the over-piece always has a higher ID (drawn later), its white
 *  border naturally covers the under-piece's black core at crossings,
 *  creating the woven over/under illusion.
 */
export function renderToSVG(
  pieces: Piece[],
  headPos: { x: number; y: number } | null,
  config: GeneratorConfig,
): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('width', String(config.canvasSize));
  svg.setAttribute('height', String(config.canvasSize));
  svg.setAttribute('viewBox', `0 0 ${config.canvasSize} ${config.canvasSize}`);

  // White background
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', String(config.canvasSize));
  bg.setAttribute('height', String(config.canvasSize));
  bg.setAttribute('fill', 'white');
  svg.appendChild(bg);

  const borderWidth = config.strokeWidth + 4;

  // Draw each piece in order: border then core
  // Later pieces (higher id) naturally cover earlier ones at crossings
  for (const piece of pieces) {
    if (piece.samples.length < 2) continue;
    const pts = piece.samples.map(p => `${p.x},${p.y}`).join(' ');

    // White border (outline)
    svg.appendChild(makePolyline(pts, 'white', borderWidth));
    // Black core (the "road")
    svg.appendChild(makePolyline(pts, 'black', config.strokeWidth));
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

function makePolyline(points: string, stroke: string, strokeWidth: number): SVGPolylineElement {
  const polyline = document.createElementNS(NS, 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('stroke', stroke);
  polyline.setAttribute('stroke-width', String(strokeWidth));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  return polyline;
}

export function svgToString(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}
