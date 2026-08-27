import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Icon from '../../components/icons/Icon';
import { ICON_PATHS, ICON_NAMES, type IconName } from '../../components/icons/paths';
import { EMOJI_TO_ICON, iconForEmoji } from '../../components/icons/emojiMap';
import { ACHIEVEMENTS } from '../../types/achievements';

const SRC = path.resolve(__dirname, '../..');

describe('the custom icon set', () => {
  it('every name resolves to path data', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(50);
    for (const n of ICON_NAMES) {
      expect(ICON_PATHS[n], n).toBeTruthy();
      expect(ICON_PATHS[n].length, n).toBeGreaterThan(10);
    }
  });

  /** Path data only — no colours, no ids, no external references. */
  it('carries no colour, id or external reference', () => {
    for (const n of ICON_NAMES) {
      const d = ICON_PATHS[n];
      expect(d, `${n} must not hard-code a colour`).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      expect(d, `${n} must not reference anything external`).not.toMatch(/url\(|href|<|>/);
    }
  });

  it('uses only valid SVG path commands and starts with a move', () => {
    for (const n of ICON_NAMES) {
      const d = ICON_PATHS[n];
      expect(d[0], `${n} must start with M`).toBe('M');
      const bad = d.replace(/[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]/g, '');
      expect(bad, `${n} has invalid path characters: ${bad}`).toBe('');
    }
  });

  it('renders as a currentColor svg on the 24 grid', () => {
    const { container } = render(<Icon name="target" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    // Real holes on any background — the app has a light and a dark theme.
    expect(svg.getAttribute('fill-rule')).toBe('evenodd');
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  /** A glyph appears many times per page, so an `id` would be duplicated. */
  it('emits no id attribute', () => {
    const { container } = render(<Icon name="trophy" />);
    expect(container.querySelector('[id]')).toBeNull();
  });

  it('is hidden from assistive tech unless given a label', () => {
    const { container, rerender } = render(<Icon name="trophy" />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    rerender(<Icon name="trophy" label="Pokal" />);
    expect(screen.getByRole('img', { name: 'Pokal' })).toBeInTheDocument();
  });
});

describe('emoji resolution', () => {
  it('every mapped target is a real icon', () => {
    for (const [emoji, name] of Object.entries(EMOJI_TO_ICON)) {
      expect(ICON_PATHS[name], `${emoji} -> ${name}`).toBeTruthy();
    }
  });

  /**
   * The guarantee that let the call sites drop their emoji entirely: an
   * unmapped glyph still resolves, so nothing falls back to a platform emoji.
   */
  it('never fails to resolve, whatever it is handed', () => {
    const odd = ['🫎', '🥱', '🧿', '🪩', '', '   ', 'not an emoji', '🇦🇹', '👨‍👩‍👧‍👦', '🎯️'];
    for (const v of odd) {
      const n = iconForEmoji(v);
      expect(ICON_PATHS[n], `${JSON.stringify(v)} -> ${n}`).toBeTruthy();
    }
    expect(iconForEmoji(null)).toBeTruthy();
    expect(iconForEmoji(undefined)).toBeTruthy();
  });

  it('passes an icon name straight through', () => {
    expect(iconForEmoji('trophy')).toBe('trophy');
    expect(iconForEmoji('robot')).toBe('robot');
  });

  it('ignores variation selectors and skin tones', () => {
    expect(iconForEmoji('⚠️')).toBe(iconForEmoji('⚠'));
    expect(iconForEmoji('\u{1F44B}\u{1F3FF}')).toBe(iconForEmoji('\u{1F44B}'));
  });
});

describe('the data files carry icon names, not emoji', () => {
  /** All 463 achievements were converted; a stray emoji would render as a fallback. */
  it('every achievement names a real icon', () => {
    const missing = ACHIEVEMENTS
      .filter((a) => !(a.icon in ICON_PATHS))
      .map((a) => `${a.id}: ${a.icon}`);
    expect(missing, `Achievements with an unknown icon:\n${missing.join('\n')}`).toEqual([]);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(400);
  });

  it('no rendered source file still contains an emoji', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === 'tests' ? [] : walk(p);
        return /\.(tsx|ts)$/.test(p) ? [p] : [];
      });

    // Emoji presentation ranges. Comments and console logs are exempt: logs are
    // developer output, and the doc comments here quote the very thing they warn about.
    const EMOJI = /(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/u;
    const EXEMPT = /console\.(log|warn|error|info|debug)|logger\.(log|warn|error|info|debug)|^\s*\*|^\s*\/\//;

    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.includes(`${path.sep}icons${path.sep}emojiMap`)) continue; // the table itself
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (EXEMPT.test(line)) return;
        if (EMOJI.test(line)) offenders.push(`${path.relative(SRC, file)}:${i + 1}  ${line.trim().slice(0, 70)}`);
      });
    }
    expect(offenders, `Emoji left in rendered code:\n${offenders.join('\n')}`).toEqual([]);
  });
});
