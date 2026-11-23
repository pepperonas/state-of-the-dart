import React, { useId } from 'react';
import { BOARD_ORDER } from '../../utils/heatmap';
import { RINGS, NUMBER_RADIUS, bedAngles, wedgePath, discPath } from '../../utils/boardGeometry';

/**
 * The regulation board as the landing page draws it (WDF geometry from
 * boardGeometry, board colours, spider wire, numbers, soft light). Shared by
 * the landing demo and the in-game input board, so both look the same.
 * Coordinates: centre at (0,0), outer double wire at 100, surround to 124.
 */

// Regulation board colours — the board is the subject, not a theme surface.
export const BOARD_COLORS = {
  black: '#1b1a1c', cream: '#efe6cf', red: '#d7263d', green: '#1f8a4c',
  wire: '#9a9aa0', surround: '#121113', number: '#f4f1ea',
} as const;

export const SURROUND_RADIUS = 124;

export type BedZone = 'inner-single' | 'triple' | 'outer-single' | 'double' | 'outer-bull' | 'bull';

export interface BedProps {
  fill?: string;
  className?: string;
  onClick?: () => void;
}

interface BoardFaceProps {
  /** Override fill / add handlers per bed; return nothing for the plain board. */
  bed?: (segment: number, multiplier: 1 | 2 | 3, zone: BedZone) => BedProps | undefined;
}

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
};

const BoardFace: React.FC<BoardFaceProps> = ({ bed }) => {
  const lightId = `board-light-${useId().replace(/:/g, '')}`;
  const props = (segment: number, multiplier: 1 | 2 | 3, zone: BedZone, base: string) => {
    const p = bed?.(segment, multiplier, zone);
    return { fill: p?.fill ?? base, className: p?.className, onClick: p?.onClick };
  };

  return (
    <g>
      <defs>
        <radialGradient id={lightId} cx="30%" cy="22%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.14} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.35} />
        </radialGradient>
      </defs>
      <circle r={SURROUND_RADIUS} fill={BOARD_COLORS.surround} />
      {BOARD_ORDER.map((seg, i) => {
        const { start, end } = bedAngles(seg);
        const dark = i % 2 === 0;
        const single = dark ? BOARD_COLORS.black : BOARD_COLORS.cream;
        const ring = dark ? BOARD_COLORS.red : BOARD_COLORS.green;
        return (
          <g key={seg}>
            <path d={wedgePath(start, end, RINGS.outerBull, RINGS.tripleInner)} {...props(seg, 1, 'inner-single', single)} />
            <path d={wedgePath(start, end, RINGS.tripleInner, RINGS.tripleOuter)} {...props(seg, 3, 'triple', ring)} />
            <path d={wedgePath(start, end, RINGS.tripleOuter, RINGS.doubleInner)} {...props(seg, 1, 'outer-single', single)} />
            <path d={wedgePath(start, end, RINGS.doubleInner, RINGS.doubleOuter)} {...props(seg, 2, 'double', ring)} />
          </g>
        );
      })}
      <path d={discPath(RINGS.bull, RINGS.outerBull)} fillRule="evenodd" {...props(25, 1, 'outer-bull', BOARD_COLORS.green)} />
      <path d={discPath(0, RINGS.bull)} {...props(25, 2, 'bull', BOARD_COLORS.red)} />
      {/* Spider wire */}
      <g stroke={BOARD_COLORS.wire} strokeWidth={0.45} fill="none" opacity={0.7} pointerEvents="none">
        {[RINGS.outerBull, RINGS.tripleInner, RINGS.tripleOuter, RINGS.doubleInner, RINGS.doubleOuter].map(r => <circle key={r} r={r} />)}
        {BOARD_ORDER.map(seg => {
          const a = pt(RINGS.outerBull, bedAngles(seg).start);
          const b = pt(RINGS.doubleOuter, bedAngles(seg).start);
          return <line key={seg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {BOARD_ORDER.map(seg => {
        const { start, end } = bedAngles(seg);
        const p = pt(NUMBER_RADIUS, (start + end) / 2);
        return (
          <text key={seg} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill={BOARD_COLORS.number}
            pointerEvents="none"
            style={{ fontFamily: 'var(--sotd-font-display)', fontSize: 12, letterSpacing: '0.02em' }}>
            {seg}
          </text>
        );
      })}
      {/* Soft light from above-left, so the board sits in the room. */}
      <circle r={SURROUND_RADIUS} fill={`url(#${lightId})`} pointerEvents="none" />
    </g>
  );
};

export default React.memo(BoardFace);
