import React from 'react';
import Icon from './Icon';
import { iconForEmoji } from './emojiMap';
import { gameIconName, isGameIcon, useAvatarPaths } from './avatarSource';
import { EMOJI_FONT, emojiOf, isEmojiAvatar } from './emojiSource';

interface AvatarGlyphProps {
  /** Stored avatar: `gi:<name>`, `em:<emoji>`, an icon name, or a legacy emoji. */
  avatar?: string | null;
  size?: number | string;
  className?: string;
  label?: string;
}

/**
 * A player's avatar glyph. game-icons.net avatars are drawn on their own
 * 512 grid with the default nonzero fill (the app's own icons use evenodd and
 * a 24 grid); everything else goes through `iconForEmoji` as before. Both use
 * `currentColor`, so every avatar follows the theme.
 *
 * An `em:` avatar (0.35.0) is drawn as the emoji itself, in the system's colour
 * emoji font — the player chose exactly that picture, so it is not themed.
 */
const AvatarGlyph: React.FC<AvatarGlyphProps> = ({ avatar, size = '1em', className = '', label }) => {
  const game = isGameIcon(avatar);
  const paths = useAvatarPaths(game);
  if (isEmojiAvatar(avatar)) {
    // An SVG with a text glyph, so `size` behaves exactly like the icon
    // avatars — including percentages (the start wheel's result uses 100%).
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`m3-icon ${className}`.trim()}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        data-avatar={avatar}
      >
        <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize="86" style={{ fontFamily: EMOJI_FONT }}>
          {emojiOf(avatar)}
        </text>
      </svg>
    );
  }
  if (!game) return <Icon name={iconForEmoji(avatar ?? undefined)} size={size} className={className} label={label} />;
  const d = paths?.[gameIconName(avatar)];
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      className={`m3-icon ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-avatar={avatar}
    >
      {d && <path d={d} />}
    </svg>
  );
};

export default AvatarGlyph;
