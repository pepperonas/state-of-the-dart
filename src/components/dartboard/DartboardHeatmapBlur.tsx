import React, { useRef, useEffect, useMemo } from 'react';
import { HeatmapData } from '../../types';
import { Flame, Target, TrendingUp, Crosshair, CircleDot, Percent } from 'lucide-react';
import { formatSegmentName } from '../../utils/heatmap';

interface DartboardHeatmapBlurProps {
  heatmapData: HeatmapData;
  size?: number;
  compact?: boolean;
}

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Polar coordinate grid configuration
const RADIAL_BINS = 20; // Number of concentric rings
const ANGULAR_BINS = 72; // Number of angular sectors (5 degrees each)

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
    const baseAngle = -90;
    const anglePerSegment = 360 / 20;
    return baseAngle + (segmentIndex * anglePerSegment);
  };

  // Helper function to get radius based on multiplier
  const getRadiusForMultiplier = (multiplier: number, baseRadius: number): number => {
    switch (multiplier) {
      case 3: return baseRadius * 0.48; // Middle of triple ring
      case 2: return baseRadius * 0.90; // Middle of double ring
      case 1: return baseRadius * 0.68; // Middle of single area
      default: return baseRadius * 0.68;
    }
  };

  // Parse segments and create point cloud
  const dartPoints = useMemo(() => {
    const points: { x: number; y: number; angle: number; radius: number; intensity: number }[] = [];

    if (!heatmapData.segments) return points;

    try {
      const segments = typeof heatmapData.segments === 'string'
        ? JSON.parse(heatmapData.segments)
        : heatmapData.segments;

      const center = size / 2;
      const baseRadius = size * 0.45;

      let maxSegmentCount = 0;
      Object.entries(segments).forEach(([, data]: [string, any]) => {
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

      const normalizationFactor = maxSegmentCount > 0 ? maxSegmentCount : 1;

      Object.entries(segments).forEach(([segmentKey, data]: [string, any]) => {
        let hitCount = 0;
        let hasCoordinates = false;
        let coordinateArrays: { x: number[]; y: number[] } | null = null;

        if (typeof data === 'number') {
          hitCount = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.x) && Array.isArray(data.y) && data.x.length > 0) {
            hitCount = data.x.length;
            hasCoordinates = true;
            coordinateArrays = { x: data.x, y: data.y };
          } else if (typeof data.count === 'number') {
            hitCount = data.count;
          }
        }

        if (hitCount === 0) return;

        const parsed = parseSegmentKey(segmentKey);
        if (!parsed) return;

        const { segment, multiplier } = parsed;
        const segmentIntensity = hitCount / normalizationFactor;

        if (hasCoordinates && coordinateArrays) {
          for (let i = 0; i < hitCount; i++) {
            const x = center + coordinateArrays.x[i] * baseRadius;
            const y = center + coordinateArrays.y[i] * baseRadius;
            const dx = x - center;
            const dy = y - center;
            const angle = Math.atan2(dy, dx);
            const radius = Math.sqrt(dx * dx + dy * dy);
            points.push({ x, y, angle, radius, intensity: segmentIntensity });
          }
        } else {
          const angle = getSegmentAngle(segment);
          const radius = getRadiusForMultiplier(multiplier, baseRadius);
          const angleRad = (angle * Math.PI) / 180;

          // Generate points with realistic scatter pattern
          for (let i = 0; i < hitCount; i++) {
            // Use Gaussian-like distribution for scatter
            const angleVariation = (Math.random() - 0.5) * 6 + (Math.random() - 0.5) * 4; // ±5° with Gaussian shape
            const radiusVariation = 1 + (Math.random() - 0.5) * 0.08 + (Math.random() - 0.5) * 0.04; // ±6%
            
            const finalAngle = angleRad + (angleVariation * Math.PI / 180);
            const finalRadius = radius * radiusVariation;

            const x = center + Math.cos(finalAngle) * finalRadius;
            const y = center + Math.sin(finalAngle) * finalRadius;

            points.push({ x, y, angle: finalAngle, radius: finalRadius, intensity: segmentIntensity });
          }
        }
      });

    } catch (e) {
      console.error('Failed to parse heatmap segments:', e);
    }

    return points;
  }, [heatmapData, size]);

  // Calculate statistics: cluster center, scatter radius, hit rates
  const heatmapStats = useMemo(() => {
    if (dartPoints.length === 0) return null;

    const center = size / 2;
    const baseRadius = size * 0.45;

    // Calculate weighted centroid (cluster center)
    let sumX = 0, sumY = 0, totalWeight = 0;
    dartPoints.forEach(p => {
      sumX += p.x * p.intensity;
      sumY += p.y * p.intensity;
      totalWeight += p.intensity;
    });
    const clusterCenterX = totalWeight > 0 ? sumX / totalWeight : center;
    const clusterCenterY = totalWeight > 0 ? sumY / totalWeight : center;

    // Calculate scatter radius (standard deviation from centroid)
    let sumSquaredDist = 0;
    dartPoints.forEach(p => {
      const dx = p.x - clusterCenterX;
      const dy = p.y - clusterCenterY;
      sumSquaredDist += (dx * dx + dy * dy) * p.intensity;
    });
    const scatterRadius = Math.sqrt(sumSquaredDist / totalWeight);
    const scatterRadiusNormalized = (scatterRadius / baseRadius) * 100; // As percentage

    // Count hits in critical areas
    let tripleHits = 0, doubleHits = 0, bullHits = 0, outerBullHits = 0;
    
    if (heatmapData.segments) {
      const segments = typeof heatmapData.segments === 'string'
        ? JSON.parse(heatmapData.segments)
        : heatmapData.segments;

      Object.entries(segments).forEach(([key, data]: [string, any]) => {
        const parsed = parseSegmentKey(key);
        if (!parsed) return;
        
        const count = typeof data === 'number' ? data : (data?.count || data?.x?.length || 0);
        
        if (parsed.multiplier === 3) tripleHits += count;
        if (parsed.multiplier === 2) doubleHits += count;
        
        // Bull detection (segment 25 or 50)
        if (parsed.segment === 25 || parsed.segment === 50) {
          if (parsed.multiplier === 2 || parsed.segment === 50) {
            bullHits += count;
          } else {
            outerBullHits += count;
          }
        }
      });
    }

    const totalDarts = heatmapData.totalDarts || 1;
    
    return {
      clusterCenter: { x: clusterCenterX, y: clusterCenterY },
      scatterRadius,
      scatterRadiusPercent: scatterRadiusNormalized,
      tripleRate: (tripleHits / totalDarts) * 100,
      doubleRate: (doubleHits / totalDarts) * 100,
      bullRate: ((bullHits + outerBullHits) / totalDarts) * 100,
      innerBullRate: (bullHits / totalDarts) * 100,
    };
  }, [dartPoints, heatmapData, size]);

  // Create 2D polar histogram
  const polarHistogram = useMemo(() => {
    const histogram: number[][] = Array(RADIAL_BINS).fill(null).map(() => Array(ANGULAR_BINS).fill(0));
    let maxCount = 0;

    const center = size / 2;
    const maxRadius = size * 0.45;

    dartPoints.forEach(point => {
      const dx = point.x - center;
      const dy = point.y - center;
      const radius = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;

      const radialBin = Math.min(RADIAL_BINS - 1, Math.floor((radius / maxRadius) * RADIAL_BINS));
      const angularBin = Math.floor((angle / (2 * Math.PI)) * ANGULAR_BINS) % ANGULAR_BINS;

      histogram[radialBin][angularBin]++;
      maxCount = Math.max(maxCount, histogram[radialBin][angularBin]);
    });

    return { histogram, maxCount };
  }, [dartPoints, size]);

  // Draw dartboard background
  useEffect(() => {
    const canvas = dartboardRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const center = size / 2;
    const radius = size * 0.45;
    const segmentAngle = 18;
    
    ctx.clearRect(0, 0, size, size);
    
    // Background circle
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Wire rings
    const drawWireRing = (r: number) => {
      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    
    drawWireRing(radius * 0.95);
    drawWireRing(radius * 0.85);
    drawWireRing(radius * 0.53);
    drawWireRing(radius * 0.43);
    drawWireRing(radius * 0.11);
    drawWireRing(radius * 0.06);
    
    const drawSegmentArc = (index: number, innerR: number, outerR: number, color: string) => {
      const startAngle = (index * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
      const endAngle = ((index + 1) * segmentAngle - 90 - segmentAngle / 2) * Math.PI / 180;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(center, center, outerR, startAngle, endAngle);
      ctx.arc(center, center, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      
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
    
    SEGMENTS.forEach((segment, index) => {
      const isEven = index % 2 === 0;
      const redColor = '#e30613';
      const greenColor = '#00a651';
      const blackColor = '#000000';
      const whiteColor = '#f4f1e8';
      
      drawSegmentArc(index, radius * 0.85, radius * 0.95, isEven ? redColor : greenColor);
      drawSegmentArc(index, radius * 0.53, radius * 0.85, isEven ? blackColor : whiteColor);
      drawSegmentArc(index, radius * 0.43, radius * 0.53, isEven ? redColor : greenColor);
      drawSegmentArc(index, radius * 0.11, radius * 0.43, isEven ? blackColor : whiteColor);
      
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
    
    ctx.fillStyle = '#00a651';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = '#e30613';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
  }, [size]);

  // Draw heatmap overlay using polar histogram with Gaussian blur
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dartPoints.length === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const center = size / 2;
    const maxRadius = size * 0.45;
    
    ctx.clearRect(0, 0, size, size);
    
    // Create temporary canvas for blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const { histogram, maxCount } = polarHistogram;
    if (maxCount === 0) return;

    // Draw polar histogram cells with gradients
    const radialStep = maxRadius / RADIAL_BINS;
    const angularStep = (2 * Math.PI) / ANGULAR_BINS;

    for (let r = 0; r < RADIAL_BINS; r++) {
      for (let a = 0; a < ANGULAR_BINS; a++) {
        const count = histogram[r][a];
        if (count === 0) continue;

        const intensity = count / maxCount;
        const innerRadius = r * radialStep;
        const outerRadius = (r + 1) * radialStep;
        const startAngle = a * angularStep;
        const endAngle = (a + 1) * angularStep;

        // Calculate center of cell for gradient
        const midRadius = (innerRadius + outerRadius) / 2;
        const midAngle = (startAngle + endAngle) / 2;
        const cellX = center + Math.cos(midAngle) * midRadius;
        const cellY = center + Math.sin(midAngle) * midRadius;

        // Create radial gradient for each cell
        const cellRadius = Math.max(radialStep, angularStep * midRadius) * 1.5;
        const gradient = tempCtx.createRadialGradient(cellX, cellY, 0, cellX, cellY, cellRadius);

        // Apply power curve for contrast
        const adjustedIntensity = Math.pow(intensity, 0.5);

        // Color gradient: blue → cyan → green → yellow → orange → red
        gradient.addColorStop(0, `rgba(255, 50, 0, ${Math.min(1, adjustedIntensity * 1.2)})`);
        gradient.addColorStop(0.3, `rgba(255, 150, 0, ${adjustedIntensity * 0.9})`);
        gradient.addColorStop(0.6, `rgba(200, 255, 50, ${adjustedIntensity * 0.6})`);
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

        tempCtx.fillStyle = gradient;
        tempCtx.beginPath();
        tempCtx.arc(cellX, cellY, cellRadius, 0, Math.PI * 2);
        tempCtx.fill();
      }
    }

    // Apply Gaussian blur
    ctx.filter = 'blur(15px)';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';

    // Color remapping for consistent heatmap appearance
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 5) {
        const intensity = (r + g + b) / (3 * 255);
        
        // Smooth color mapping
        if (intensity < 0.2) {
          // Blue (cold)
          data[i] = 50 + intensity * 150;
          data[i + 1] = 130 + intensity * 120;
          data[i + 2] = 255;
          data[i + 3] = Math.min(255, a * 1.5);
        } else if (intensity < 0.4) {
          // Cyan to Green
          const t = (intensity - 0.2) / 0.2;
          data[i] = 80 - 30 * t;
          data[i + 1] = 200 + 30 * t;
          data[i + 2] = 255 - 100 * t;
          data[i + 3] = Math.min(255, a * 1.8);
        } else if (intensity < 0.6) {
          // Green to Yellow
          const t = (intensity - 0.4) / 0.2;
          data[i] = 50 + 205 * t;
          data[i + 1] = 230;
          data[i + 2] = 155 - 105 * t;
          data[i + 3] = Math.min(255, a * 2);
        } else if (intensity < 0.8) {
          // Yellow to Orange
          const t = (intensity - 0.6) / 0.2;
          data[i] = 255;
          data[i + 1] = 230 - 80 * t;
          data[i + 2] = 50 - 50 * t;
          data[i + 3] = Math.min(255, a * 2.2);
        } else {
          // Orange to Red (hot)
          const t = (intensity - 0.8) / 0.2;
          data[i] = 255;
          data[i + 1] = 150 - 100 * t;
          data[i + 2] = 0;
          data[i + 3] = Math.min(255, 200 + a * 0.5);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw cluster center marker
    if (heatmapStats) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      
      // Crosshair at cluster center
      const cx = heatmapStats.clusterCenter.x;
      const cy = heatmapStats.clusterCenter.y;
      
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();

      // Scatter radius circle
      ctx.beginPath();
      ctx.arc(cx, cy, heatmapStats.scatterRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }

  }, [dartPoints, polarHistogram, heatmapStats, size]);

  // Calculate top segments
  const topSegments = useMemo(() => {
    if (!heatmapData.segments) return [];

    try {
      const segments = typeof heatmapData.segments === 'string'
        ? JSON.parse(heatmapData.segments)
        : heatmapData.segments;
      const segmentCounts: { segment: number; multiplier: number; count: number }[] = [];

      Object.entries(segments).forEach(([key, data]: [string, any]) => {
        const parsed = parseSegmentKey(key);
        if (!parsed) return;
        
        const count = typeof data === 'number' ? data : (data?.count || data?.x?.length || 0);
        if (count > 0) {
          segmentCounts.push({ segment: parsed.segment, multiplier: parsed.multiplier, count });
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
        <div className="absolute inset-0 blur-3xl opacity-20">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded-full"></div>
        </div>
        
        <div className="relative flex justify-center">
          <div 
            className="relative rounded-full shadow-2xl"
            style={{
              width: size,
              height: size,
              background: 'radial-gradient(circle at center, rgba(15, 15, 25, 0.95), rgba(5, 5, 15, 1))'
            }}
          >
            <canvas
              ref={dartboardRef}
              width={size}
              height={size}
              className="absolute inset-0"
              style={{ opacity: 0.85 }}
            />
            
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="absolute inset-0"
              style={{
                mixBlendMode: 'screen',
                opacity: 0.95
              }}
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {heatmapStats && !compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair size={18} className="text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">Cluster-Zentrum</span>
            </div>
            <div className="text-lg font-bold text-white">
              {heatmapStats.scatterRadiusPercent < 15 ? '🎯 Sehr präzise' : 
               heatmapStats.scatterRadiusPercent < 25 ? '✓ Präzise' : '↔ Gestreut'}
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <CircleDot size={18} className="text-purple-400" />
              <span className="text-xs text-purple-300 font-medium">Streuungsradius</span>
            </div>
            <div className="text-lg font-bold text-white">
              {heatmapStats.scatterRadiusPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">vom Scheibendurchmesser</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-red-400" />
              <span className="text-xs text-red-300 font-medium">Triple-Rate</span>
            </div>
            <div className="text-lg font-bold text-white">
              {heatmapStats.tripleRate.toFixed(1)}%
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Percent size={18} className="text-green-400" />
              <span className="text-xs text-green-300 font-medium">Double-Rate</span>
            </div>
            <div className="text-lg font-bold text-white">
              {heatmapStats.doubleRate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Bull Rate Card (wenn nicht compact) */}
      {heatmapStats && heatmapStats.bullRate > 0 && !compact && (
        <div className="glass-card p-4 rounded-xl border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-green-500 flex items-center justify-center">
                <CircleDot size={24} className="text-white" />
              </div>
              <div>
                <div className="text-sm text-yellow-300 font-medium">Bull & Outer Bull</div>
                <div className="text-2xl font-bold text-white">{heatmapStats.bullRate.toFixed(1)}%</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Inner Bull</div>
              <div className="text-lg font-bold text-red-400">{heatmapStats.innerBullRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Color Legend */}
      <div className="glass-card p-4 rounded-xl border border-primary-500/20">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
          <Flame size={20} className="text-orange-400" />
          Heatmap Legende
        </h4>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 shadow-lg" style={{ boxShadow: '0 0 15px #3b82f680' }} />
            <span className="text-xs text-white font-semibold mt-2">Kalt</span>
            <span className="text-[10px] text-gray-400">Selten</span>
          </div>
          <div className="flex-1 h-6 rounded-lg" style={{
            background: 'linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)'
          }} />
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-red-500 shadow-lg" style={{ boxShadow: '0 0 15px #ef444480' }} />
            <span className="text-xs text-white font-semibold mt-2">Heiß</span>
            <span className="text-[10px] text-gray-400">Häufig</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center">
          ⊕ Fadenkreuz = Schwerpunkt der Würfe · ○ Gestrichelter Kreis = Streuungsradius
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
                  
                  <div className="relative flex items-center justify-between p-3 bg-dark-800/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                        style={{ 
                          backgroundColor: color,
                          boxShadow: `0 0 15px ${color}80`
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {formatSegmentName(seg.segment, seg.multiplier)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {seg.count} Treffer · {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {seg.count}
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
