import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { logBuffer } from '../../utils/logBuffer';

/**
 * The ring buffer runs for every user in production, and its snapshot is what
 * an admin actually reads when diagnosing a report. Two properties matter most:
 * it must never grow without bound, and it must never throw on the data an app
 * happens to hand it — a logger that crashes takes the page with it.
 */
beforeEach(() => logBuffer.clear());
afterEach(() => { vi.useRealTimers(); });

describe('recording', () => {
  it('keeps what it was given', () => {
    logBuffer.log('info', 'game_event', 'Dart geworfen', { segment: 20 });
    const [entry] = logBuffer.getSnapshot();
    expect(entry).toMatchObject({
      level: 'info',
      category: 'game_event',
      message: 'Dart geworfen',
      data: { segment: 20 },
    });
    expect(entry.id).toBeGreaterThan(0);
    expect(Date.parse(entry.timestamp)).not.toBeNaN();
  });

  it('numbers entries strictly upward, so order is recoverable', () => {
    for (let i = 0; i < 5; i++) logBuffer.log('debug', 'lifecycle', `m${i}`);
    const ids = logBuffer.getSnapshot().map((e) => e.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('records the route the entry came from', () => {
    logBuffer.log('info', 'navigation', 'x');
    expect(logBuffer.getSnapshot()[0].route).toBe(
      window.location.pathname + window.location.search
    );
  });

  it('omits data when none was passed, rather than storing undefined noise', () => {
    logBuffer.log('warn', 'error', 'no payload');
    expect(logBuffer.getSnapshot()[0]).not.toHaveProperty('data', null);
    expect(logBuffer.getSnapshot()[0].data).toBeUndefined();
  });
});

describe('bounded growth', () => {
  /** Unbounded, this would be a memory leak in every long session. */
  it('never exceeds its cap however much is logged', () => {
    for (let i = 0; i < 1500; i++) logBuffer.log('debug', 'lifecycle', `m${i}`);
    expect(logBuffer.size).toBe(1000);
  });

  it('drops the oldest entries first', () => {
    for (let i = 0; i < 1200; i++) logBuffer.log('debug', 'lifecycle', `m${i}`);
    const all = logBuffer.getSnapshot(2000, 0);
    expect(all[0].message).toBe('m200');
    expect(all[all.length - 1].message).toBe('m1199');
  });

  it('clear empties it and restarts numbering', () => {
    logBuffer.log('info', 'lifecycle', 'before');
    logBuffer.clear();
    expect(logBuffer.size).toBe(0);
    logBuffer.log('info', 'lifecycle', 'after');
    expect(logBuffer.getSnapshot()[0].id).toBe(1);
  });
});

describe('safe serialisation', () => {
  /** A circular reference is ordinary in React state; it must not throw. */
  it('survives a circular structure', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => logBuffer.log('error', 'error', 'circular', a)).not.toThrow();
    expect(JSON.stringify(logBuffer.getSnapshot()[0].data)).toContain('[Circular]');
  });

  it('truncates a huge string instead of storing it whole', () => {
    logBuffer.log('info', 'api_response', 'big', { body: 'x'.repeat(2000) });
    const stored = (logBuffer.getSnapshot()[0].data as { body: string }).body;
    expect(stored.length).toBeLessThan(600);
    expect(stored).toContain('truncated');
  });

  it('does not mangle a string that is comfortably within the limit', () => {
    const body = 'y'.repeat(100);
    logBuffer.log('info', 'api_response', 'small', { body });
    expect((logBuffer.getSnapshot()[0].data as { body: string }).body).toBe(body);
  });

  it('falls back to a string rather than throwing on unserialisable data', () => {
    const nasty = { toJSON() { throw new Error('nope'); } };
    expect(() => logBuffer.log('error', 'error', 'bad', nasty)).not.toThrow();
    expect(logBuffer.size).toBe(1);
  });

  it('preserves null, which is meaningful, unlike undefined', () => {
    logBuffer.log('info', 'state_change', 'null payload', null);
    expect(logBuffer.getSnapshot()[0].data).toBeNull();
  });
});

describe('getSnapshot', () => {
  it('is empty when nothing has been logged', () => {
    expect(logBuffer.getSnapshot()).toEqual([]);
  });

  /**
   * The snapshot returns whichever window is LARGER — a quiet session still
   * yields context, and a burst is not truncated to the last 60 seconds.
   */
  it('returns the count window when it is larger than the time window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    for (let i = 0; i < 10; i++) logBuffer.log('debug', 'lifecycle', `old${i}`);
    // Move well past the time window; nothing falls inside it any more.
    vi.setSystemTime(new Date('2026-01-01T01:00:00Z'));
    expect(logBuffer.getSnapshot(500, 60)).toHaveLength(10);
  });

  it('returns the time window when it holds more than the count window', () => {
    for (let i = 0; i < 20; i++) logBuffer.log('debug', 'lifecycle', `m${i}`);
    // Ask for only 5 by count; everything is recent, so time wins.
    expect(logBuffer.getSnapshot(5, 60)).toHaveLength(20);
  });

  it('hands back a copy, so a caller cannot corrupt the buffer', () => {
    logBuffer.log('info', 'lifecycle', 'a');
    const snap = logBuffer.getSnapshot();
    snap.push({ ...snap[0], id: 999 });
    expect(logBuffer.size).toBe(1);
  });
});
