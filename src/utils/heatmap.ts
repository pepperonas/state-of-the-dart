import { Dart, HeatmapData, SegmentHeat } from '../types';

// Extended type for segment data with coordinates
interface SegmentData {
  x: number[];
  y: number[];
  count: number;
}

// Extended Dart type with optional coordinates
interface DartWithCoords extends Dart {
  x?: number;
  y?: number;
}

/**
 * Updates heatmap data with new darts
 * Stores x/y coordinates for visual heatmap rendering
 */
export const updateHeatmapData = (
  currentData: HeatmapData,
  newDarts: Dart[]
): HeatmapData => {
  // Deep clone segments to avoid mutation
  const segments: Record<string, SegmentData> = {};

  // Convert existing data to new format if needed
  Object.entries(currentData.segments).forEach(([key, value]) => {
    if (typeof value === 'number') {
      // Old format: just a count - no coordinates available
      segments[key] = { x: [], y: [], count: value };
    } else if (value && typeof value === 'object') {
      // New format with x/y arrays
      const data = value as SegmentData;
      segments[key] = {
        x: [...(data.x || [])],
        y: [...(data.y || [])],
        count: data.count || data.x?.length || 0
      };
    }
  });

  newDarts.forEach(dart => {
    let key: string;

    // Skip misses (segment 0)
    if (dart.segment === 0) {
      key = '0-0'; // miss
    } else if (dart.segment === 25 || dart.segment === 50) {
      // Handle bulls
      key = dart.segment === 50 ? '25-2' : '25-1'; // bull or outer bull
    } else {
      // Regular segments
      key = `${dart.segment}-${dart.multiplier}`;
    }

    // Initialize if not exists
    if (!segments[key]) {
      segments[key] = { x: [], y: [], count: 0 };
    }

    // Add coordinates if available
    const dartWithCoords = dart as DartWithCoords;
    if (typeof dartWithCoords.x === 'number' && typeof dartWithCoords.y === 'number') {
      segments[key].x.push(dartWithCoords.x);
      segments[key].y.push(dartWithCoords.y);
    }
    segments[key].count++;
  });

  return {
    ...currentData,
    segments: segments as unknown as Record<string, number>,
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
    const segmentData = typeof data === 'number' ? null : (data as SegmentData);
    const count = typeof data === 'number' ? data : (segmentData?.count || segmentData?.x?.length || 0);

    const parsed = normalizeHeatmapKey(key);
    if (!parsed) return;
    const { segment, multiplier } = parsed;
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
 * Formats segment name for display. Pass `t` for the translated special beds;
 * numbers keep darts notation (T20, D16) in every language.
 */
export const formatSegmentName = (
  segment: number,
  multiplier: number,
  t?: (key: string) => string,
): string => {
  if (segment === 0) return t ? t('heatmap.miss') : 'Miss';
  if (segment === 50 || (segment === 25 && multiplier === 2)) return t ? t('heatmap.bull') : 'Bull';
  if (segment === 25) return t ? t('heatmap.outer_bull') : 'Outer Bull';

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
    const segmentData = typeof data === 'number' ? null : (data as SegmentData);
    const count = typeof data === 'number' ? data : (segmentData?.count || segmentData?.x?.length || 0);

    const parsed = normalizeHeatmapKey(key);
    if (!parsed) return;
    const { segment, multiplier } = parsed;

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

// ---------------------------------------------------------------------------
// Bed aggregation for the board heatmap.
//
// The app records WHICH bed a dart hit, never where on it: there are no
// coordinates. The heatmap therefore colours whole beds by their share instead
// of inventing a scatter cloud around a fixed point.
// ---------------------------------------------------------------------------

/** Board order, clockwise from the top. */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Number of colour steps in the heat ramp (`--m3-heat-1` … `--m3-heat-6`). */
export const HEAT_LEVELS = 6;

/**
 * Reads every key format that exists in this codebase:
 *   "3x20"  multiplier x segment (live heatmap in the game screen)
 *   "20-3"  segment - multiplier (persisted heatmap, match history)
 * Bulls arrive as 25-1, 25-2, 50-2, 2x50, 1x25 and become segment 25 with
 * multiplier 1 (outer) or 2 (bull). Segment 0 is a miss.
 */
export const normalizeHeatmapKey = (key: string): { segment: number; multiplier: number } | null => {
  let segment: number;
  let multiplier: number;
  const x = /^(\d+)x(\d+)$/.exec(key);
  const dash = /^(\d+)-(\d+)$/.exec(key);
  if (x) { multiplier = Number(x[1]); segment = Number(x[2]); }
  else if (dash) { segment = Number(dash[1]); multiplier = Number(dash[2]); }
  else return null;

  if (segment === 0) return { segment: 0, multiplier: 0 };
  if (segment === 50) return { segment: 25, multiplier: 2 };
  if (segment === 25) return multiplier === 1 || multiplier === 2 ? { segment: 25, multiplier } : null;
  if (segment < 1 || segment > 20 || multiplier < 1 || multiplier > 3) return null;
  return { segment, multiplier };
};

/** Canonical bed id: "20-3", "25-1" (outer bull), "25-2" (bull). */
export const bedKey = (segment: number, multiplier: number): string => `${segment}-${multiplier}`;

/** Count stored under a key: a plain number or the legacy {x, y, count} object. */
const countOf = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  if (value && typeof value === 'object') {
    const v = value as { count?: unknown; x?: unknown };
    if (typeof v.count === 'number' && v.count > 0) return v.count;
    if (Array.isArray(v.x)) return v.x.length;
  }
  return 0;
};

export interface BedAggregate {
  /** Hits per canonical bed id; misses are not a bed. */
  beds: Record<string, number>;
  misses: number;
  /** Darts that landed on the board. */
  hits: number;
  /** Every dart, misses included — the same basis for every data source. */
  total: number;
  /** Hits on the hottest bed. */
  max: number;
}

export const aggregateBeds = (heatmapData: Pick<HeatmapData, 'segments' | 'totalDarts'>): BedAggregate => {
  let raw: Record<string, unknown> = {};
  const src = heatmapData.segments as unknown;
  if (typeof src === 'string') {
    try { raw = JSON.parse(src) ?? {}; } catch { raw = {}; }
  } else if (src && typeof src === 'object') {
    raw = src as Record<string, unknown>;
  }

  const beds: Record<string, number> = {};
  let misses = 0;
  let hits = 0;
  for (const [key, value] of Object.entries(raw)) {
    const parsed = normalizeHeatmapKey(key);
    const count = countOf(value);
    if (!parsed || count === 0) continue;
    if (parsed.segment === 0) { misses += count; continue; }
    const id = bedKey(parsed.segment, parsed.multiplier);
    beds[id] = (beds[id] ?? 0) + count;
    hits += count;
  }
  const max = Object.values(beds).reduce((m, c) => Math.max(m, c), 0);
  // Older data may count darts that were never keyed; never report fewer darts than stored.
  const total = Math.max(hits + misses, heatmapData.totalDarts || 0);
  return { beds, misses, hits, total, max };
};

/**
 * Colour step 0…HEAT_LEVELS for a bed. Square-root scale: a quarter of the
 * hottest bed sits half-way up the ramp, so one dominant bed does not grey out
 * everything else. Any hit gets at least step 1.
 */
export const heatLevel = (count: number, max: number): number => {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(HEAT_LEVELS, Math.max(1, Math.ceil(Math.sqrt(count / max) * HEAT_LEVELS - 1e-9)));
};

/** Left and right neighbour of a number on the board (as seen by the thrower). */
export const boardNeighbours = (segment: number): [number, number] => {
  const i = BOARD_ORDER.indexOf(segment);
  const n = BOARD_ORDER.length;
  return [BOARD_ORDER[(i - 1 + n) % n], BOARD_ORDER[(i + 1) % n]];
};

export interface BoardStats {
  tripleRate: number;
  doubleRate: number;
  singleRate: number;
  bullRate: number;
  innerBullRate: number;
  missRate: number;
  /** The strongest number (all its beds) and how many darts spilled to either side. */
  zone: { segment: number; count: number; left: number; leftCount: number; right: number; rightCount: number } | null;
}

export const boardStats = (agg: BedAggregate): BoardStats => {
  const pct = (n: number) => (agg.total > 0 ? (n / agg.total) * 100 : 0);
  let triples = 0, doubles = 0, singles = 0;
  const perNumber = new Map<number, number>();
  for (const [id, count] of Object.entries(agg.beds)) {
    const [segment, multiplier] = id.split('-').map(Number);
    if (segment === 25) continue;
    if (multiplier === 3) triples += count;
    else if (multiplier === 2) doubles += count;
    else singles += count;
    perNumber.set(segment, (perNumber.get(segment) ?? 0) + count);
  }
  const outer = agg.beds['25-1'] ?? 0;
  const bull = agg.beds['25-2'] ?? 0;

  let zone: BoardStats['zone'] = null;
  for (const segment of BOARD_ORDER) {
    const count = perNumber.get(segment) ?? 0;
    if (count > 0 && (!zone || count > zone.count)) {
      const [left, right] = boardNeighbours(segment);
      zone = { segment, count, left, leftCount: perNumber.get(left) ?? 0, right, rightCount: perNumber.get(right) ?? 0 };
    }
  }

  return {
    tripleRate: pct(triples),
    doubleRate: pct(doubles),
    singleRate: pct(singles),
    bullRate: pct(outer + bull),
    innerBullRate: pct(bull),
    missRate: pct(agg.misses),
    zone,
  };
};

/**
 * Heatmap of one player's darts in a list of visits (live game, match detail).
 * Keys are canonical "<segment>-<multiplier>" and misses count, so the rates
 * share the basis of the stored heatmap.
 */
export const heatmapFromThrows = (
  throws: { playerId: string; darts?: Pick<Dart, 'segment' | 'multiplier'>[] }[],
  playerId: string,
): HeatmapData => {
  const segments: Record<string, number> = {};
  let totalDarts = 0;
  for (const visit of throws) {
    if (visit.playerId !== playerId) continue;
    for (const dart of visit.darts ?? []) {
      const key = bedKey(dart.segment, dart.multiplier);
      segments[key] = (segments[key] ?? 0) + 1;
      totalDarts++;
    }
  }
  return { playerId, segments, totalDarts, lastUpdated: new Date() };
};
