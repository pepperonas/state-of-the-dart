import React, { useRef, useEffect, useMemo } from 'react';
import { HeatmapData } from '../../types';
import { Flame, Target, TrendingUp } from 'lucide-react';
import { formatSegmentName } from '../../utils/heatmap';

interface DartboardHeatmapBlurProps {
  heatmapData: HeatmapData;
  size?: number;
  compact?: boolean;
}

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const DartboardHeatmapBlur: React.FC<DartboardHeatmapBlurProps> = ({
  heatmapData,
  size = 600,
  compact = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dartboardRef = useRef<HTMLCanvasElement>(null);

  // Helper function to parse segment key and get angle/radius
  const parseSegmentKey = (key: string): { segment: number; multiplier: number } | null => {
    // Support formats: "3x20", "20-3", "20x3"
    const match = key.match(/(\d+)[x-](\d+)/);
    if (match) {
      const [, first, second] = match;
      // Check if first is multiplier (1-3) or segment (1-20)
      if (parseInt(first) <= 3) {
        return { multiplier: parseInt(first), segment: parseInt(second) };
      } else {
        return { segment: parseInt(first), multiplier: parseInt(second) };
      }
    }
    return null;
  };

  // Helper function to get angle for a segment (segment 20 is at top = -90°)
  const getSegmentAngle = (segment: number): number => {
    const segmentIndex = SEGMENTS.indexOf(segment);
    if (segmentIndex === -1) return 0;
    // Segment 20 (index 0) should be at -90° (top)
    const baseAngle = -90; // Top
    const anglePerSegment = 360 / 20; // 18 degrees per segment
    return baseAngle + (segmentIndex * anglePerSegment);
  };

  // Helper function to get radius based on multiplier
  const getRadiusForMultiplier = (multiplier: number, baseRadius: number): number => {
    // Triple ring: ~43-53% of radius
    // Double ring: ~85-95% of radius
    // Single: varies
    // Bull: ~0-11% (outer), ~0-6% (inner)
    switch (multiplier) {
      case 3: return baseRadius * 0.48; // Middle of triple ring
      case 2: return baseRadius * 0.90; // Middle of double ring
      case 1: return baseRadius * 0.68; // Middle of single area
      default: return baseRadius * 0.68;
    }
  };

  // Parse segments and create point cloud with proper intensity scaling
  const dartPoints = useMemo(() => {
    const points: { x: number; y: number; intensity: number }[] = [];

    if (!heatmapData.segments) return points;

    try {
      const segments = typeof heatmapData.segments === 'string'
        ? JSON.parse(heatmapData.segments)
        : heatmapData.segments;

      const center = size / 2;
      const baseRadius = size * 0.45;

      // First pass: find max count per segment to normalize properly
      let maxSegmentCount = 0;
      Object.entries(segments).forEach(([key, data]: [string, any]) => {
        let count = 0;
        if (typeof data === 'number') {
          count = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.x)) {
            count = data.x.length;
          } else if (typeof data.count === 'number') {
            count = data.count;
          }
        }
        maxSegmentCount = Math.max(maxSegmentCount, count);
      });

      // Use the top segment count for normalization (makes hot spots really hot)
      const normalizationFactor = maxSegmentCount > 0 ? maxSegmentCount : 1;

      Object.entries(segments).forEach(([segmentKey, data]: [string, any]) => {
        let hitCount = 0;
        let hasCoordinates = false;
        let coordinateArrays: { x: number[]; y: number[] } | null = null;

        // Determine hit count and check for existing coordinates
        if (typeof data === 'number') {
          hitCount = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.x) && Array.isArray(data.y) && data.x.length > 0) {
            // Has coordinate arrays
            hitCount = data.x.length;
            hasCoordinates = true;
            coordinateArrays = { x: data.x, y: data.y };
          } else if (typeof data.count === 'number') {
            hitCount = data.count;
          }
        }

        if (hitCount === 0) return;

        // Parse segment key to get segment and multiplier
        const parsed = parseSegmentKey(segmentKey);
        if (!parsed) {
          console.warn(`⚠️ Could not parse segment key: ${segmentKey}`);
          return;
        }

        const { segment, multiplier } = parsed;
        const segmentIntensity = hitCount / normalizationFactor;

        // Generate coordinates
        if (hasCoordinates && coordinateArrays) {
          // Use existing coordinates
          for (let i = 0; i < hitCount; i++) {
            const x = center + coordinateArrays.x[i] * baseRadius;
            const y = center + coordinateArrays.y[i] * baseRadius;
            points.push({ x, y, intensity: segmentIntensity });
          }
        } else {
          // Generate coordinates from segment position
          const angle = getSegmentAngle(segment);
          const radius = getRadiusForMultiplier(multiplier, baseRadius);
          const angleRad = (angle * Math.PI) / 180;

          // Generate points with small random variations for blur effect
          for (let i = 0; i < hitCount; i++) {
            // Add small random variations (±2° angle, ±2% radius)
            const angleVariation = (Math.random() - 0.5) * 4; // ±2 degrees
            const radiusVariation = 1 + (Math.random() - 0.5) * 0.04; // ±2%
            
            const finalAngle = angleRad + (angleVariation * Math.PI / 180);
            const finalRadius = radius * radiusVariation;

            const x = center + Math.cos(finalAngle) * finalRadius;
            const y = center + Math.sin(finalAngle) * finalRadius;

            points.push({ x, y, intensity: segmentIntensity });
          }
        }
      });

      console.log(`🎯 Generated ${points.length} dart points from segments (max segment: ${maxSegmentCount})`);
    } catch (e) {
      console.error('Failed to parse heatmap segments:', e);
    }

    return points;
  }, [heatmapData, size]);

  // Draw dartboard background (professional style like in game)
  useEffect(() => {
    const canvas = dartboardRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const center = size / 2;
    const radius = size * 0.45;
    const segmentAngle = 18;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Background circle
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Wire rings (silver)
    const drawWireRing = (r: number) => {
      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    
    drawWireRing(radius * 0.95);  // Outer
    drawWireRing(radius * 0.85);  // Double outer
    drawWireRing(radius * 0.53);  // Triple outer
    drawWireRing(radius * 0.43);  // Triple inner
    drawWireRing(radius * 0.11);  // Outer bull
    drawWireRing(radius * 0.06);  // Bull
    
    // Helper to draw segment arc
    const drawSegmentArc = (index: number, innerR: number, outerR: number, color: string) => {
      const startAngle = (index * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
      const endAngle = ((index + 1) * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(center, center, outerR, startAngle, endAngle);
      ctx.arc(center, center, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      
      // Wire line
      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(
        center + innerR * Math.cos(startAngle),
        center + innerR * Math.sin(startAngle)
      );
      ctx.lineTo(
        center + outerR * Math.cos(startAngle),
        center + outerR * Math.sin(startAngle)
      );
      ctx.stroke();
    };
    
    // Draw all segments
    SEGMENTS.forEach((segment, index) => {
      const isEven = index % 2 === 0;
      
      // Colors matching the game dartboard
      const redColor = '#e30613';
      const greenColor = '#00a651';
      const blackColor = '#000000';
      const whiteColor = '#f4f1e8';
      
      // Double ring (red/green alternating)
      drawSegmentArc(index, radius * 0.85, radius * 0.95, isEven ? redColor : greenColor);
      
      // Outer single (black/white alternating)
      drawSegmentArc(index, radius * 0.53, radius * 0.85, isEven ? blackColor : whiteColor);
      
      // Triple ring (red/green alternating)
      drawSegmentArc(index, radius * 0.43, radius * 0.53, isEven ? redColor : greenColor);
      
      // Inner single (black/white alternating)
      drawSegmentArc(index, radius * 0.11, radius * 0.43, isEven ? blackColor : whiteColor);
      
      // Number labels
      const numberAngle = (index * segmentAngle - 90) * Math.PI / 180;
      const numberRadius = radius * 1.08;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.045}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(
        segment.toString(),
        center + numberRadius * Math.cos(numberAngle),
        center + numberRadius * Math.sin(numberAngle)
      );
      ctx.shadowBlur = 0;
    });
    
    // Outer Bull (green)
    ctx.fillStyle = '#00a651';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Bull (red)
    ctx.fillStyle = '#e30613';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
  }, [size]);

  // Draw heatmap overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dartPoints.length === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const center = size / 2;
    const scale = size / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Create temporary canvas for blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Draw heatmap points with radial gradients
    // Use smaller radius for more concentrated heat spots
    const pointRadius = size * 0.045; // Slightly larger for more presence

    dartPoints.forEach(point => {
      // Points already have absolute canvas coordinates
      const x = point.x;
      const y = point.y;

      const gradient = tempCtx.createRadialGradient(x, y, 0, x, y, pointRadius);

      // Intensity is already normalized (0-1) based on segment popularity
      // Apply power curve to make hot spots more prominent
      const intensity = Math.pow(point.intensity, 0.4); // Flatter curve = more visible low-intensity areas

      // Much higher alpha values for better visibility against dartboard
      gradient.addColorStop(0, `rgba(255, 30, 0, ${Math.min(1, intensity * 1.5)})`); // Bright red center
      gradient.addColorStop(0.15, `rgba(255, 80, 0, ${Math.min(1, intensity * 1.3)})`); // Orange
      gradient.addColorStop(0.4, `rgba(255, 160, 0, ${intensity * 1.0})`); // Yellow-orange
      gradient.addColorStop(0.7, `rgba(200, 255, 50, ${intensity * 0.5})`); // Yellow-green glow
      gradient.addColorStop(1, 'rgba(100, 255, 100, 0)'); // Transparent edge

      tempCtx.fillStyle = gradient;
      tempCtx.beginPath();
      tempCtx.arc(x, y, pointRadius, 0, Math.PI * 2);
      tempCtx.fill();
    });
    
    // Apply blur filter to smooth out the heatmap (less blur = more contrast)
    ctx.filter = 'blur(12px)';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
    
    // Apply color mapping (blue to red gradient based on intensity)
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) {
        // Calculate intensity from RGB
        const intensity = (r + g + b) / (3 * 255);

        // Apply vibrant heatmap color scheme with higher alpha values
        if (intensity < 0.15) {
          // Blue (cold) - more visible
          data[i] = 80;
          data[i + 1] = 150;
          data[i + 2] = 255;
          data[i + 3] = Math.min(255, intensity * 255 * 4);
        } else if (intensity < 0.35) {
          // Cyan to Green
          const t = (intensity - 0.15) / 0.2;
          data[i] = 80 + (50 - 80) * t;
          data[i + 1] = 150 + (220 - 150) * t;
          data[i + 2] = 255 + (150 - 255) * t;
          data[i + 3] = Math.min(255, intensity * 255 * 4);
        } else if (intensity < 0.55) {
          // Green to Yellow
          const t = (intensity - 0.35) / 0.2;
          data[i] = 50 + (255 - 50) * t;
          data[i + 1] = 220 + (220 - 220) * t;
          data[i + 2] = 150 + (50 - 150) * t;
          data[i + 3] = Math.min(255, intensity * 255 * 4.5);
        } else if (intensity < 0.75) {
          // Yellow to Orange
          const t = (intensity - 0.55) / 0.2;
          data[i] = 255;
          data[i + 1] = 220 + (140 - 220) * t;
          data[i + 2] = 50 + (0 - 50) * t;
          data[i + 3] = Math.min(255, intensity * 255 * 5);
        } else {
          // Orange to Red (hot) - maximum visibility
          const t = (intensity - 0.75) / 0.25;
          data[i] = 255;
          data[i + 1] = 140 + (50 - 140) * t;
          data[i + 2] = 0;
          data[i + 3] = Math.min(255, 180 + intensity * 75);
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
  }, [dartPoints, size]);

  // Calculate top segments
  const topSegments = useMemo(() => {
    if (!heatmapData.segments) return [];

    try {
      const segments = typeof heatmapData.segments === 'string'
        ? JSON.parse(heatmapData.segments)
        : heatmapData.segments;
      const segmentCounts: { segment: number; multiplier: number; count: number }[] = [];

      Object.entries(segments).forEach(([key, data]: [string, any]) => {
        // Parse key format: "20-3" (segment-multiplier)
        const parts = key.split('-');
        const segment = parseInt(parts[0]);
        const multiplier = parseInt(parts[1]);

        // Support both simple count and object with x/y/count
        const count = typeof data === 'number' ? data : (data?.count || data?.x?.length || 0);
        if (count > 0) {
          segmentCounts.push({ segment, multiplier, count });
        }
      });

      return segmentCounts
        .sort((a, b) => b.count - a.count)
        .slice(0, compact ? 3 : 5);
    } catch (e) {
      console.error('Failed to parse segments for top list:', e);
      return [];
    }
  }, [heatmapData, compact]);

  return (
    <div className="space-y-6">
      {/* Heatmap Visualization */}
      <div className="relative">
        {/* Background glow */}
        <div className="absolute inset-0 blur-3xl opacity-20">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded-full"></div>
        </div>
        
        {/* Dartboard container */}
        <div className="relative flex justify-center">
          <div 
            className="relative rounded-full shadow-2xl"
            style={{
              width: size,
              height: size,
              background: 'radial-gradient(circle at center, rgba(15, 15, 25, 0.95), rgba(5, 5, 15, 1))'
            }}
          >
            {/* Dartboard background */}
            <canvas
              ref={dartboardRef}
              width={size}
              height={size}
              className="absolute inset-0"
              style={{ opacity: 0.9 }}
            />
            
            {/* Heatmap overlay */}
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="absolute inset-0"
              style={{
                mixBlendMode: 'screen',
                opacity: 0.9
              }}
            />
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="glass-card p-4 rounded-xl border border-primary-500/20">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
          <Flame size={20} className="text-orange-400" />
          Heatmap Legende
        </h4>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-500 shadow-lg" style={{ boxShadow: '0 0 20px #3b82f680' }} />
            <span className="text-xs text-white font-semibold mt-2">Kalt</span>
            <span className="text-[10px] text-gray-400">0-20%</span>
          </div>
          <div className="flex-1 h-8 rounded-lg" style={{
            background: 'linear-gradient(to right, #3b82f6, #4ecdc4, #22c55e, #eab308, #f97316, #ef4444)'
          }} />
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500 shadow-lg" style={{ boxShadow: '0 0 20px #ef444480' }} />
            <span className="text-xs text-white font-semibold mt-2">Heiß</span>
            <span className="text-[10px] text-gray-400">80-100%</span>
          </div>
        </div>
      </div>

      {/* Top Segments */}
      {topSegments.length > 0 && (
        <div className="glass-card p-4 rounded-xl border border-primary-500/20">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
            <TrendingUp size={20} className="text-primary-400" />
            Top {compact ? 3 : 5} Hotspots
          </h4>
          <div className="space-y-2">
            {topSegments.map((seg, index) => {
              const percentage = (seg.count / heatmapData.totalDarts) * 100;
              const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
              const color = colors[index];
              
              return (
                <div
                  key={`${seg.segment}-${seg.multiplier}`}
                  className="relative overflow-hidden rounded-xl"
                >
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(to right, ${color}, transparent)`,
                      width: `${Math.min(100, percentage * 10)}%`
                    }}
                  />
                  
                  <div className="relative flex items-center justify-between p-4 bg-dark-800/80 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                        style={{ 
                          backgroundColor: color,
                          boxShadow: `0 0 20px ${color}80`
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">
                          {formatSegmentName(seg.segment, seg.multiplier)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {seg.count} Treffer · {percentage.toFixed(1)}% aller Würfe
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target size={24} className="text-white opacity-60" />
                      <div className="text-3xl font-bold text-white">
                        {seg.count}
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
