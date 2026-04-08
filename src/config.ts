import type { GeneratorConfig } from './types';

export const DEFAULT_CONFIG: GeneratorConfig = {
  canvasSize: 800,
  strokeWidth: 8,
  turnRadius: 32,
  straightLength: 64,
  angles: [60, 90, 120, 150, 180],
  clearancePadding: 1,
  boundaryPadding: 20,
  minCrossingAngle: 30,
  minCrossingSpacing: 40,
  crossingBias: 0.7,
  maxPieces: 2000,
  seed: 'demo',
  stepsPerSecond: 30,
};

export function mergeConfig(partial: Partial<GeneratorConfig>): GeneratorConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}
