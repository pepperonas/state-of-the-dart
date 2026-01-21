/**
 * Generate demo throws for demo players with characteristic throw patterns
 *
 * Player profiles:
 * - Max "The Machine" Müller: Pro player, consistent T20 focus, ~85 avg
 * - Anna "Bullseye" Schmidt: Bull specialist, loves 25s and bulls, ~65 avg
 * - Tom "Steady" Weber: Consistent but not flashy, spreads across board, ~55 avg
 * - Lisa "Lucky" Meyer: Random/lucky, scattered pattern, occasional big scores, ~45 avg
 * - Ben "Rookie" Fischer: Beginner, lots of 1s and 5s, misses often, ~35 avg
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DB_PATH = path.join(__dirname, '../data/state-of-the-dart.db');
const db = new Database(DB_PATH);

const DEMO_TENANT_ID = '92e1fb57-fc92-42ab-9977-7c9a11f9c459';

// Dartboard layout - segments clockwise from top
const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Segment center angles (degrees, 0 = top)
const SEGMENT_ANGLES: Record<number, number> = {};
SEGMENTS.forEach((seg, i) => {
  SEGMENT_ANGLES[seg] = i * 18; // Each segment is 18 degrees
});

// Ring radii (normalized 0-1 where 1 = edge of board)
const RINGS = {
  DOUBLE: { inner: 0.85, outer: 0.95 },
  OUTER_SINGLE: { inner: 0.55, outer: 0.85 },
  TRIPLE: { inner: 0.45, outer: 0.55 },
  INNER_SINGLE: { inner: 0.15, outer: 0.45 },
  OUTER_BULL: { inner: 0.05, outer: 0.15 },
  INNER_BULL: { inner: 0, outer: 0.05 }
};

interface ThrowProfile {
  // Target preferences (weights)
  t20Weight: number;
  t19Weight: number;
  bullWeight: number;
  randomWeight: number;

  // Accuracy (0-1, where 1 = perfect)
  accuracy: number;

  // Consistency (lower = more variance in accuracy)
  consistency: number;

  // Expected average
  expectedAvg: number;
}

const PLAYER_PROFILES: Record<string, ThrowProfile> = {
  'Max "The Machine" Müller': {
    t20Weight: 0.7,
    t19Weight: 0.2,
    bullWeight: 0.05,
    randomWeight: 0.05,
    accuracy: 0.75,
    consistency: 0.85,
    expectedAvg: 85
  },
  'Anna "Bullseye" Schmidt': {
    t20Weight: 0.15,
    t19Weight: 0.15,
    bullWeight: 0.6,
    randomWeight: 0.1,
    accuracy: 0.6,
    consistency: 0.7,
    expectedAvg: 65
  },
  'Tom "Steady" Weber': {
    t20Weight: 0.4,
    t19Weight: 0.3,
    bullWeight: 0.1,
    randomWeight: 0.2,
    accuracy: 0.5,
    consistency: 0.8,
    expectedAvg: 55
  },
  'Lisa "Lucky" Meyer': {
    t20Weight: 0.25,
    t19Weight: 0.2,
    bullWeight: 0.1,
    randomWeight: 0.45,
    accuracy: 0.35,
    consistency: 0.5,
    expectedAvg: 45
  },
  'Ben "Rookie" Fischer': {
    t20Weight: 0.3,
    t19Weight: 0.15,
    bullWeight: 0.05,
    randomWeight: 0.5,
    accuracy: 0.2,
    consistency: 0.4,
    expectedAvg: 35
  }
};

function gaussianRandom(mean: number = 0, stdev: number = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  // Convert angle to radians, adjust so 0 degrees is at top
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius
  };
}

function getSegmentFromAngle(angle: number): number {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;
  // Each segment is 18 degrees, offset by 9 degrees (half segment)
  const segmentIndex = Math.floor(((normalizedAngle + 9) % 360) / 18);
  return SEGMENTS[segmentIndex];
}

function getMultiplierFromRadius(radius: number): number {
  if (radius <= RINGS.INNER_BULL.outer) return 2; // Bull (50)
  if (radius <= RINGS.OUTER_BULL.outer) return 1; // Outer bull (25)
  if (radius <= RINGS.INNER_SINGLE.outer) return 1; // Inner single
  if (radius <= RINGS.TRIPLE.outer) return 3; // Triple
  if (radius <= RINGS.OUTER_SINGLE.outer) return 1; // Outer single
  if (radius <= RINGS.DOUBLE.outer) return 2; // Double
  return 0; // Miss
}

function isBullArea(radius: number): boolean {
  return radius <= RINGS.OUTER_BULL.outer;
}

function generateThrow(profile: ThrowProfile): {
  segment: number;
  multiplier: number;
  score: number;
  x: number;
  y: number;
} {
  // Determine target based on profile weights
  const rand = Math.random();
  let targetAngle: number;
  let targetRadius: number;

  if (rand < profile.t20Weight) {
    // Aim for T20
    targetAngle = SEGMENT_ANGLES[20];
    targetRadius = (RINGS.TRIPLE.inner + RINGS.TRIPLE.outer) / 2;
  } else if (rand < profile.t20Weight + profile.t19Weight) {
    // Aim for T19
    targetAngle = SEGMENT_ANGLES[19];
    targetRadius = (RINGS.TRIPLE.inner + RINGS.TRIPLE.outer) / 2;
  } else if (rand < profile.t20Weight + profile.t19Weight + profile.bullWeight) {
    // Aim for bull
    targetAngle = Math.random() * 360;
    targetRadius = 0.05;
  } else {
    // Random target
    const randomSegment = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
    targetAngle = SEGMENT_ANGLES[randomSegment];
    targetRadius = 0.3 + Math.random() * 0.4; // Random ring
  }

  // Apply accuracy variance
  const accuracyFactor = profile.accuracy * (profile.consistency + (1 - profile.consistency) * Math.random());
  const angleVariance = gaussianRandom(0, (1 - accuracyFactor) * 30); // Up to 30 degrees off
  const radiusVariance = gaussianRandom(0, (1 - accuracyFactor) * 0.3); // Up to 0.3 radius off

  const actualAngle = targetAngle + angleVariance;
  const actualRadius = Math.max(0, Math.min(1.1, targetRadius + radiusVariance));

  // Convert to cartesian (normalized -1 to 1)
  const { x, y } = polarToCartesian(actualAngle, actualRadius);

  // Determine score
  let segment: number;
  let multiplier: number;
  let score: number;

  if (actualRadius > 1.0) {
    // Miss the board
    segment = 0;
    multiplier = 0;
    score = 0;
  } else if (isBullArea(actualRadius)) {
    // Bull area
    segment = 25;
    multiplier = actualRadius <= RINGS.INNER_BULL.outer ? 2 : 1;
    score = multiplier === 2 ? 50 : 25;
  } else {
    segment = getSegmentFromAngle(actualAngle);
    multiplier = getMultiplierFromRadius(actualRadius);
    score = segment * multiplier;
  }

  return { segment, multiplier, score, x, y };
}

function generateVisit(profile: ThrowProfile): Array<{
  segment: number;
  multiplier: number;
  score: number;
  x: number;
  y: number;
}> {
  return [
    generateThrow(profile),
    generateThrow(profile),
    generateThrow(profile)
  ];
}

async function main() {
  console.log('🎯 Generating demo throws for demo players...\n');

  // 1. Clean up duplicate players - keep only the first of each name
  console.log('1️⃣ Cleaning up duplicate players...');

  const allDemoPlayers = db.prepare(`
    SELECT id, name, created_at FROM players
    WHERE tenant_id = ?
    ORDER BY name, created_at ASC
  `).all(DEMO_TENANT_ID) as Array<{ id: string; name: string; created_at: string }>;

  const seenNames = new Set<string>();
  const playersToKeep: string[] = [];
  const playersToDelete: string[] = [];

  for (const player of allDemoPlayers) {
    if (!seenNames.has(player.name)) {
      seenNames.add(player.name);
      playersToKeep.push(player.id);
      console.log(`   ✅ Keeping: ${player.name} (${player.id})`);
    } else {
      playersToDelete.push(player.id);
    }
  }

  if (playersToDelete.length > 0) {
    // Delete duplicates (cascades to throws, heatmap_data, etc.)
    const deleteStmt = db.prepare('DELETE FROM players WHERE id = ?');
    for (const id of playersToDelete) {
      deleteStmt.run(id);
    }
    console.log(`   🗑️ Deleted ${playersToDelete.length} duplicate players\n`);
  } else {
    console.log('   No duplicates found\n');
  }

  // 2. Get the unique demo players
  const demoPlayers = db.prepare(`
    SELECT id, name FROM players WHERE tenant_id = ?
  `).all(DEMO_TENANT_ID) as Array<{ id: string; name: string }>;

  console.log(`2️⃣ Found ${demoPlayers.length} demo players\n`);

  // 3. Create a demo match and legs for throws
  console.log('3️⃣ Creating demo match structure...');

  const matchId = uuidv4();
  const now = Date.now();

  const matchSettings = JSON.stringify({
    startingScore: 501,
    setsToWin: 1,
    legsToWin: 3,
    doubleOut: true
  });

  db.prepare(`
    INSERT INTO matches (id, tenant_id, game_type, status, started_at, completed_at, settings)
    VALUES (?, ?, 'X01', 'completed', ?, ?, ?)
  `).run(matchId, DEMO_TENANT_ID, now, now, matchSettings);

  // Add all players to match
  for (const player of demoPlayers) {
    db.prepare(`
      INSERT INTO match_players (id, match_id, player_id)
      VALUES (?, ?, ?)
    `).run(uuidv4(), matchId, player.id);
  }

  console.log(`   Created match ${matchId}\n`);

  // 4. Generate throws for each player
  console.log('4️⃣ Generating throws for each player...\n');

  const insertThrow = db.prepare(`
    INSERT INTO throws (id, leg_id, player_id, darts, score, remaining, timestamp, visit_number, running_average)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHeatmap = db.prepare(`
    INSERT OR REPLACE INTO heatmap_data (player_id, segments, total_darts, last_updated)
    VALUES (?, ?, ?, ?)
  `);

  for (const player of demoPlayers) {
    const profile = PLAYER_PROFILES[player.name];
    if (!profile) {
      console.log(`   ⚠️ No profile for ${player.name}, skipping`);
      continue;
    }

    console.log(`   🎯 ${player.name} (expected avg: ~${profile.expectedAvg})`);

    // Create a leg for this player's throws
    const legId = uuidv4();
    db.prepare(`
      INSERT INTO legs (id, match_id, leg_number, started_at, completed_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(legId, matchId, now, now);

    // Generate 100-200 visits (300-600 darts) per player
    const numVisits = 100 + Math.floor(Math.random() * 100);
    const heatmapData: Record<string, { x: number[]; y: number[]; count: number }> = {};
    let totalScore = 0;
    let totalDarts = 0;
    let remaining = 501;

    for (let v = 0; v < numVisits; v++) {
      const visit = generateVisit(profile);
      const visitScore = visit.reduce((sum, t) => sum + t.score, 0);
      totalScore += visitScore;
      totalDarts += 3;

      // Track heatmap data
      for (const dart of visit) {
        if (dart.score > 0) { // Only track hits
          const key = dart.segment === 25
            ? `${dart.multiplier === 2 ? 50 : 25}-1`  // Bull
            : `${dart.segment}-${dart.multiplier}`;

          if (!heatmapData[key]) {
            heatmapData[key] = { x: [], y: [], count: 0 };
          }
          heatmapData[key].x.push(Math.round(dart.x * 1000) / 1000);
          heatmapData[key].y.push(Math.round(dart.y * 1000) / 1000);
          heatmapData[key].count++;
        }
      }

      // Simulate game - reset remaining occasionally
      remaining -= visitScore;
      if (remaining <= 0) {
        remaining = 501;
      }

      const dartsJson = JSON.stringify(visit.map(d => ({
        segment: d.segment,
        multiplier: d.multiplier,
        score: d.score,
        x: d.x,
        y: d.y
      })));

      const runningAvg = totalScore / totalDarts * 3;

      insertThrow.run(
        uuidv4(),
        legId,
        player.id,
        dartsJson,
        visitScore,
        remaining,
        now - (numVisits - v) * 10000, // Spread timestamps
        v + 1,
        Math.round(runningAvg * 100) / 100
      );
    }

    // Calculate actual average
    const actualAvg = Math.round(totalScore / totalDarts * 3 * 100) / 100;
    console.log(`      → ${totalDarts} darts, avg: ${actualAvg}`);

    // Save heatmap data
    insertHeatmap.run(
      player.id,
      JSON.stringify(heatmapData),
      totalDarts,
      now
    );

    // Log heatmap distribution
    const topSegments = Object.entries(heatmapData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v.count}`)
      .join(', ');
    console.log(`      → Top segments: ${topSegments}\n`);
  }

  console.log('✅ Demo throws generated successfully!');
  console.log('\nRun `npm run deploy` or copy the database to VPS to see the changes.');

  db.close();
}

main().catch(console.error);
