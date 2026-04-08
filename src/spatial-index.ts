import type { Vec2 } from './types';

/**
 * Grid-based spatial hash for fast proximity and intersection queries.
 * Maps segment IDs to grid cells based on their sample points.
 */
export class SpatialIndex {
  private cellSize: number;
  private grid = new Map<string, Set<number>>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private cellCoord(v: number): number {
    return Math.floor(v / this.cellSize);
  }

  /** Insert a segment's sample points into the index */
  insert(segmentId: number, samples: Vec2[]): void {
    for (const p of samples) {
      const cx = this.cellCoord(p.x);
      const cy = this.cellCoord(p.y);
      const k = this.key(cx, cy);
      let set = this.grid.get(k);
      if (!set) {
        set = new Set();
        this.grid.set(k, set);
      }
      set.add(segmentId);
    }
  }

  /** Query all segment IDs near a point within a given radius */
  queryPoint(p: Vec2, radius: number): Set<number> {
    const result = new Set<number>();
    const minCX = this.cellCoord(p.x - radius);
    const maxCX = this.cellCoord(p.x + radius);
    const minCY = this.cellCoord(p.y - radius);
    const maxCY = this.cellCoord(p.y + radius);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const set = this.grid.get(this.key(cx, cy));
        if (set) {
          for (const id of set) result.add(id);
        }
      }
    }
    return result;
  }

  /** Query all segment IDs near any point in a polyline within a given radius */
  queryPolyline(samples: Vec2[], radius: number): Set<number> {
    const result = new Set<number>();
    for (const p of samples) {
      for (const id of this.queryPoint(p, radius)) {
        result.add(id);
      }
    }
    return result;
  }
}
