export type Vec2 = { x: number; y: number };

export type PieceType = 'straight' | 'arc';
export type ArcDirection = 'left' | 'right';

export type Piece = {
  id: number;
  type: PieceType;
  direction?: ArcDirection;
  angleDeg?: number;
  radius?: number;
  from: Vec2;
  to: Vec2;
  headingStart: number;
  headingEnd: number;
  length: number;
  samples: Vec2[];
  center?: Vec2;
  startAngle?: number;
  sweepRad?: number;
};

export type Crossing = {
  id: number;
  point: Vec2;
  overPieceId: number;
  underPieceId: number;
  angleDeg: number;
};

export type RenderSegment = {
  pieceId: number;
  samples: Vec2[];
  layer: 'base' | 'bridge';
};

export type SnakeState = {
  position: Vec2;
  heading: number;
  pieces: Piece[];
  crossings: Crossing[];
  renderSegments: RenderSegment[];
  alive: boolean;
  totalLength: number;
  reason: 'running' | 'trapped' | 'maxPieces';
};

export type GeneratorConfig = {
  canvasSize: number;
  strokeWidth: number;
  turnRadius: number;
  straightLength: number;
  angles: number[];
  clearancePadding: number;
  boundaryPadding: number;
  minCrossingAngle: number;
  minCrossingSpacing: number;
  crossingBias: number;
  maxPieces: number;
  seed: string;
  stepsPerSecond: number;
};
