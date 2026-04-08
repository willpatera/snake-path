/**
 * Seeded PRNG using mulberry32 algorithm.
 * Deterministic: same seed always produces same sequence.
 */
export class PRNG {
  private state: number;

  constructor(seed: string) {
    this.state = PRNG.hashString(seed);
    if (this.state === 0) this.state = 1;
  }

  private static hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  /** Returns a float in [0, 1) */
  random(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns int in [min, max] inclusive */
  randomInt(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  /** Returns float in [min, max) */
  randomFloat(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }
}
