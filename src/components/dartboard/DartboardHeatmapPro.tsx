import React, { useMemo } from 'react';
import { HeatmapData, SegmentHeat } from '../../types';
import { calculateSegmentHeat, formatSegmentName } from '../../utils/heatmap';
import { Flame, TrendingUp, Target, Award } from 'lucide-react';

interface DartboardHeatmapProProps {
  heatmapData: HeatmapData;
  size?: number;
  compact?: boolean;
}

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const DartboardHeatmapPro: React.FC<DartboardHeatmapProProps> = ({
  heatmapData,
  size = 500,
  compact = false
}) => {
  const heats = useMemo(() => calculateSegmentHeat(heatmapData), [heatmapData]);
  
  // Create lookup map
  const heatMap = useMemo(() => {
    const map: { [key: string]: SegmentHeat } = {};
    heats.forEach(heat => {
      const key = `${heat.segment}-${heat.multiplier}`;
      map[key] = heat;
    });
    return map;
  }, [heats]);
  
  // Get max count for normalization
  const maxCount = useMemo(() => {
    return Math.max(...heats.map(h => h.count), 1);
  }, [heats]);
  
  const getSegmentHeat = (segment: number, multiplier: number): number => {
    const key = `${segment}-${multiplier}`;
    const heat = heatMap[key];
    return heat ? heat.count / maxCount : 0;
  };
  
  const getSegmentColor = (segment: number, multiplier: number): string => {
    const intensity = getSegmentHeat(segment, multiplier);
    
    if (intensity === 0) return '#1a1a2e';
    
    // Professional gradient: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
    if (intensity < 0.2) {
      // Blue to Cyan
      const t = intensity / 0.2;
      return `rgb(${Math.round(59 + (78 - 59) * t)}, ${Math.round(130 + (199 - 130) * t)}, ${Math.round(246 + (244 - 246) * t)})`;
    } else if (intensity < 0.4) {
      // Cyan to Green
      const t = (intensity - 0.2) / 0.2;
      return `rgb(${Math.round(78 + (34 - 78) * t)}, ${Math.round(199 + (197 - 199) * t)}, ${Math.round(244 + (94 - 244) * t)})`;
    } else if (intensity < 0.6) {
      // Green to Yellow
      const t = (intensity - 0.4) / 0.2;
      return `rgb(${Math.round(34 + (234 - 34) * t)}, ${Math.round(197 + (179 - 197) * t)}, ${Math.round(94 + (8 - 94) * t)})`;
    } else if (intensity < 0.8) {
      // Yellow to Orange
      const t = (intensity - 0.6) / 0.2;
      return `rgb(${Math.round(234 + (249 - 234) * t)}, ${Math.round(179 + (115 - 179) * t)}, ${Math.round(8 + (22 - 8) * t)})`;
    } else {
      // Orange to Red
      const t = (intensity - 0.8) / 0.2;
      return `rgb(${Math.round(249 + (239 - 249) * t)}, ${Math.round(115 + (68 - 115) * t)}, ${Math.round(22 + (68 - 22) * t)})`;
    }
  };
  
  const center = size / 2;
  const outerRadius = size * 0.42;
  const bullRadius = size * 0.06;
  const outerBullRadius = size * 0.13;
  const tripleInnerRadius = outerRadius * 0.58;
  const tripleOuterRadius = outerRadius * 0.65;
  const doubleInnerRadius = outerRadius * 0.96;
  
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
  
  // Top segments
  const topSegments = useMemo(() => {
    return [...heats]
      .filter(h => h.segment !== 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, compact ? 3 : 5);
  }, [heats, compact]);
  
  // Get favorite zone
  const favoriteZone = useMemo(() => {
    if (heats.length === 0) return null;
    return heats.reduce((prev, current) => 
      (current.count > prev.count) ? current : prev
    );
  }, [heats]);

  return (
    <div className={`space-y-${compact ? '4' : '6'}`}>
      {/* Main Heatmap */}
      <div className="relative">
        {/* Glow effect background */}
        <div className="absolute inset-0 blur-3xl opacity-30">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-full"></div>
        </div>
        
        {/* Dartboard */}
        <div className="relative flex justify-center">
          <svg
            width={size}
            height={size}
            className="filter drop-shadow-2xl"
            viewBox={`0 0 ${size} ${size}`}
            style={{
              background: 'radial-gradient(circle at center, rgba(20, 20, 35, 0.8), rgba(10, 10, 20, 0.95))',
              borderRadius: '50%',
            }}
          >
            {/* Outer glow ring */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius + 5}
              fill="none"
              stroke="url(#glowGradient)"
              strokeWidth="8"
              opacity="0.6"
            />
            
            <defs>
              <radialGradient id="glowGradient">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0.3" />
              </radialGradient>
              
              {/* Glow filters for hot zones */}
              <filter id="hotGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              fill="#0f0f1a"
              stroke="#2a2a3e"
              strokeWidth="3"
            />
            
            {/* Segments with heat colors */}
            {SEGMENTS.map((segment, index) => {
              const intensity = getSegmentHeat(segment, 3);
              const useGlow = intensity > 0.5;
              
              return (
                <g key={`segment-${segment}`}>
                  {/* Double ring */}
                  <path
                    d={generateSegmentPath(index, outerRadius * 0.89, doubleInnerRadius)}
                    fill={getSegmentColor(segment, 2)}
                    stroke="#1a1a2e"
                    strokeWidth="2"
                    filter={useGlow ? 'url(#hotGlow)' : undefined}
                    className="transition-all duration-300 hover:opacity-80"
                  >
                    <title>{formatSegmentName(segment, 2)}: {heatMap[`${segment}-2`]?.count || 0} hits</title>
                  </path>
                  
                  {/* Outer single */}
                  <path
                    d={generateSegmentPath(index, tripleOuterRadius, outerRadius * 0.89)}
                    fill={getSegmentColor(segment, 1)}
                    stroke="#1a1a2e"
                    strokeWidth="1.5"
                    className="transition-all duration-300 hover:opacity-80"
                  >
                    <title>{formatSegmentName(segment, 1)}: {heatMap[`${segment}-1`]?.count || 0} hits</title>
                  </path>
                  
                  {/* Triple ring */}
                  <path
                    d={generateSegmentPath(index, tripleInnerRadius, tripleOuterRadius)}
                    fill={getSegmentColor(segment, 3)}
                    stroke="#1a1a2e"
                    strokeWidth="2"
                    filter={useGlow ? 'url(#hotGlow)' : undefined}
                    className="transition-all duration-300 hover:opacity-80"
                  >
                    <title>{formatSegmentName(segment, 3)}: {heatMap[`${segment}-3`]?.count || 0} hits</title>
                  </path>
                  
                  {/* Inner single */}
                  <path
                    d={generateSegmentPath(index, outerBullRadius, tripleInnerRadius)}
                    fill={getSegmentColor(segment, 1)}
                    stroke="#1a1a2e"
                    strokeWidth="1.5"
                    className="transition-all duration-300 hover:opacity-80"
                  >
                    <title>{formatSegmentName(segment, 1)}: {heatMap[`${segment}-1`]?.count || 0} hits</title>
                  </path>
                  
                  {/* Segment numbers */}
                  <text
                    x={center + (outerRadius + 20) * Math.cos(index * (2 * Math.PI / 20) - Math.PI / 2)}
                    y={center + (outerRadius + 20) * Math.sin(index * (2 * Math.PI / 20) - Math.PI / 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontWeight="bold"
                    style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
                  >
                    {segment}
                  </text>
                </g>
              );
            })}
            
            {/* Outer Bull */}
            <circle
              cx={center}
              cy={center}
              r={outerBullRadius}
              fill={getSegmentColor(25, 1)}
              stroke="#1a1a2e"
              strokeWidth="2"
              filter={getSegmentHeat(25, 1) > 0.5 ? 'url(#hotGlow)' : undefined}
              className="transition-all duration-300 hover:opacity-80"
            >
              <title>Outer Bull: {heatMap['25-1']?.count || 0} hits</title>
            </circle>
            
            {/* Bull's Eye */}
            <circle
              cx={center}
              cy={center}
              r={bullRadius}
              fill={getSegmentColor(25, 2)}
              stroke="#1a1a2e"
              strokeWidth="2"
              filter={getSegmentHeat(25, 2) > 0.5 ? 'url(#hotGlow)' : undefined}
              className="transition-all duration-300 hover:opacity-80"
            >
              <title>Bull: {heatMap['25-2']?.count || 0} hits</title>
            </circle>
            
            {/* Center indicator */}
            <circle
              cx={center}
              cy={center}
              r={3}
              fill="#ffffff"
              opacity="0.8"
            />
          </svg>
        </div>
        
        {/* Floating stats indicators */}
        {favoriteZone && !compact && (
          <div className="absolute top-4 right-4 glass-card p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-amber-400" />
              <div>
                <div className="text-xs text-amber-300 font-semibold">Favorite Zone</div>
                <div className="text-lg font-bold text-white">{formatSegmentName(favoriteZone.segment, favoriteZone.multiplier)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Advanced Legend */}
      <div className="glass-card p-4 rounded-xl border border-primary-500/20">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
          <Flame size={20} className="text-orange-400" />
          Heatmap Legende
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { label: 'Kalt', color: '#3b82f6', range: '0-20%' },
            { label: 'Kühl', color: '#4ecdc4', range: '20-40%' },
            { label: 'Warm', color: '#22c55e', range: '40-60%' },
            { label: 'Heiß', color: '#eab308', range: '60-80%' },
            { label: 'Sehr heiß', color: '#f97316', range: '80-95%' },
            { label: 'Extrem', color: '#ef4444', range: '95-100%' }
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1 p-2 bg-dark-900/50 rounded-lg">
              <div
                className="w-8 h-8 rounded-full shadow-lg"
                style={{ 
                  backgroundColor: item.color,
                  boxShadow: `0 0 15px ${item.color}80`
                }}
              />
              <span className="text-xs text-white font-semibold">{item.label}</span>
              <span className="text-[10px] text-gray-400">{item.range}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top Segments - Enhanced */}
      {topSegments.length > 0 && (
        <div className="glass-card p-4 rounded-xl border border-primary-500/20">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
            <TrendingUp size={20} className="text-primary-400" />
            Top {compact ? 3 : 5} Hotspots
          </h4>
          <div className="space-y-2">
            {topSegments.map((heat, index) => {
              const percentage = (heat.count / heatmapData.totalDarts) * 100;
              return (
                <div
                  key={`${heat.segment}-${heat.multiplier}`}
                  className="relative overflow-hidden rounded-xl"
                >
                  {/* Progress bar background */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(to right, ${heat.color}, transparent)`,
                      width: `${percentage * 10}%`
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative flex items-center justify-between p-4 bg-dark-800/80 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                        style={{ 
                          backgroundColor: heat.color,
                          boxShadow: `0 0 20px ${heat.color}80`
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">
                          {formatSegmentName(heat.segment, heat.multiplier)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {heat.count} Treffer · {percentage.toFixed(1)}% aller Würfe
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target size={24} className="text-white opacity-60" />
                      <div className="text-3xl font-bold text-white">
                        {heat.count}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
