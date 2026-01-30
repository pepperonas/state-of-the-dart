import React from 'react';
import { isEmoji, getInitial } from '../../utils/avatar';

interface PlayerAvatarProps {
  avatar?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-24 h-24 md:w-32 md:h-32 text-4xl md:text-6xl',
};

const badgeSizeClasses = {
  sm: 'w-4 h-4 text-xs',
  md: 'w-5 h-5 text-sm',
  lg: 'w-6 h-6 text-base',
  xl: 'w-8 h-8 md:w-10 md:h-10 text-lg md:text-xl',
};

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  showBadge = false,
  className = '',
}) => {
  const isAvatarEmoji = avatar && isEmoji(avatar);
  const displayEmoji = isAvatarEmoji ? avatar : null;
  const initial = getInitial(name);

  return (
    <div className={`relative ${className}`}>
      {displayEmoji ? (
        // Show emoji directly
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}>
          <span className="text-2xl md:text-3xl">{displayEmoji}</span>
        </div>
      ) : (
        // Show initial with gradient background
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary-500 via-accent-500 to-success-500 flex items-center justify-center shadow-2xl border-4 border-white/20`}
        >
          <span
            className="font-bold text-white"
            style={{
              fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive, serif",
              textShadow: '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
              letterSpacing: '0.05em',
            }}
          >
            {initial}
          </span>
        </div>
      )}
      {showBadge && displayEmoji && (
        <div
          className={`absolute -bottom-1 -right-1 ${badgeSizeClasses[size]} bg-accent-500 rounded-full border-4 border-dark-900 flex items-center justify-center shadow-lg`}
        >
          <span className="text-xs">{displayEmoji}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
