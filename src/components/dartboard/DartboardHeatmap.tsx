import React, { useMemo } from 'react';
import { HeatmapData, SegmentHeat } from '../../types';
import { calculateSegmentHeat, formatSegmentName, getHeatColor } from '../../utils/heatmap';
import { Flame, TrendingUp } from 'lucide-react';

interface DartboardHeatmapProps {
  heatmapData: HeatmapData;
  size?: number;
}

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const DartboardHeatmap: React.FC<DartboardHeatmapProps> = ({
  heatmapData,
  size = 400
}) => {
  const heats = useMemo(() => calculateSegmentHeat(heatmapData), [heatmapData]);
  
  // Create lookup map for quick access
  const heatMap = useMemo(() => {
    const map: { [key: string]: SegmentHeat } = {};
    heats.forEach(heat => {
      const key = `${heat.segment}-${heat.multiplier}`;
      map[key] = heat;
    });
    return map;
  }, [heats]);
  
  const getSegmentColor = (segment: number, multiplier: number): string => {
    const key = `${segment}-${multiplier}`;
    const heat = heatMap[key];
    return heat ? heat.color : '#1e293b';
  };
  
  const getSegmentOpacity = (segment: number, multiplier: number): number => {
    const key = `${segment}-${multiplier}`;
    const heat = heatMap[key];
    if (!heat) return 0.2;
    // Normalize opacity between 0.3 and 1.0
    return 0.3 + (heat.percentage / 10) * 0.7;
  };
  
  const center = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.05;
  const bullRadius = size * 0.08;
  const outerBullRadius = size * 0.15;
  const tripleInnerRadius = outerRadius * 0.57;
  const tripleOuterRadius = outerRadius * 0.64;
  const doubleInnerRadius = outerRadius * 0.95;
  
  // Generate SVG paths for each segment
  const generateSegmentPath = (
    index: number,
    innerR: number,
    outerR: number
  ): string => {
    const angleStep = (2 * Math.PI) / 20;
    const startAngle = index * angleStep - Math.PI / 2 - angleStep / 2;
    const endAngle = startAngle + angleStep;
    
    const x1 = center + innerR * Math.cos(startAngle);
    const y1 = center + innerR * Math.sin(startAngle);
    const x2 = center + outerR * Math.cos(startAngle);
    const y2 = center + outerR * Math.sin(startAngle);
    const x3 = center + outerR * Math.cos(endAngle);
    const y3 = center + outerR * Math.sin(endAngle);
    const x4 = center + innerR * Math.cos(endAngle);
    const y4 = center + innerR * Math.sin(endAngle);
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`;
  };
  
  // Top segments with most hits
  const topSegments = useMemo(() => {
    return [...heats]
      .filter(h => h.segment !== 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [heats]);
  
  return (
    <div className="space-y-6">
      {/* Dartboard Visualization */}
      <div className="flex justify-center">
        <svg
          width={size}
          height={size}
          className="drop-shadow-2xl"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="#0a0a0a"
            stroke="#404040"
            strokeWidth="2"
          />
          
          {/* Segments */}
          {SEGMENTS.map((segment, index) => (
            <g key={`segment-${segment}`}>
              {/* Outer Singles */}
              <path
                d={generateSegmentPath(index, doubleInnerRadius, outerRadius)}
                fill={getSegmentColor(segment, 1)}
                opacity={getSegmentOpacity(segment, 1)}
                stroke="#262626"
                strokeWidth="1"
              >
                <title>{formatSegmentName(segment, 1)}: {heatMap[`${segment}-1`]?.count || 0} hits</title>
              </path>
              
              {/* Doubles */}
              <path
                d={generateSegmentPath(index, outerRadius * 0.88, doubleInnerRadius)}
                fill={getSegmentColor(segment, 2)}
                opacity={getSegmentOpacity(segment, 2)}
                stroke="#262626"
                strokeWidth="1"
              >
                <title>{formatSegmentName(segment, 2)}: {heatMap[`${segment}-2`]?.count || 0} hits</title>
              </path>
              
              {/* Inner Singles */}
              <path
                d={generateSegmentPath(index, tripleOuterRadius, outerRadius * 0.88)}
                fill={getSegmentColor(segment, 1)}
                opacity={getSegmentOpacity(segment, 1)}
                stroke="#262626"
                strokeWidth="1"
              >
                <title>{formatSegmentName(segment, 1)}: {heatMap[`${segment}-1`]?.count || 0} hits</title>
              </path>
              
              {/* Triples */}
              <path
                d={generateSegmentPath(index, tripleInnerRadius, tripleOuterRadius)}
                fill={getSegmentColor(segment, 3)}
                opacity={getSegmentOpacity(segment, 3)}
                stroke="#262626"
                strokeWidth="1"
              >
                <title>{formatSegmentName(segment, 3)}: {heatMap[`${segment}-3`]?.count || 0} hits</title>
              </path>
              
              {/* Inner Singles (center area) */}
              <path
                d={generateSegmentPath(index, outerBullRadius, tripleInnerRadius)}
                fill={getSegmentColor(segment, 1)}
                opacity={getSegmentOpacity(segment, 1)}
                stroke="#262626"
                strokeWidth="1"
              >
                <title>{formatSegmentName(segment, 1)}: {heatMap[`${segment}-1`]?.count || 0} hits</title>
              </path>
              
              {/* Segment Numbers */}
              <text
                x={center + (outerRadius + 15) * Math.cos(index * (2 * Math.PI / 20) - Math.PI / 2)}
                y={center + (outerRadius + 15) * Math.sin(index * (2 * Math.PI / 20) - Math.PI / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="14"
                fontWeight="bold"
              >
                {segment}
              </text>
            </g>
          ))}
          
          {/* Outer Bull */}
          <circle
            cx={center}
            cy={center}
            r={outerBullRadius}
            fill={getSegmentColor(25, 1)}
            opacity={getSegmentOpacity(25, 1)}
            stroke="#262626"
            strokeWidth="1"
          >
            <title>Outer Bull: {heatMap['25-1']?.count || 0} hits</title>
          </circle>
          
          {/* Bull */}
          <circle
            cx={center}
            cy={center}
            r={bullRadius}
            fill={getSegmentColor(25, 2)}
            opacity={getSegmentOpacity(25, 2)}
            stroke="#262626"
            strokeWidth="1"
          >
            <title>Bull: {heatMap['25-2']?.count || 0} hits</title>
          </circle>
          
          {/* Center point */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#0a0a0a"
          />
        </svg>
      </div>
      
      {/* Legend */}
      <div className="glass-card p-4 rounded-lg">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <Flame size={18} className="text-primary-400" />
          Farblegende
        </h4>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Selten', color: '#3b82f6', range: '< 0.5%' },
            { label: 'Gelegentlich', color: '#10b981', range: '1-2%' },
            { label: 'Häufig', color: '#fbbf24', range: '3-4%' },
            { label: 'Sehr häufig', color: '#ef4444', range: '> 5%' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-300">
                {item.label} ({item.range})
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Segments */}
      {topSegments.length > 0 && (
        <div className="glass-card p-4 rounded-lg">
          <h4 className="font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-400" />
            Top 5 Trefferzonen
          </h4>
          <div className="space-y-2">
            {topSegments.map((heat, index) => (
              <div
                key={`${heat.segment}-${heat.multiplier}`}
                className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-primary-400">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white">
                      {formatSegmentName(heat.segment, heat.multiplier)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {heat.count} Treffer ({heat.percentage.toFixed(2)}%)
                    </div>
                  </div>
                </div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: heat.color }}
                >
                  {heat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* No Data Message */}
      {heatmapData.totalDarts === 0 && (
        <div className="glass-card p-6 rounded-lg text-center">
          <Flame size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">
            Noch keine Würfe aufgezeichnet. Spiele ein paar Matches, um deine Heatmap zu sehen!
          </p>
        </div>
      )}
    </div>
  );
};
