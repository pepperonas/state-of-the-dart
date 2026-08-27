import React from 'react';
import { getInitial } from '../../utils/avatar';
import { Icon, iconForEmoji } from '../icons';

interface PlayerAvatarProps {
  avatar?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24 md:w-32 md:h-32',
};

/** Glyph is ~55% of the disc, the optical ratio M3 uses for avatars. */
const glyphSize = { sm: 18, md: 26, lg: 34, xl: 52 };

const badgeSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8 md:w-10 md:h-10',
};

/**
 * A player's avatar as a tonal disc with a custom icon.
 *
 * Avatars used to be raw emoji, which meant every player's face was drawn by the
 * operating system: Apple's glossy 3-D on a phone, Google's flat shapes on a
 * tablet, a flat outline on Windows — three different looks for one player, none
 * of them in the app's palette. The stored value is still whatever emoji the user
 * picked; `iconForEmoji` translates it to a glyph from the app's own set, so old
 * profiles keep their meaning and gain the theme.
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
          <span className="m3-title-medium font-bold">{avatar}</span>
        </div>
      ) : avatar ? (
        <div className={disc}>
          <Icon name={iconForEmoji(avatar)} size={glyphSize[size]} />
        </div>
      ) : (
        <div className={disc}>
          <span className="m3-title-medium font-bold">{initial}</span>
        </div>
      )}
      {showBadge && !isUrl && (
        <div
          className={`absolute -bottom-1 -right-1 ${badgeSizeClasses[size]} bg-tertiary-container text-on-tertiary-container rounded-full border-2 border-surface flex items-center justify-center`}
        >
          <Icon name={iconForEmoji(avatar)} size={size === 'sm' ? 10 : 12} />
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
