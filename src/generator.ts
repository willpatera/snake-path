import type { GeneratorConfig, SnakeState, Crossing } from './types';
import { PRNG } from './prng';
import { SpatialIndex } from './spatial-index';
import { generateCandidates, filterBoundary } from './candidates';
import { detectCrossing, checkClearance, buildRenderSegments } from './crossing';
import { scoreCandidate, weightedSelect } from './scoring';

export class Generator {
  config: GeneratorConfig;
  state: SnakeState;
  prng: PRNG;
  spatialIndex: SpatialIndex;
  nextPieceId = 0;
  nextCrossingId = 0;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.prng = new PRNG(config.seed);
    this.spatialIndex = new SpatialIndex(config.strokeWidth + config.clearancePadding);

    const start = this.sampleEdgeStart();
    this.state = {
      position: start.position,
      heading: start.heading,
      pieces: [],
      crossings: [],
      renderSegments: [],
      alive: true,
      totalLength: 0,
      reason: 'running',
    };
  }

  private sampleEdgeStart(): { position: { x: number; y: number }; heading: number } {
    const pad = this.config.boundaryPadding + 2;
    const size = this.config.canvasSize;
    const usable = size - 2 * pad;
    const edge = this.prng.randomInt(0, 3);
    const t = pad + this.prng.randomFloat(0, usable);

    switch (edge) {
      case 0: return { position: { x: t, y: pad }, heading: Math.PI / 2 };
      case 1: return { position: { x: size - pad, y: t }, heading: Math.PI };
      case 2: return { position: { x: t, y: size - pad }, heading: -Math.PI / 2 };
      default: return { position: { x: pad, y: t }, heading: 0 };
    }
  }

  step(): boolean {
    if (!this.state.alive) return false;
    if (this.state.pieces.length >= this.config.maxPieces) {
      this.state.alive = false;
      this.state.reason = 'maxPieces';
      return false;
    }

    const candidates = generateCandidates(
      this.state.position, this.state.heading,
      this.config, this.nextPieceId,
    );
    const inBounds = filterBoundary(candidates, this.config);

    // Try normal clearance
    let pool = this.evaluate(inBounds);

    // Desperation 1: relax clearance to just stroke width
    if (pool.length === 0) {
      pool = this.evaluate(inBounds, this.config.strokeWidth);
    }

    // Desperation 2: relax further
    if (pool.length === 0) {
      pool = this.evaluate(inBounds, this.config.strokeWidth * 0.5);
    }

    // Desperation 3: skip clearance entirely, just boundary + crossing validity
    if (pool.length === 0) {
      for (const piece of inBounds) {
        const cx = detectCrossing(
          piece, this.state.pieces, this.spatialIndex,
          this.state.crossings, this.config, this.nextCrossingId,
        );
        if (!cx.valid) continue;
        pool.push({ piece, score: 1, crossing: cx.crossing });
      }
    }

    // Desperation 4: relax boundary padding to strokeWidth/2
    if (pool.length === 0) {
      const relaxedBounds = filterBoundary(candidates, this.config, this.config.strokeWidth / 2);
      for (const piece of relaxedBounds) {
        pool.push({ piece, score: 1, crossing: undefined });
      }
    }

    if (pool.length === 0) {
      this.state.alive = false;
      this.state.reason = 'trapped';
      return false;
    }

    // Score bonus: count future boundary-valid candidates from each endpoint (openness)
    for (const e of pool) {
      const fc = generateCandidates(e.piece.to, e.piece.headingEnd, this.config, this.nextPieceId + 1);
      const fb = filterBoundary(fc, this.config);
      e.score += fb.length * 0.5; // more future options = better
    }

    // Select
    const scores = pool.map(e => e.score);
    const idx = weightedSelect(scores, () => this.prng.random());
    const chosen = pool[idx];

    // Place piece
    this.state.pieces.push(chosen.piece);
    this.spatialIndex.insert(chosen.piece.id, chosen.piece.samples);
    this.state.totalLength += chosen.piece.length;
    this.state.position = chosen.piece.to;
    this.state.heading = chosen.piece.headingEnd;
    this.nextPieceId++;

    if (chosen.crossing) {
      this.state.crossings.push(chosen.crossing);
      this.nextCrossingId++;
    }

    this.state.renderSegments = buildRenderSegments(
      this.state.pieces, this.state.crossings, this.config,
    );

    return true;
  }

  private evaluate(
    inBounds: ReturnType<typeof generateCandidates>,
    clearanceOverride?: number,
  ) {
    type Evaluated = { piece: typeof inBounds[0]; score: number; crossing?: Crossing };
    const evaluated: Evaluated[] = [];

    for (const piece of inBounds) {
      const cx = detectCrossing(
        piece, this.state.pieces, this.spatialIndex,
        this.state.crossings, this.config, this.nextCrossingId,
      );
      if (!cx.valid) continue;

      if (this.state.pieces.length > 0) {
        const tempCrossings = cx.crossing
          ? [...this.state.crossings, cx.crossing]
          : this.state.crossings;
        if (!checkClearance(piece, this.state.pieces, this.spatialIndex, tempCrossings, this.config, clearanceOverride)) {
          continue;
        }
      }

      const score = scoreCandidate(
        piece, cx, this.config, this.spatialIndex, this.state.pieces,
      );
      evaluated.push({ piece, score, crossing: cx.crossing });
    }
    return evaluated;
  }
}
