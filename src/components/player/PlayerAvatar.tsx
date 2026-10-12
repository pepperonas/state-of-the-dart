import React from 'react';
import { getInitial } from '../../utils/avatar';
import { AvatarGlyph, avatarGlyphSize } from '../icons';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface PlayerAvatarProps {
  avatar?: string;
  name: string;
  size?: AvatarSize;
  showBadge?: boolean;
  className?: string;
}

/**
 * Disc sizes (0.35.1: one step up). `xs` is the old `sm` (32 px) for the few
 * places where a row must stay as low as before — a chip, a table header.
 */
const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-[4.5rem] h-[4.5rem]',
  xl: 'w-24 h-24 md:w-32 md:h-32',
};

/** Initials scale with the disc too (they were title-medium at every size). */
const letterClasses: Record<AvatarSize, string> = {
  xs: 'm3-title-small',
  sm: 'm3-title-medium',
  md: 'm3-title-large',
  lg: 'm3-headline-small',
  xl: 'm3-headline-large',
};

const badgeSizeClasses: Record<AvatarSize, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-8 h-8 md:w-10 md:h-10',
};

/**
 * A player's avatar as a tonal disc with a custom icon.
 *
 * Avatars used to be raw emoji, which meant every player's face was drawn by the
 * operating system: Apple's glossy 3-D on a phone, Google's flat shapes on a
 * tablet, a flat outline on Windows — three different looks for one player, none
 * of them in the app's palette. The stored value is still whatever emoji the user
 * picked; `AvatarGlyph` translates it to a glyph from the app's own set, so old
 * profiles keep their meaning and gain the theme. Since 0.33.0 an avatar can
 * also be a game-icons.net glyph (`gi:<name>`).
 */
const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  showBadge = false,
  className = '',
}) => {
  const isUrl = !!avatar && /^https?:\/\//.test(avatar);
  // An avatar that is plain text (not an emoji, not a URL) is a person's initial
  // and should stay as a letter — only glyph avatars become icons.
  const isLetter = !!avatar && !isUrl && /^[\p{L}\p{N}]$/u.test(avatar);
  const initial = getInitial(name);

  const disc = `${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0
    bg-primary-container text-on-primary-container`;

  return (
    <div className={`relative ${className}`}>
      {isUrl ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
        />
      ) : isLetter ? (
        <div className={disc}>
          <span className={`${letterClasses[size]} m3-emphasized`}>{avatar}</span>
        </div>
      ) : avatar ? (
        <div className={disc}>
          <AvatarGlyph avatar={avatar} size={avatarGlyphSize(avatar)} />
        </div>
      ) : (
        <div className={disc}>
          <span className={`${letterClasses[size]} m3-emphasized`}>{initial}</span>
        </div>
      )}
      {showBadge && !isUrl && (
        <div
          className={`absolute -bottom-1 -right-1 ${badgeSizeClasses[size]} bg-tertiary-container text-on-tertiary-container rounded-full border-2 border-surface flex items-center justify-center`}
        >
          <AvatarGlyph avatar={avatar} size={avatarGlyphSize(avatar)} />
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
