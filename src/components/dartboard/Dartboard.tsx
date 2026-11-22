import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dart } from '../../types/index';
import { BOARD_ROUTE, BOARD_ALT } from './boardColors';

interface DartboardProps {
  onDartHit?: (dart: Dart) => void;
  highlightedSegments?: string[];
  /** Beds of the alternative checkout, in a second colour (bug report 21.02.). */
  alternativeSegments?: string[];
  interactive?: boolean;
  size?: number;
}

const Dartboard: React.FC<DartboardProps> = ({ 
  onDartHit, 
  highlightedSegments = [], 
  alternativeSegments = [],
  interactive = true,
  size = 400 
}) => {
  const { t } = useTranslation();
  const numbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const radius = size / 2;
  const segmentAngle = 18;
  
  const handleSegmentClick = (segment: number, multiplier: 1 | 2 | 3, bed: string) => {
    if (!interactive || !onDartHit) return;
    
    const score = multiplier === 1 ? segment : segment * multiplier;
    onDartHit({
      segment,
      multiplier,
      score,
      bed: bed as 'single' | 'double' | 'triple'
    });
  };
  
  const handleBullClick = (isOuter: boolean) => {
    if (!interactive || !onDartHit) return;
    
    if (isOuter) {
      onDartHit({
        segment: 25,
        multiplier: 1,
        score: 25,
        bed: 'outer-bull'
      });
    } else {
      onDartHit({
        segment: 50,
        multiplier: 2,
        score: 50,
        bed: 'bull'
      });
    }
  };
  
  /** Class list for one board segment: press feedback always, a slow breathe
   *  while it is part of the suggested checkout. */
  const segmentClass = (highlighted: boolean) =>
    [
      'm3-board-segment',
      interactive ? 'cursor-pointer hover:opacity-80' : '',
      highlighted ? 'm3-board-hit' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const getSegmentPath = (index: number, innerRadius: number, outerRadius: number) => {
    const startAngle = (index * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
    const endAngle = ((index + 1) * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
    
    const x1 = radius + innerRadius * Math.cos(startAngle);
    const y1 = radius + innerRadius * Math.sin(startAngle);
    const x2 = radius + outerRadius * Math.cos(startAngle);
    const y2 = radius + outerRadius * Math.sin(startAngle);
    const x3 = radius + outerRadius * Math.cos(endAngle);
    const y3 = radius + outerRadius * Math.sin(endAngle);
    const x4 = radius + innerRadius * Math.cos(endAngle);
    const y4 = radius + innerRadius * Math.sin(endAngle);
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`;
  };
  
  const notationOf = (segment: number, multiplier: number) =>
    multiplier === 3 ? `T${segment}` : multiplier === 2 ? `D${segment}` : `S${segment}`;
  const isHighlighted = (segment: number, multiplier: number) => highlightedSegments.includes(notationOf(segment, multiplier));
  // The main route wins where both routes use the same bed.
  const isAlternative = (segment: number, multiplier: number) =>
    !isHighlighted(segment, multiplier) && alternativeSegments.includes(notationOf(segment, multiplier));
  /** Gold = suggested route, blue = alternative, else the board's own colour. */
  const fillOf = (segment: number, multiplier: number, base: string) =>
    isHighlighted(segment, multiplier) ? BOARD_ROUTE : isAlternative(segment, multiplier) ? BOARD_ALT : base;
  // The checkout table writes the outer bull as '25'.
  const outerBull = (list: string[]) => list.includes('OB') || list.includes('25');
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="dart-shadow rounded-full max-w-full h-auto"
      style={{ touchAction: 'none' }}
      role="application"
      aria-label={t('dartboard.label')}
    >
      {/* Board background */}
      <circle cx={radius} cy={radius} r={radius} fill="#1a1a1a" />
      
      {/* Wire rings */}
      <circle cx={radius} cy={radius} r={radius * 0.95} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      <circle cx={radius} cy={radius} r={radius * 0.85} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      <circle cx={radius} cy={radius} r={radius * 0.53} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      <circle cx={radius} cy={radius} r={radius * 0.43} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      <circle cx={radius} cy={radius} r={radius * 0.12} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      <circle cx={radius} cy={radius} r={radius * 0.055} fill="none" stroke="#c0c0c0" strokeWidth="1" />
      
      {/* Segments */}
      {numbers.map((number, index) => {
        const isEven = index % 2 === 0;
        
        return (
          <g key={number}>
            {/* Double ring */}
            <path
              d={getSegmentPath(index, radius * 0.85, radius * 0.95)}
              fill={fillOf(number, 2, isEven ? '#e30613' : '#00a651')}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 2, 'double')}
              className={segmentClass(isHighlighted(number, 2) || isAlternative(number, 2))}
            />
            
            {/* Outer single */}
            <path
              d={getSegmentPath(index, radius * 0.53, radius * 0.85)}
              fill={fillOf(number, 1, isEven ? '#000000' : '#f4f1e8')}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 1, 'single')}
              className={segmentClass(isHighlighted(number, 1) || isAlternative(number, 1))}
            />
            
            {/* Triple ring */}
            <path
              d={getSegmentPath(index, radius * 0.43, radius * 0.53)}
              fill={fillOf(number, 3, isEven ? '#e30613' : '#00a651')}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 3, 'triple')}
              className={segmentClass(isHighlighted(number, 3) || isAlternative(number, 3))}
            />
            
            {/* Inner single */}
            <path
              d={getSegmentPath(index, radius * 0.12, radius * 0.43)}
              fill={fillOf(number, 1, isEven ? '#000000' : '#f4f1e8')}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 1, 'single')}
              className={segmentClass(isHighlighted(number, 1) || isAlternative(number, 1))}
            />
            
            {/* Number label */}
            <text
              x={radius + radius * 0.9 * Math.cos((index * segmentAngle - 90) * Math.PI / 180)}
              y={radius + radius * 0.9 * Math.sin((index * segmentAngle - 90) * Math.PI / 180)}
              fill="#ffffff"
              fontSize={size * 0.04}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {number}
            </text>
          </g>
        );
      })}
      
      {/* Outer bull (25 points) - green ring */}
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.12}
        fill={outerBull(highlightedSegments) ? BOARD_ROUTE : outerBull(alternativeSegments) ? BOARD_ALT : '#00a651'}
        stroke="#c0c0c0"
        strokeWidth="1"
        onClick={() => handleBullClick(true)}
        className={segmentClass(outerBull(highlightedSegments) || outerBull(alternativeSegments))}
      />
      
      {/* Inner bull (50 points) - red center */}
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.055}
        fill={highlightedSegments.includes('Bull') ? BOARD_ROUTE : alternativeSegments.includes('Bull') ? BOARD_ALT : '#e30613'}
        stroke="#c0c0c0"
        strokeWidth="1"
        onClick={() => handleBullClick(false)}
        className={segmentClass(highlightedSegments.includes('Bull') || alternativeSegments.includes('Bull'))}
      />
    </svg>
  );
};

export default React.memo(Dartboard);