import { it, expect, vi } from 'vitest';
import { BulbTimer } from '../../src/tools/exposure/timer';

it('derives remaining time from the clock, survives pause, fires done once', () => {
  let now = 0;
  const t = new BulbTimer(10_000, () => now);
  const done = vi.fn();
  t.onDone = done;
  t.start();
  now = 4000;
  expect(t.remainingMs()).toBe(6000);
  t.pause();
  now = 9000;
  expect(t.remainingMs()).toBe(6000);
  t.start();
  expect(t.state).toBe('running');
  now = 15_000;
  expect(t.remainingMs()).toBe(0);
  t.tick();
  t.tick();
  expect(t.state).toBe('done');
  expect(done).toHaveBeenCalledTimes(1);
  t.reset();
  expect(t.state).toBe('idle');
  expect(t.remainingMs()).toBe(10_000);
});

it('fires onDone from a timer even if tick() is never called (background tab)', () => {
  vi.useFakeTimers();
  try {
    const t = new BulbTimer(10_000);
    const done = vi.fn();
    t.onDone = done;
    t.start();
    vi.advanceTimersByTime(4000);
    t.pause();
    vi.advanceTimersByTime(20_000);
    expect(done).not.toHaveBeenCalled();
    t.start();
    vi.advanceTimersByTime(6001);
    expect(done).toHaveBeenCalledTimes(1);
    expect(t.state).toBe('done');
  } finally {
    vi.useRealTimers();
  }
});
