import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dart } from '../../types/index';
import { BOARD_ROUTE, BOARD_ALT } from './boardColors';
import BoardFace, { SURROUND_RADIUS, type BedZone } from './BoardFace';

interface DartboardProps {
  onDartHit?: (dart: Dart) => void;
  highlightedSegments?: string[];
  /** Beds of the alternative checkout, in a second colour (bug report 21.02.). */
  alternativeSegments?: string[];
  interactive?: boolean;
  size?: number;
}

/**
 * The input board: the landing page's regulation board (BoardFace), every bed
 * a tap target. Gold = suggested checkout, blue = alternative.
 */
const Dartboard: React.FC<DartboardProps> = ({
  onDartHit,
  highlightedSegments = [],
  alternativeSegments = [],
  interactive = true,
  size = 400,
}) => {
  const { t } = useTranslation();

  const hit = (segment: number, multiplier: 1 | 2 | 3, zone: BedZone) => {
    if (!interactive || !onDartHit) return;
    if (zone === 'outer-bull') { onDartHit({ segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' }); return; }
    if (zone === 'bull') { onDartHit({ segment: 50, multiplier: 2, score: 50, bed: 'bull' }); return; }
    onDartHit({
      segment,
      multiplier,
      score: segment * multiplier,
      bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single',
    });
  };

  /** Checkout notation of a bed; the table writes the outer bull as '25'. */
  const inList = (list: string[], segment: number, multiplier: number, zone: BedZone) => {
    if (zone === 'outer-bull') return list.includes('OB') || list.includes('25');
    if (zone === 'bull') return list.includes('Bull');
    const n = multiplier === 3 ? `T${segment}` : multiplier === 2 ? `D${segment}` : `S${segment}`;
    return list.includes(n);
  };

  /** Press feedback always, a slow breathe while part of a suggested route. */
  const segmentClass = (highlighted: boolean) =>
    ['m3-board-segment', interactive ? 'cursor-pointer hover:opacity-80' : '', highlighted ? 'm3-board-hit' : '']
      .filter(Boolean)
      .join(' ');

  const view = SURROUND_RADIUS + 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
      className="dart-shadow rounded-full max-w-full h-auto"
      style={{ touchAction: 'none' }}
      role="application"
      aria-label={t('dartboard.label')}
    >
      <BoardFace
        bed={(segment, multiplier, zone) => {
          const route = inList(highlightedSegments, segment, multiplier, zone);
          // The main route wins where both routes use the same bed.
          const alt = !route && inList(alternativeSegments, segment, multiplier, zone);
          return {
            fill: route ? BOARD_ROUTE : alt ? BOARD_ALT : undefined,
            className: segmentClass(route || alt),
            onClick: () => hit(segment, multiplier, zone),
          };
        }}
      />
    </svg>
  );
};

export default Dartboard;
