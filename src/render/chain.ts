/**
 * Short verlet "follow" chain in world space (stage px, y up) for ribbons, tails and
 * braids. Node 0 is pinned to an anchor; the rest carry momentum, fall with gravity,
 * drift behind the fighter and flutter. Visual only, allocation-free per step.
 */
export interface ChainParams {
  nodes: number;
  /** Segment length in px (already scaled). */
  seg: number;
  gravity: number;
  /** Velocity retention per step, 0..1. */
  damping: number;
  /** Constant push backward (away from facing), grows toward the tip. */
  drift: number;
  /** Upward force growing toward the tip (curls a tail up). */
  lift: number;
  /** Flutter amplitude in px per step. */
  flutter: number;
}

export class Chain {
  readonly n: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly ox: Float64Array;
  private readonly oy: Float64Array;
  private initialized = false;
  private tick = 0;

  constructor(readonly p: ChainParams) {
    this.n = p.nodes;
    this.x = new Float64Array(p.nodes);
    this.y = new Float64Array(p.nodes);
    this.ox = new Float64Array(p.nodes);
    this.oy = new Float64Array(p.nodes);
  }

  reset(): void {
    this.initialized = false;
  }

  /** Lays the chain out straight from the anchor, hanging back and down. */
  private init(ax: number, ay: number, facing: number): void {
    const dx = -facing * 0.55;
    const dy = -0.83;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = this.ox[i] = ax + dx * this.p.seg * i;
      this.y[i] = this.oy[i] = Math.max(1, ay + dy * this.p.seg * i);
    }
    this.initialized = true;
  }

  step(ax: number, ay: number, facing: number): void {
    const { x, y, ox, oy, n } = this;
    const lastX = x[0] ?? 0;
    const lastY = y[0] ?? 0;
    if (!this.initialized || Math.abs(ax - lastX) + Math.abs(ay - lastY) > 250) {
      this.init(ax, ay, facing);
    }
    const p = this.p;
    this.tick++;
    x[0] = ox[0] = ax;
    y[0] = oy[0] = ay;
    for (let i = 1; i < n; i++) {
      const k = i / (n - 1);
      const xi = x[i] ?? 0;
      const yi = y[i] ?? 0;
      const vx = (xi - (ox[i] ?? 0)) * p.damping;
      const vy = (yi - (oy[i] ?? 0)) * p.damping;
      ox[i] = xi;
      oy[i] = yi;
      const flut = Math.sin(this.tick * 0.16 + i * 0.9) * p.flutter * k;
      x[i] = xi + vx - facing * p.drift * k;
      y[i] = yi + vy - p.gravity + p.lift * k + flut;
    }
    // Follow-the-leader length constraint, then keep above the ground.
    for (let i = 1; i < n; i++) {
      const px = x[i - 1] ?? 0;
      const py = y[i - 1] ?? 0;
      let dx = (x[i] ?? 0) - px;
      let dy = (y[i] ?? 0) - py;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      x[i] = px + dx * p.seg;
      const ny = py + dy * p.seg;
      y[i] = ny < 1 ? 1 : ny;
    }
  }
}
