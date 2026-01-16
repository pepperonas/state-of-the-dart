/**
 * Generate EXTREME heatmap differences for demo players
 * Each player should have a VERY distinct throwing pattern
 *
 * - Max "The Machine" Müller: 80%+ T20 only - tight cluster
 * - Anna "Bullseye" Schmidt: 70%+ Bulls only - center cluster
 * - Tom "Steady" Weber: Even distribution across 20/19/18 - spread pattern
 * - Lisa "Lucky" Meyer: Random scatter across entire board
 * - Ben "Rookie" Fischer: Misses a lot - hits 1s, 5s, wide scatter
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/state-of-the-dart.db');
const db = new Database(DB_PATH);

const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLES: Record<number, number> = {};
SEGMENTS.forEach((seg, i) => {
  SEGMENT_ANGLES[seg] = i * 18;
});

interface HeatmapSegment {
  x: number[];
  y: number[];
  count: number;
}

function gaussianRandom(mean: number = 0, stdev: number = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius
  };
}

function generateTightCluster(centerAngle: number, centerRadius: number, count: number, spread: number = 0.05): HeatmapSegment {
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < count; i++) {
    const angle = centerAngle + gaussianRandom(0, 8); // Small angle variance
    const radius = centerRadius + gaussianRandom(0, spread);
    const pos = polarToCartesian(angle, Math.max(0, Math.min(0.95, radius)));
    x.push(Math.round(pos.x * 1000) / 1000);
    y.push(Math.round(pos.y * 1000) / 1000);
  }

  return { x, y, count };
}

function generateBullCluster(count: number): HeatmapSegment {
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 360;
    const radius = Math.abs(gaussianRandom(0.03, 0.04)); // Tight around center
    const pos = polarToCartesian(angle, Math.min(0.12, radius));
    x.push(Math.round(pos.x * 1000) / 1000);
    y.push(Math.round(pos.y * 1000) / 1000);
  }

  return { x, y, count };
}

function generateScattered(count: number): HeatmapSegment {
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 360;
    const radius = 0.15 + Math.random() * 0.75; // Across the whole board
    const pos = polarToCartesian(angle, radius);
    x.push(Math.round(pos.x * 1000) / 1000);
    y.push(Math.round(pos.y * 1000) / 1000);
  }

  return { x, y, count };
}

function mergeSegments(a: HeatmapSegment, b: HeatmapSegment): HeatmapSegment {
  return {
    x: [...a.x, ...b.x],
    y: [...a.y, ...b.y],
    count: a.count + b.count
  };
}

function generateMaxHeatmap(): Record<string, HeatmapSegment> {
  // Max: 80% T20, very tight cluster
  const segments: Record<string, HeatmapSegment> = {};

  // Triple 20 - MASSIVE cluster (1200 darts)
  segments['20-3'] = generateTightCluster(SEGMENT_ANGLES[20], 0.5, 1200, 0.04);

  // Single 20 from misses (150 darts)
  segments['20-1'] = generateTightCluster(SEGMENT_ANGLES[20], 0.35, 150, 0.08);

  // Some T19 (100 darts)
  segments['19-3'] = generateTightCluster(SEGMENT_ANGLES[19], 0.5, 100, 0.05);

  // Occasional 1 and 5 misses
  segments['1-1'] = generateTightCluster(SEGMENT_ANGLES[1], 0.4, 30, 0.1);
  segments['5-1'] = generateTightCluster(SEGMENT_ANGLES[5], 0.4, 20, 0.1);

  return segments;
}

function generateAnnaHeatmap(): Record<string, HeatmapSegment> {
  // Anna: 70% Bulls, center cluster
  const segments: Record<string, HeatmapSegment> = {};

  // Bullseye (inner) - 600 hits
  segments['50-1'] = generateBullCluster(600);

  // Single bull (outer) - 400 hits
  segments['25-1'] = generateBullCluster(400);
  // Spread these out slightly more
  segments['25-1'].x = segments['25-1'].x.map(v => v * 1.8);
  segments['25-1'].y = segments['25-1'].y.map(v => v * 1.8);

  // Some misses around the bull hit random segments
  const missAngles = [3, 17, 19, 7, 16, 8];
  missAngles.forEach(seg => {
    segments[`${seg}-1`] = generateTightCluster(SEGMENT_ANGLES[seg], 0.25, 40, 0.1);
  });

  return segments;
}

function generateTomHeatmap(): Record<string, HeatmapSegment> {
  // Tom: Spread across T20, T19, T18 with wider scatter
  const segments: Record<string, HeatmapSegment> = {};

  // T20 area (300 darts)
  segments['20-3'] = generateTightCluster(SEGMENT_ANGLES[20], 0.5, 250, 0.06);
  segments['20-1'] = generateTightCluster(SEGMENT_ANGLES[20], 0.35, 180, 0.12);

  // T19 area (280 darts)
  segments['19-3'] = generateTightCluster(SEGMENT_ANGLES[19], 0.5, 220, 0.06);
  segments['19-1'] = generateTightCluster(SEGMENT_ANGLES[19], 0.35, 150, 0.12);

  // T18 area (200 darts)
  segments['18-3'] = generateTightCluster(SEGMENT_ANGLES[18], 0.5, 150, 0.06);
  segments['18-1'] = generateTightCluster(SEGMENT_ANGLES[18], 0.35, 100, 0.12);

  // Some wider misses
  segments['1-1'] = generateTightCluster(SEGMENT_ANGLES[1], 0.4, 80, 0.15);
  segments['5-1'] = generateTightCluster(SEGMENT_ANGLES[5], 0.4, 60, 0.15);
  segments['4-1'] = generateTightCluster(SEGMENT_ANGLES[4], 0.4, 50, 0.15);

  return segments;
}

function generateLisaHeatmap(): Record<string, HeatmapSegment> {
  // Lisa: Random scatter across the entire board
  const segments: Record<string, HeatmapSegment> = {};

  // Scatter hits across all segments randomly
  SEGMENTS.forEach(seg => {
    const hitCount = Math.floor(30 + Math.random() * 70); // 30-100 per segment
    segments[`${seg}-1`] = generateTightCluster(SEGMENT_ANGLES[seg], 0.4, hitCount, 0.2);

    // Some triples randomly
    if (Math.random() > 0.6) {
      segments[`${seg}-3`] = generateTightCluster(SEGMENT_ANGLES[seg], 0.5, Math.floor(hitCount * 0.2), 0.08);
    }
  });

  // Some bulls
  segments['25-1'] = generateBullCluster(80);
  segments['50-1'] = generateBullCluster(40);

  return segments;
}

function generateBenHeatmap(): Record<string, HeatmapSegment> {
  // Ben: Lots of misses, hits 1s and 5s (neighbors of 20), very wide scatter
  const segments: Record<string, HeatmapSegment> = {};

  // Aiming for 20 but hitting 1 and 5 mostly
  segments['1-1'] = generateTightCluster(SEGMENT_ANGLES[1], 0.45, 350, 0.2);
  segments['5-1'] = generateTightCluster(SEGMENT_ANGLES[5], 0.45, 320, 0.2);

  // Some actual 20s
  segments['20-1'] = generateTightCluster(SEGMENT_ANGLES[20], 0.4, 150, 0.2);
  segments['20-3'] = generateTightCluster(SEGMENT_ANGLES[20], 0.5, 40, 0.1);

  // Wide misses across board
  segments['18-1'] = generateTightCluster(SEGMENT_ANGLES[18], 0.5, 100, 0.25);
  segments['4-1'] = generateTightCluster(SEGMENT_ANGLES[4], 0.5, 80, 0.25);
  segments['13-1'] = generateTightCluster(SEGMENT_ANGLES[13], 0.5, 60, 0.25);

  // Random complete misses
  [6, 10, 15, 2, 17].forEach(seg => {
    segments[`${seg}-1`] = generateScattered(30 + Math.floor(Math.random() * 40));
  });

  return segments;
}

async function main() {
  console.log('🎯 Generating EXTREME heatmap differences...\n');

  const players = db.prepare(`
    SELECT id, name FROM players
    WHERE tenant_id = '953c97d6-b8b4-4641-a6f9-2dcbfd07b32d'
  `).all() as Array<{ id: string; name: string }>;

  const now = Date.now();

  const heatmapGenerators: Record<string, () => Record<string, HeatmapSegment>> = {
    'Max "The Machine" Müller': generateMaxHeatmap,
    'Anna "Bullseye" Schmidt': generateAnnaHeatmap,
    'Tom "Steady" Weber': generateTomHeatmap,
    'Lisa "Lucky" Meyer': generateLisaHeatmap,
    'Ben "Rookie" Fischer': generateBenHeatmap
  };

  for (const player of players) {
    const generator = heatmapGenerators[player.name];
    if (!generator) {
      console.log(`⚠️ No generator for ${player.name}`);
      continue;
    }

    console.log(`🎯 ${player.name}:`);

    const segments = generator();
    let totalDarts = 0;

    Object.values(segments).forEach(seg => {
      totalDarts += seg.count;
    });

    // Show top 3 hotspots
    const sortedSegments = Object.entries(segments)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    console.log(`   Total darts: ${totalDarts}`);
    console.log(`   Top 3: ${sortedSegments.map(([k, v]) => `${k}:${v.count}`).join(', ')}`);

    // Update heatmap_data
    db.prepare(`
      INSERT OR REPLACE INTO heatmap_data (player_id, segments, total_darts, last_updated)
      VALUES (?, ?, ?, ?)
    `).run(player.id, JSON.stringify(segments), totalDarts, now);

    console.log('');
  }

  console.log('✅ Extreme heatmaps generated!');
  console.log('\nExport with:');
  console.log('  sqlite3 data/state-of-the-dart.db ".mode insert heatmap_data" "SELECT * FROM heatmap_data" > /tmp/heatmap-update.sql');

  db.close();
}

main().catch(console.error);
