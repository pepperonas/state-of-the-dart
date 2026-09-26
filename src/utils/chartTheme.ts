import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Chart colours from the M3 tokens. Recharts draws SVG with literal colours, so
 * the seven chart files carried hard-coded dark greys and a black tooltip —
 * unreadable in the light theme. This reads the live tokens and re-reads them
 * when the theme class on <html>/<body> changes.
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  text: string;
  /** Up to eight distinguishable series colours, primary first. */
  series: string[];
  success: string;
  error: string;
  tooltip: {
    contentStyle: CSSProperties;
    labelStyle: CSSProperties;
    itemStyle: CSSProperties;
  };
}

const FALLBACK = {
  '--m3-outline-variant': '#43474e',
  '--m3-on-surface-variant': '#c3c7cf',
  '--m3-on-surface': '#e2e2e6',
  '--m3-surface-container-highest': '#33353a',
  '--m3-primary': '#9ecaff',
  '--m3-tertiary': '#d7bde4',
  '--m3-secondary': '#bbc7db',
  '--m3-success': '#7fdb97',
  '--m3-error': '#ffb4ab',
} as const;

const read = (name: keyof typeof FALLBACK): string => {
  if (typeof document === 'undefined') return FALLBACK[name];
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || FALLBACK[name];
};

export const readChartTheme = (): ChartTheme => {
  const primary = read('--m3-primary');
  const tertiary = read('--m3-tertiary');
  const secondary = read('--m3-secondary');
  const success = read('--m3-success');
  const error = read('--m3-error');
  const surface = read('--m3-surface-container-highest');
  const text = read('--m3-on-surface');
  return {
    grid: read('--m3-outline-variant'),
    axis: read('--m3-on-surface-variant'),
    text,
    series: [primary, tertiary, success, error, secondary, '#f5b86b', '#6bd3e8', '#e88bb4'],
    success,
    error,
    tooltip: {
      contentStyle: {
        backgroundColor: surface,
        border: `1px solid ${read('--m3-outline-variant')}`,
        borderRadius: 12,
        padding: 12,
        color: text,
      },
      labelStyle: { color: text, fontWeight: 600 },
      itemStyle: { color: text },
    },
  };
};

export const useChartTheme = (): ChartTheme => {
  const [theme, setTheme] = useState(readChartTheme);
  useEffect(() => {
    const update = () => setTheme(readChartTheme());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
};
