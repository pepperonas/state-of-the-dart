import React from 'react';
import { Dart } from '../../types/index';

interface DartboardProps {
  onDartHit?: (dart: Dart) => void;
  highlightedSegments?: string[];
  interactive?: boolean;
  size?: number;
}

const Dartboard: React.FC<DartboardProps> = ({ 
  onDartHit, 
  highlightedSegments = [], 
  interactive = true,
  size = 400 
}) => {
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
  
  const isHighlighted = (segment: number, multiplier: number) => {
    const notation = multiplier === 3 ? `T${segment}` : multiplier === 2 ? `D${segment}` : `S${segment}`;
    return highlightedSegments.includes(notation);
  };
  
  return (
    <svg 
      width={size} 
      height={size} 
      className="dart-shadow rounded-full"
      style={{ touchAction: 'none' }}
      role="application"
      aria-label="Interactive Dartboard"
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
              fill={isHighlighted(number, 2) ? '#ffd700' : isEven ? '#e30613' : '#00a651'}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 2, 'double')}
              className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
            />
            
            {/* Outer single */}
            <path
              d={getSegmentPath(index, radius * 0.53, radius * 0.85)}
              fill={isHighlighted(number, 1) ? '#ffd700' : isEven ? '#000000' : '#f4f1e8'}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 1, 'single')}
              className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
            />
            
            {/* Triple ring */}
            <path
              d={getSegmentPath(index, radius * 0.43, radius * 0.53)}
              fill={isHighlighted(number, 3) ? '#ffd700' : isEven ? '#e30613' : '#00a651'}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 3, 'triple')}
              className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
            />
            
            {/* Inner single */}
            <path
              d={getSegmentPath(index, radius * 0.12, radius * 0.43)}
              fill={isHighlighted(number, 1) ? '#ffd700' : isEven ? '#000000' : '#f4f1e8'}
              stroke="#c0c0c0"
              strokeWidth="1"
              onClick={() => handleSegmentClick(number, 1, 'single')}
              className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
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
        fill={highlightedSegments.includes('OB') ? '#ffd700' : '#00a651'}
        stroke="#c0c0c0"
        strokeWidth="1"
        onClick={() => handleBullClick(true)}
        className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      />
      
      {/* Inner bull (50 points) - red center */}
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.055}
        fill={highlightedSegments.includes('Bull') ? '#ffd700' : '#e30613'}
        stroke="#c0c0c0"
        strokeWidth="1"
        onClick={() => handleBullClick(false)}
        className={interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      />
    </svg>
  );
};

export default Dartboard;