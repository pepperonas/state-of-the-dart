import { useMediaQuery } from './useMediaQuery';

/** M3 window size classes by width (dp ≈ CSS px). */
export type WidthClass = 'compact' | 'medium' | 'expanded' | 'large' | 'xl';

export const widthClassFor = (width: number): WidthClass =>
  width < 600 ? 'compact' : width < 840 ? 'medium' : width < 1200 ? 'expanded' : width < 1600 ? 'large' : 'xl';

/**
 * Panes for the game screen: one up to medium, two on expanded, three from
 * large. A phone held sideways (compact height) never splits — M3 advises
 * against two panes there, and the height is what runs out.
 */
export const paneCountFor = (width: WidthClass, compactHeight: boolean): 1 | 2 | 3 =>
  compactHeight ? 1 : width === 'expanded' ? 2 : width === 'large' || width === 'xl' ? 3 : 1;

/** Same as the `phoneland` Tailwind screen. */
export const COMPACT_HEIGHT_QUERY = '(orientation: landscape) and (max-height: 500px)';

/** The current window class, kept live. */
export function useWindowClass(): { width: WidthClass; compactHeight: boolean; panes: 1 | 2 | 3 } {
  const medium = useMediaQuery('(min-width: 600px)');
  const expanded = useMediaQuery('(min-width: 840px)');
  const large = useMediaQuery('(min-width: 1200px)');
  const xl = useMediaQuery('(min-width: 1600px)');
  const compactHeight = useMediaQuery(COMPACT_HEIGHT_QUERY);
  const width: WidthClass = xl ? 'xl' : large ? 'large' : expanded ? 'expanded' : medium ? 'medium' : 'compact';
  return { width, compactHeight, panes: paneCountFor(width, compactHeight) };
}
