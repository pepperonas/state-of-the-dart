import { useEffect, useState } from 'react';
import type { EmojiRow } from './emojiData';

/**
 * Emoji avatars (since 0.35.0) are stored as `em:<emoji>`.
 *
 * The prefix keeps them apart from the bare emoji of older profiles, which
 * still resolve to an app icon through `iconForEmoji` — a player who has had
 * an icon for months does not suddenly turn into a platform emoji. Only a
 * deliberate pick from the emoji tab is drawn as an emoji.
 *
 * The catalogue (~80 kB gzip, names in German and English) is a lazy chunk,
 * loaded when the picker opens.
 */
export const EMOJI_PREFIX = 'em:';

export const isEmojiAvatar = (avatar?: string | null): avatar is string =>
  !!avatar && avatar.startsWith(EMOJI_PREFIX) && avatar.length > EMOJI_PREFIX.length;

export const emojiOf = (avatar: string): string => avatar.slice(EMOJI_PREFIX.length);

/** System colour-emoji fonts, so an emoji never falls back to a monochrome text glyph. */
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

let cache: EmojiRow[] | null = null;
let pending: Promise<EmojiRow[]> | null = null;

export const loadEmojiData = (): Promise<EmojiRow[]> => {
  if (cache) return Promise.resolve(cache);
  pending ??= import('./emojiData').then(m => (cache = m.default));
  return pending;
};

/** The catalogue once loaded (null until then); starts loading only when `needed`. */
export const useEmojiData = (needed: boolean): EmojiRow[] | null => {
  const [rows, setRows] = useState<EmojiRow[] | null>(cache);
  useEffect(() => {
    if (!needed || rows) return;
    let alive = true;
    void loadEmojiData().then(r => { if (alive) setRows(r); });
    return () => { alive = false; };
  }, [needed, rows]);
  return rows;
};
