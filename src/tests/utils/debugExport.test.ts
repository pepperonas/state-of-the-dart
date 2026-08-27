import { describe, it, expect } from 'vitest';
import { formatDebugFlagForAI } from '../../utils/debugExport';
import type { DebugFlag } from '../../types/debugFlag';

/**
 * This text is what an admin pastes into an AI assistant. Its value is entirely
 * in being complete and stable: a section that silently disappears when a field
 * is missing costs the reader the context they came for.
 */
const flag = (over: Partial<DebugFlag> = {}): DebugFlag =>
  ({
    id: 'flag-1',
    userId: 'u1',
    userName: 'Martin',
    userEmail: 'martin@example.de',
    comment: 'Score wird nicht gezählt',
    route: '/game',
    status: 'open',
    createdAt: Date.UTC(2026, 0, 15, 12, 0, 0),
    updatedAt: Date.UTC(2026, 0, 15, 12, 0, 0),
    logEntries: [],
    ...over,
  }) as DebugFlag;

describe('formatDebugFlagForAI', () => {
  it('is delimited, so a paste can be found in a longer conversation', () => {
    const out = formatDebugFlagForAI(flag());
    expect(out.startsWith('=== DEBUG FLAG ===')).toBe(true);
    expect(out.trimEnd().endsWith('=== END DEBUG FLAG ===')).toBe(true);
  });

  it('carries the identifying header', () => {
    const out = formatDebugFlagForAI(flag());
    expect(out).toContain('ID: flag-1');
    expect(out).toContain('Route: /game');
    expect(out).toContain('Status: open');
    expect(out).toContain('Martin');
    expect(out).toContain('martin@example.de');
  });

  it('states the creation time in ISO, not a locale-dependent format', () => {
    expect(formatDebugFlagForAI(flag())).toContain('2026-01-15T12:00:00.000Z');
  });

  it('always includes the reporter comment — it is the whole point', () => {
    expect(formatDebugFlagForAI(flag({ comment: 'Absturz beim Bust' })))
      .toContain('Absturz beim Bust');
  });

  /** Missing optional data must degrade to a marker, never to a crash. */
  it('substitutes a marker for missing fields rather than printing undefined', () => {
    const out = formatDebugFlagForAI(flag({ route: undefined, userName: undefined, userEmail: undefined }));
    expect(out).not.toContain('undefined');
    expect(out).toContain('Route: N/A');
    expect(out).toContain('Unknown');
  });

  it('omits sections that have no data instead of printing empty headings', () => {
    const out = formatDebugFlagForAI(flag());
    expect(out).not.toContain('--- ADMIN NOTES ---');
    expect(out).not.toContain('--- BROWSER ---');
    expect(out).not.toContain('--- GAME STATE ---');
    expect(out).not.toContain('LOG ENTRIES');
  });

  it('includes admin notes when present', () => {
    expect(formatDebugFlagForAI(flag({ adminNotes: 'Reproduziert' })))
      .toContain('--- ADMIN NOTES ---');
  });

  it('includes browser details when present', () => {
    const out = formatDebugFlagForAI(flag({
      browserInfo: { userAgent: 'UA/1.0', viewport: '390x800', screenResolution: '1170x2532', onLine: true } as never,
    }));
    expect(out).toContain('UserAgent: UA/1.0');
    expect(out).toContain('Viewport: 390x800');
    expect(out).toContain('Online: true');
  });

  describe('game state', () => {
    const withGame = (gs: Record<string, unknown>) =>
      formatDebugFlagForAI(flag({ gameState: gs as never }));

    it('summarises the match', () => {
      const out = withGame({ matchId: 'm1', type: 'x01', status: 'in-progress', currentLegIndex: 2, legsCount: 5 });
      expect(out).toContain('Match ID: m1');
      expect(out).toContain('Type: x01');
      // The leg index is stored 0-based but reported 1-based for a human.
      expect(out).toContain('Leg: 3 of 5');
    });

    it('lists the players with their average and legs', () => {
      const out = withGame({ players: [
        { name: 'Anna', matchAverage: 62.345, legsWon: 2 },
        { name: 'Ben', matchAverage: 55.1, legsWon: 1 },
      ] });
      expect(out).toContain('Anna (avg: 62.3, legs: 2) vs Ben (avg: 55.1, legs: 1)');
    });

    it('marks unknown player numbers rather than printing NaN', () => {
      const out = withGame({ players: [{ name: 'Anna' }] });
      expect(out).toContain('Anna (avg: ?, legs: ?)');
      expect(out).not.toContain('NaN');
    });

    it('reports a missing leg index as N/A, not as leg 1', () => {
      expect(withGame({ matchId: 'm1' })).toContain('Leg: N/A');
    });
  });

  describe('log entries', () => {
    const entries = (n: number, startMs = 0) =>
      Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        timestamp: new Date(Date.UTC(2026, 0, 15, 12, 0, 0) + startMs + i * 1000).toISOString(),
        level: 'info' as const,
        category: 'game_event' as const,
        message: `Ereignis ${i}`,
      }));

    it('reports how many there are and the span they cover', () => {
      const out = formatDebugFlagForAI(flag({ logEntries: entries(5) }));
      expect(out).toContain('LOG ENTRIES (5 entries, 4.0s span)');
    });

    it('prints every entry with level and category', () => {
      const out = formatDebugFlagForAI(flag({ logEntries: entries(3) }));
      expect(out).toContain('[INFO ] [game_event] Ereignis 0');
      expect(out).toContain('Ereignis 2');
    });

    it('attaches small payloads in full', () => {
      const out = formatDebugFlagForAI(flag({
        logEntries: [{ ...entries(1)[0], data: { score: 60 } }] as never,
      }));
      expect(out).toContain('data: {"score":60}');
    });

    /** A megabyte of payload in a clipboard paste helps nobody. */
    it('truncates a large payload', () => {
      const out = formatDebugFlagForAI(flag({
        logEntries: [{ ...entries(1)[0], data: { blob: 'x'.repeat(1000) } }] as never,
      }));
      expect(out).toContain('...');
      expect(out.length).toBeLessThan(1200);
    });

    it('marks an unserialisable payload instead of throwing', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const out = formatDebugFlagForAI(flag({
        logEntries: [{ ...entries(1)[0], data: circular }] as never,
      }));
      expect(out).toContain('[unserializable]');
    });

    it('handles a single entry without dividing by zero', () => {
      const out = formatDebugFlagForAI(flag({ logEntries: entries(1) }));
      expect(out).toContain('1 entries, 0.0s span');
    });
  });
});
