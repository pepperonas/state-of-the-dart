/** Relative luminance (WCAG) of a #rgb/#rrggbb colour; null if unparseable. */
export const luminance = (hex: string): number | null => {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Black or white text for a solid background, whichever contrasts more.
 * For chips painted in a data colour (heatmap ranks): white on yellow is
 * unreadable, black on dark red too.
 */
export const readableTextOn = (hex: string): '#000000' | '#ffffff' => {
  const l = luminance(hex);
  if (l === null) return '#ffffff';
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / 0.05;
  return onBlack >= onWhite ? '#000000' : '#ffffff';
};
