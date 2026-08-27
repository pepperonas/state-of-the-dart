import React from 'react';
import { ICON_PATHS, type IconName } from './paths';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Edge length in px. Defaults to 1em so an icon tracks the text beside it. */
  size?: number | string;
  /**
   * Screen-reader label. Omit for a purely decorative icon — it is then hidden
   * from assistive tech, which is right when the adjacent text already says it.
   */
  label?: string;
}

/**
 * Renders one glyph from the custom Material 3 Expressive set.
 *
 * `currentColor` and a default size of `1em` are the whole point: an emoji could
 * do neither, so it never matched the theme or the type it sat next to.
 */
const Icon: React.FC<IconProps> = ({ name, size = '1em', label, className = '', ...rest }) => {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      // Real holes, so a glyph reads correctly on any background — the app has
      // both a light and a dark theme, and a hole faked with a background-coloured
      // shape is a visible blob on one of them.
      fillRule="evenodd"
      clipRule="evenodd"
      className={`m3-icon ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
};

export default Icon;
