import { Dart, HeatmapData, SegmentHeat } from '../types';

/**
 * Updates heatmap data with new darts
 */
export const updateHeatmapData = (
  currentData: HeatmapData,
  newDarts: Dart[]
): HeatmapData => {
  const segments = { ...currentData.segments };
  
  newDarts.forEach(dart => {
    // Skip misses (segment 0)
    if (dart.segment === 0) {
      const key = '0-0'; // miss
      segments[key] = (segments[key] || 0) + 1;
      return;
    }
    
    // Handle bulls
    if (dart.segment === 25 || dart.segment === 50) {
      const key = dart.segment === 50 ? '25-2' : '25-1'; // bull or outer bull
      segments[key] = (segments[key] || 0) + 1;
      return;
    }
    
    // Regular segments
    const key = `${dart.segment}-${dart.multiplier}`;
    segments[key] = (segments[key] || 0) + 1;
  });
  
  return {
    ...currentData,
    segments,
    totalDarts: currentData.totalDarts + newDarts.length,
    lastUpdated: new Date()
  };
};

/**
 * Creates a new empty heatmap data object
 */
export const createEmptyHeatmapData = (playerId: string): HeatmapData => ({
  playerId,
  segments: {},
  totalDarts: 0,
  lastUpdated: new Date()
});

/**
 * Calculates segment heat with colors
 */
export const calculateSegmentHeat = (heatmapData: HeatmapData): SegmentHeat[] => {
  const { segments, totalDarts } = heatmapData;
  
  if (totalDarts === 0) return [];
  
  const heats: SegmentHeat[] = [];
  
  Object.entries(segments).forEach(([key, data]) => {
    // Support both simple count (number) and object with x/y/count
    const count = typeof data === 'number' ? data : ((data as any)?.count || (data as any)?.x?.length || 0);

    const [segmentStr, multiplierStr] = key.split('-');
    const segment = parseInt(segmentStr);
    const multiplier = parseInt(multiplierStr);
    const percentage = (count / totalDarts) * 100;

    heats.push({
      segment,
      multiplier,
      count,
      percentage,
      color: getHeatColor(percentage)
    });
  });
  
  return heats.sort((a, b) => b.count - a.count);
};

/**
 * Gets color based on hit frequency (percentage)
 * Blue (cold) -> Green -> Yellow -> Orange -> Red (hot)
 */
export const getHeatColor = (percentage: number): string => {
  if (percentage === 0) return '#1e293b'; // dark slate (no data)
  if (percentage < 0.5) return '#3b82f6'; // blue (very rare)
  if (percentage < 1.0) return '#06b6d4'; // cyan (rare)
  if (percentage < 2.0) return '#10b981'; // green (uncommon)
  if (percentage < 3.0) return '#84cc16'; // lime (common)
  if (percentage < 4.0) return '#fbbf24'; // amber (frequent)
  if (percentage < 5.0) return '#f97316'; // orange (very frequent)
  return '#ef4444'; // red (extremely frequent)
};

/**
 * Gets the most hit segments
 */
export const getTopSegments = (
  heatmapData: HeatmapData,
  limit: number = 10
): SegmentHeat[] => {
  const heats = calculateSegmentHeat(heatmapData);
  return heats.slice(0, limit);
};

/**
 * Gets hit rate for a specific segment/multiplier
 */
export const getSegmentHitRate = (
  heatmapData: HeatmapData,
  segment: number,
  multiplier: number
): number => {
  const key = `${segment}-${multiplier}`;
  const count = heatmapData.segments[key] || 0;
  return heatmapData.totalDarts > 0 ? (count / heatmapData.totalDarts) * 100 : 0;
};

/**
 * Formats segment name for display
 */
export const formatSegmentName = (segment: number, multiplier: number): string => {
  if (segment === 0) return 'Miss';
  if (segment === 25 && multiplier === 1) return 'Outer Bull';
  if (segment === 25 && multiplier === 2) return 'Bull';
  
  const prefix = multiplier === 2 ? 'D' : multiplier === 3 ? 'T' : '';
  return `${prefix}${segment}`;
};

/**
 * Calculates accuracy statistics
 */
export const calculateAccuracyStats = (heatmapData: HeatmapData) => {
  const { segments, totalDarts } = heatmapData;
  
  if (totalDarts === 0) {
    return {
      missRate: 0,
      singleRate: 0,
      doubleRate: 0,
      tripleRate: 0,
      bullRate: 0,
      favoriteSegment: null as string | null,
      favoriteDouble: null as string | null,
      favoriteTriple: null as string | null
    };
  }
  
  let misses = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;
  let bulls = 0;
  
  let maxSegmentCount = 0;
  let maxSegmentKey = '';
  let maxDoubleCount = 0;
  let maxDoubleKey = '';
  let maxTripleCount = 0;
  let maxTripleKey = '';
  
  Object.entries(segments).forEach(([key, data]) => {
    // Support both simple count (number) and object with x/y/count
    const count = typeof data === 'number' ? data : ((data as any)?.count || (data as any)?.x?.length || 0);

    // Parse key format: "20-3" (segment-multiplier)
    const [segmentStr, multiplierStr] = key.split('-');
    const segment = parseInt(segmentStr);
    const multiplier = parseInt(multiplierStr);

    if (segment === 0) {
      misses += count;
    } else if (segment === 25) {
      bulls += count;
    } else {
      if (multiplier === 1) singles += count;
      if (multiplier === 2) {
        doubles += count;
        if (count > maxDoubleCount) {
          maxDoubleCount = count;
          maxDoubleKey = key;
        }
      }
      if (multiplier === 3) {
        triples += count;
        if (count > maxTripleCount) {
          maxTripleCount = count;
          maxTripleKey = key;
        }
      }

      if (count > maxSegmentCount) {
        maxSegmentCount = count;
        maxSegmentKey = key;
      }
    }
  });
  
  const formatKey = (key: string) => {
    if (!key) return null;
    const [seg, mult] = key.split('-').map(Number);
    return formatSegmentName(seg, mult);
  };
  
  return {
    missRate: (misses / totalDarts) * 100,
    singleRate: (singles / totalDarts) * 100,
    doubleRate: (doubles / totalDarts) * 100,
    tripleRate: (triples / totalDarts) * 100,
    bullRate: (bulls / totalDarts) * 100,
    favoriteSegment: formatKey(maxSegmentKey),
    favoriteDouble: formatKey(maxDoubleKey),
    favoriteTriple: formatKey(maxTripleKey)
  };
};
