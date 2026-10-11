import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '../../i18n/config';
import de from '../../i18n/locales/de.json';
import en from '../../i18n/locales/en.json';
import AVATAR_PATHS from '../../components/icons/avatarPaths';
import { GAME_ICON_GROUPS, GAME_ICON_AUTHORS, GAME_ICON_AUTHOR_NAMES } from '../../components/icons/avatarCatalog';
import AvatarGlyph from '../../components/icons/AvatarGlyph';
import AvatarPicker from '../../components/player/AvatarPicker';
import Impressum from '../../components/legal/Impressum';
import { MemoryRouter } from 'react-router-dom';

/**
 * 0.33.0 — player avatars from game-icons.net (CC BY 3.0). The data is
 * generated from vendored SVGs, every icon has an author and a label in both
 * languages, and the credit is shown where the icons are offered.
 */
const ROOT = path.resolve(__dirname, '../../..');
const names = GAME_ICON_GROUPS.flatMap(g => g.names);

describe('game-icons avatar data', () => {
  it('165 icons, unique, each with path data', () => {
    expect(names).toHaveLength(165);
    expect(new Set(names).size).toBe(names.length);
    expect(Object.keys(AVATAR_PATHS).sort()).toEqual([...names].sort());
  });

  it('paths are plain path data — no ids, urls or markup', () => {
    for (const n of names) {
      const d = AVATAR_PATHS[n];
      expect(d, n).toMatch(/^[Mm]/); // a leading relative moveto counts as absolute
      expect(d, n).not.toMatch(/[<>"=]|url\(|id/);
    }
  });

  it('matches the vendored originals (the generator was re-run)', () => {
    for (const n of names) {
      const svg = fs.readFileSync(path.join(ROOT, 'tools/avatar-icons/svg', `${n}.svg`), 'utf8');
      const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => m[1]).filter(d => d.replace(/ /g, '') !== 'M00h512v512H0z');
      expect(ds, n).toEqual([AVATAR_PATHS[n]]);
    }
  });

  it('every icon has an author, and every author is credited by name', () => {
    const manifest = fs.readFileSync(path.join(ROOT, 'tools/avatar-icons/manifest.tsv'), 'utf8').trim().split('\n').slice(1);
    expect(manifest).toHaveLength(165);
    for (const n of names) expect(GAME_ICON_AUTHORS[n], n).toBeTruthy();
    expect(GAME_ICON_AUTHOR_NAMES.length).toBe(new Set(Object.values(GAME_ICON_AUTHORS)).size);
  });

  it('every icon and group has a German and an English label', () => {
    const gi = (l: typeof de) => (l.avatar_picker as unknown as { gi: Record<string, string> }).gi;
    for (const n of names) {
      expect(gi(de)[n], `de ${n}`).toBeTruthy();
      expect(gi(en)[n], `en ${n}`).toBeTruthy();
    }
    for (const g of GAME_ICON_GROUPS) {
      expect((de.avatar_picker as Record<string, unknown>)[`group_${g.key}`]).toBeTruthy();
      expect((en.avatar_picker as Record<string, unknown>)[`group_${g.key}`]).toBeTruthy();
    }
  });
});

describe('AvatarGlyph', () => {
  it('draws a game icon on its 512 grid with the default fill rule', async () => {
    const { container } = render(<AvatarGlyph avatar="gi:wolf-head" size={30} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(svg.getAttribute('fill-rule')).toBeNull();
    await waitFor(() => expect(container.querySelector('path')?.getAttribute('d')).toBe(AVATAR_PATHS['wolf-head']));
  });

  it('keeps drawing old avatars (icon names, emoji) from the app set', () => {
    const { container } = render(<><AvatarGlyph avatar="trophy" /><AvatarGlyph avatar="🎯" /></>);
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy();
    }
  });

  it('an unknown game icon draws an empty glyph instead of crashing', async () => {
    const { container } = render(<AvatarGlyph avatar="gi:no-such-icon" />);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });
});

describe('AvatarPicker with game icons', () => {
  it('finds an icon by its German name and stores it as gi:<name>', async () => {
    const onSelect = vi.fn();
    render(<AvatarPicker onSelect={onSelect} onClose={vi.fn()} />);
    // "Drache" is only in the German label (the stored name is dragon-head).
    await userEvent.type(screen.getByRole('textbox'), 'Drache');
    await userEvent.click(screen.getByRole('button', { name: 'Drache' }));
    expect(onSelect).toHaveBeenCalledWith('gi:dragon-head');
  });

  it('shows the current game-icon avatar as selected', () => {
    render(<AvatarPicker onSelect={vi.fn()} onClose={vi.fn()} currentEmoji="gi:wolf-head" />);
    return userEvent.click(screen.getByRole('button', { name: 'Tiere' })).then(() => {
      expect(screen.getByRole('button', { name: 'Wolf' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('credits game-icons.net and the authors (CC BY 3.0)', () => {
    render(<AvatarPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    const credit = screen.getByTestId('avatar-credit');
    expect(credit).toHaveTextContent('game-icons.net');
    expect(credit).toHaveTextContent('CC BY 3.0');
    expect(credit).toHaveTextContent('Lorc');
    expect(credit.querySelector('a')).toHaveAttribute('href', 'https://game-icons.net');
  });

  it('the imprint names the source, the licence and every author', () => {
    render(<MemoryRouter><Impressum /></MemoryRouter>);
    const credits = screen.getByTestId('impressum-credits');
    expect(credits).toHaveTextContent('CC BY 3.0');
    for (const a of GAME_ICON_AUTHOR_NAMES) expect(credits).toHaveTextContent(a);
  });
});
