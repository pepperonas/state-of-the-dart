import { isGameIcon } from './avatarSource';
import { isEmojiAvatar } from './emojiSource';

/**
 * How much of the disc the glyph fills. It used to be fixed pixel sizes at
 * ~55 % — and the xl disc grows to 128 px on desktop while its glyph stayed at
 * 52 px (41 %). A fraction scales with the disc, whatever its size.
 *
 * The three kinds differ optically: a game-icons.net glyph fills its 512 grid
 * almost edge to edge, an app icon keeps padding inside its 24 grid, an emoji
 * sits between. Each fraction makes them look the same size in the disc.
 */
export const GLYPH_FILL = { game: 0.62, emoji: 0.66, app: 0.7 } as const;

export const glyphFill = (avatar?: string | null): number =>
  isGameIcon(avatar) ? GLYPH_FILL.game : isEmojiAvatar(avatar) ? GLYPH_FILL.emoji : GLYPH_FILL.app;

const pct = (f: number) => `${Math.round(f * 100)}%`;

/** The glyph size for a disc drawn outside PlayerAvatar (a percentage of it). */
export const avatarGlyphSize = (avatar?: string | null): string => pct(glyphFill(avatar));
