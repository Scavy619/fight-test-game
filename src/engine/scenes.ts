export interface Scene {
  enter?(): void;
  exit?(): void;
  update(): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
}

type Op = { kind: 'set'; scene: Scene } | { kind: 'push'; scene: Scene } | { kind: 'pop' };

/**
 * Scene stack. `update()` runs the top scene only; `render()` draws every stacked scene
 * bottom to top (so a pause overlay draws over the fight).
 *
 * `set`/`push`/`pop` called while the manager is busy (inside `update()` or inside a
 * scene's `enter`/`exit`) are queued and applied in call order once the current work
 * finishes; otherwise they apply immediately.
 *
 * Lifecycle: `set` exits every stacked scene top to bottom, then enters the new one.
 * `push` enters the new scene (the one below is not exited). `pop` exits the top scene;
 * popping an empty stack does nothing.
 */
export class SceneManager {
  private readonly stack: Scene[] = [];
  private readonly queue: Op[] = [];
  private busy = false;

  set(scene: Scene): void {
    this.request({ kind: 'set', scene });
  }

  push(scene: Scene): void {
    this.request({ kind: 'push', scene });
  }

  pop(): void {
    this.request({ kind: 'pop' });
  }

  /** The top (active) scene, if any. */
  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get size(): number {
    return this.stack.length;
  }

  /** Read-only view of the stack, bottom first. */
  get scenes(): readonly Scene[] {
    return this.stack;
  }

  update(): void {
    if (this.busy) return;
    this.busy = true;
    try {
      this.top?.update();
    } finally {
      this.busy = false;
    }
    this.flush();
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const s of [...this.stack]) s.render(ctx, alpha);
  }

  private request(op: Op): void {
    this.queue.push(op);
    if (!this.busy) this.flush();
  }

  private flush(): void {
    if (this.busy) return;
    this.busy = true;
    try {
      let op: Op | undefined;
      while ((op = this.queue.shift()) !== undefined) this.apply(op);
    } finally {
      this.busy = false;
    }
  }

  private apply(op: Op): void {
    switch (op.kind) {
      case 'set':
        while (this.stack.length > 0) this.stack.pop()?.exit?.();
        this.stack.push(op.scene);
        op.scene.enter?.();
        break;
      case 'push':
        this.stack.push(op.scene);
        op.scene.enter?.();
        break;
      case 'pop':
        this.stack.pop()?.exit?.();
        break;
    }
  }
}
