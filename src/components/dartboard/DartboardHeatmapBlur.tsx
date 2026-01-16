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

  // Parse segments and create point cloud
  const dartPoints = useMemo(() => {
    const points: { x: number; y: number; intensity: number }[] = [];
    
    if (!heatmapData.segments) return points;
    
    try {
      const segments = typeof heatmapData.segments === 'string' 
        ? JSON.parse(heatmapData.segments) 
        : heatmapData.segments;
      const maxCount = heatmapData.totalDarts > 0 ? heatmapData.totalDarts / 100 : 1;
      
      Object.entries(segments).forEach(([segmentKey, data]: [string, any]) => {
        const [segment, multiplier] = segmentKey.split('-').map(Number);
        const xCoords = data.x || [];
        const yCoords = data.y || [];
        
        // Add each dart hit as a point
        for (let i = 0; i < Math.min(xCoords.length, yCoords.length); i++) {
          points.push({
            x: xCoords[i],
            y: yCoords[i],
            intensity: 1 / maxCount
          });
        }
      });
    } catch (e) {
      console.error('Failed to parse heatmap segments:', e);
    }
    
    return points;
  }, [heatmapData]);

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
    
    const ctx = canvas.getContext('2d');
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
    dartPoints.forEach(point => {
      const x = center + point.x * scale;
      const y = center + point.y * scale;
      const radius = size * 0.08; // Blur radius
      
      const gradient = tempCtx.createRadialGradient(x, y, 0, x, y, radius);
      
      // Intensity-based color (0-1)
      const intensity = Math.min(1, point.intensity * 100);
      
      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity * 0.8})`); // Red center
      gradient.addColorStop(0.3, `rgba(255, 100, 0, ${intensity * 0.6})`); // Orange
      gradient.addColorStop(0.6, `rgba(255, 200, 0, ${intensity * 0.4})`); // Yellow
      gradient.addColorStop(1, 'rgba(0, 255, 100, 0)'); // Transparent edge
      
      tempCtx.fillStyle = gradient;
      tempCtx.beginPath();
      tempCtx.arc(x, y, radius, 0, Math.PI * 2);
      tempCtx.fill();
    });
    
    // Apply blur filter to smooth out the heatmap
    ctx.filter = 'blur(20px)';
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
        
        // Apply L.A. heatmap color scheme
        if (intensity < 0.2) {
          // Blue (cold)
          data[i] = 59;
          data[i + 1] = 130;
          data[i + 2] = 246;
          data[i + 3] = intensity * 255 * 2;
        } else if (intensity < 0.4) {
          // Cyan
          const t = (intensity - 0.2) / 0.2;
          data[i] = 59 + (78 - 59) * t;
          data[i + 1] = 130 + (199 - 130) * t;
          data[i + 2] = 246 + (244 - 246) * t;
          data[i + 3] = intensity * 255 * 2;
        } else if (intensity < 0.6) {
          // Green
          const t = (intensity - 0.4) / 0.2;
          data[i] = 78 + (34 - 78) * t;
          data[i + 1] = 199 + (197 - 199) * t;
          data[i + 2] = 244 + (94 - 244) * t;
          data[i + 3] = intensity * 255 * 2.5;
        } else if (intensity < 0.8) {
          // Yellow
          const t = (intensity - 0.6) / 0.2;
          data[i] = 34 + (234 - 34) * t;
          data[i + 1] = 197 + (179 - 197) * t;
          data[i + 2] = 94 + (8 - 94) * t;
          data[i + 3] = intensity * 255 * 3;
        } else {
          // Red/Orange (hot)
          const t = (intensity - 0.8) / 0.2;
          data[i] = 234 + (249 - 234) * t;
          data[i + 1] = 179 + (115 - 179) * t;
          data[i + 2] = 8 + (22 - 8) * t;
          data[i + 3] = Math.min(255, intensity * 255 * 3.5);
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
        const [segment, multiplier] = key.split('-').map(Number);
        const count = data.x?.length || 0;
        segmentCounts.push({ segment, multiplier, count });
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
                opacity: 0.75
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
