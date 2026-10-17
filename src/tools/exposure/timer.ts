export type TimerState = 'idle' | 'running' | 'paused' | 'done';

/** Countdown whose remaining time is derived from clock deltas, so background-tab throttling can't drift it. */
export class BulbTimer {
  onTick?: (ms: number) => void;
  onDone?: () => void;
  #state: TimerState = 'idle';
  #elapsed = 0;
  #startedAt = 0;
  #backstop: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly durationMs: number, private now: () => number = () => Date.now()) {}

  get state(): TimerState { return this.#state; }

  start(): void {
    if (this.#state === 'running' || this.#state === 'done') return;
    this.#startedAt = this.now();
    this.#state = 'running';
    // Animation frames stop in background tabs; this guarantees onDone still fires on time.
    this.#backstop = setTimeout(() => this.tick(), this.remainingMs() + 1);
  }

  pause(): void {
    if (this.#state !== 'running') return;
    this.#elapsed += this.now() - this.#startedAt;
    this.#state = 'paused';
    clearTimeout(this.#backstop);
  }

  reset(): void {
    clearTimeout(this.#backstop);
    this.#elapsed = 0;
    this.#state = 'idle';
  }

  remainingMs(): number {
    const running = this.#state === 'running' ? this.now() - this.#startedAt : 0;
    return Math.max(0, this.durationMs - this.#elapsed - running);
  }

  /** Call on each animation frame; emits onTick and fires onDone exactly once. */
  tick(): void {
    if (this.#state !== 'running') return;
    const ms = this.remainingMs();
    this.onTick?.(ms);
    if (ms === 0) {
      clearTimeout(this.#backstop);
      this.#state = 'done';
      this.onDone?.();
    }
  }
}
