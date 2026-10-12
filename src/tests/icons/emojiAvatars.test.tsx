import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '../../i18n/config';
import de from '../../i18n/locales/de.json';
import en from '../../i18n/locales/en.json';
import EMOJI from '../../components/icons/emojiData';
import { EMOJI_GROUP_KEYS, EMOJI_COUNT } from '../../components/icons/emojiGroups';
import { isEmojiAvatar, emojiOf, EMOJI_PREFIX } from '../../components/icons/emojiSource';
import AvatarGlyph from '../../components/icons/AvatarGlyph';
import PlayerAvatar from '../../components/player/PlayerAvatar';
import AvatarPicker from '../../components/player/AvatarPicker';

/**
 * 0.35.0 — every Unicode emoji as a player avatar, besides the icons.
 * Stored as `em:<emoji>`; a bare emoji from an older profile still becomes an
 * app icon, so nobody's avatar changes on its own.
 */
const ROOT = path.resolve(__dirname, '../../..');

describe('emoji catalogue', () => {
  it('holds every emoji outside the component group, each once, with both names', () => {
    expect(EMOJI.length).toBe(EMOJI_COUNT);
    expect(EMOJI.length).toBeGreaterThan(1800);
    expect(new Set(EMOJI.map(r => r[0])).size).toBe(EMOJI.length);
    for (const r of EMOJI) {
      expect(r[2], r[0]).toBeTruthy();
      expect(r[3], r[0]).toBeTruthy();
      expect(r[1], r[0]).toBeGreaterThanOrEqual(0);
      expect(r[1], r[0]).toBeLessThan(EMOJI_GROUP_KEYS.length);
    }
    // Spot checks across the groups.
    for (const e of ['😀', '🎯', '🍺', '🐉', '🇩🇪', '❤️', '🧑‍🚀']) expect(EMOJI.some(r => r[0] === e), e).toBe(true);
  });

  it('every group has emoji and a label in both languages', () => {
    EMOJI_GROUP_KEYS.forEach((key, i) => {
      expect(EMOJI.some(r => r[1] === i), key).toBe(true);
      expect((de.avatar_picker as Record<string, unknown>)[`emoji_group_${key}`], `de ${key}`).toBeTruthy();
      expect((en.avatar_picker as Record<string, unknown>)[`emoji_group_${key}`], `en ${key}`).toBeTruthy();
    });
  });

  it('skin tones are five uniform variants of the same emoji', () => {
    const wave = EMOJI.find(r => r[0] === '👋')!;
    expect(wave[5]).toEqual(['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿']);
    for (const r of EMOJI.filter(r => r[5])) expect(r[5], r[0]).toHaveLength(5);
  });

  it('is a lazy chunk — nothing eager imports the data', () => {
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === 'tests' ? [] : walk(p);
      return /\.(tsx?)$/.test(p) ? [p] : [];
    });
    const eager = walk(path.join(ROOT, 'src')).filter(f => /from ['"][./]*(icons\/)?emojiData['"]/.test(
      fs.readFileSync(f, 'utf8').replace(/(import|export) type[^;]+;/g, ''),
    ));
    expect(eager).toEqual([]);
  });
});

describe('emoji avatars', () => {
  it('the prefix tells a picked emoji from a legacy one', () => {
    expect(isEmojiAvatar('em:🍺')).toBe(true);
    expect(emojiOf('em:🍺')).toBe('🍺');
    expect(isEmojiAvatar('🍺')).toBe(false);
    expect(isEmojiAvatar('em:')).toBe(false);
    expect(isEmojiAvatar('gi:wolf-head')).toBe(false);
    expect(isEmojiAvatar(undefined)).toBe(false);
  });

  it('draws the emoji itself, sized like an icon (also in percent)', () => {
    const { container } = render(<><AvatarGlyph avatar="em:🍺" size={30} /><AvatarGlyph avatar="em:🐉" size="100%" /></>);
    const [a, b] = container.querySelectorAll('svg');
    expect(a.getAttribute('width')).toBe('30');
    expect(a.querySelector('text')?.textContent).toBe('🍺');
    expect(b.getAttribute('width')).toBe('100%');
    expect(b.querySelector('text')?.textContent).toBe('🐉');
  });

  it('a legacy bare emoji still becomes an app icon', () => {
    const { container } = render(<AvatarGlyph avatar="🎯" />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(container.querySelector('text')).toBeNull();
  });

  it('PlayerAvatar shows an emoji avatar, not the initial', () => {
    const { container } = render(<PlayerAvatar avatar="em:🦊" name="Fuchs" />);
    expect(container.querySelector('text')?.textContent).toBe('🦊');
    expect(container).not.toHaveTextContent('F');
  });
});

describe('AvatarPicker with emoji', () => {
  it('the emoji tab lists a group and stores the pick as em:<emoji>', async () => {
    const onSelect = vi.fn();
    render(<AvatarPicker onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Emojis' }));
    await userEvent.click(screen.getByRole('button', { name: 'Essen & Trinken' }));
    const grid = await screen.findByTestId('emoji-grid');
    await userEvent.click(within(grid).getByRole('button', { name: 'Bierkrug' }));
    expect(onSelect).toHaveBeenCalledWith(`${EMOJI_PREFIX}🍺`);
  });

  it('search finds icons and emoji, by German keyword too', async () => {
    const onSelect = vi.fn();
    render(<AvatarPicker onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'Drache');
    expect(within(screen.getByTestId('icon-grid')).getByRole('button', { name: 'Drache' })).toBeInTheDocument();
    const grid = await screen.findByTestId('emoji-grid');
    await userEvent.click(within(grid).getByRole('button', { name: 'Drache' }));
    expect(onSelect).toHaveBeenCalledWith(`${EMOJI_PREFIX}🐉`);
  });

  it('a skin tone applies to emoji that have one', async () => {
    const onSelect = vi.fn();
    render(<AvatarPicker onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Emojis' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Mitteldunkel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menschen' }));
    const grid = await screen.findByTestId('emoji-grid');
    await userEvent.click(within(grid).getByRole('button', { name: 'winkende Hand' }));
    expect(onSelect).toHaveBeenCalledWith(`${EMOJI_PREFIX}👋🏾`);
  });

  it('opens on the emoji tab with the current emoji selected', async () => {
    render(<AvatarPicker onSelect={vi.fn()} onClose={vi.fn()} currentEmoji="em:😀" />);
    expect(screen.getByRole('radio', { name: 'Emojis' })).toHaveAttribute('aria-checked', 'true');
    const grid = await screen.findByTestId('emoji-grid');
    await waitFor(() => expect(within(grid).getByRole('button', { name: 'grinsendes Gesicht' })).toHaveAttribute('aria-pressed', 'true'));
  });
});
