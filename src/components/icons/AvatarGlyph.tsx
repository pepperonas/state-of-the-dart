import React from 'react';
import Icon from './Icon';
import { iconForEmoji } from './emojiMap';
import { gameIconName, isGameIcon, useAvatarPaths } from './avatarSource';

interface AvatarGlyphProps {
  /** Stored avatar: `gi:<name>`, an icon name, or a legacy emoji. */
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
 */
const AvatarGlyph: React.FC<AvatarGlyphProps> = ({ avatar, size = '1em', className = '', label }) => {
  const game = isGameIcon(avatar);
  const paths = useAvatarPaths(game);
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
