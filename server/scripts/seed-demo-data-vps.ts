/**
 * Seed complete demo data directly on VPS
 * This script connects to the VPS database and adds:
 * - Player statistics (for spiderweb chart)
 * - Personal bests
 * - Achievements
 * - Match history with proper stats
 * - Heatmap data with x/y coordinates
 *
 * Run with: npx ts-node scripts/seed-demo-data-vps.ts
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Use local database - will be copied to VPS after
const DB_PATH = path.join(__dirname, '../data/state-of-the-dart.db');
const db = new Database(DB_PATH);

// VPS tenant ID (martinpaush@gmail.com's tenant)
const VPS_TENANT_ID = '953c97d6-b8b4-4641-a6f9-2dcbfd07b32d';

// Dartboard layout
const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLES: Record<number, number> = {};
SEGMENTS.forEach((seg, i) => {
  SEGMENT_ANGLES[seg] = i * 18;
});

const RINGS = {
  DOUBLE: { inner: 0.85, outer: 0.95 },
  OUTER_SINGLE: { inner: 0.55, outer: 0.85 },
  TRIPLE: { inner: 0.45, outer: 0.55 },
  INNER_SINGLE: { inner: 0.15, outer: 0.45 },
  OUTER_BULL: { inner: 0.05, outer: 0.15 },
  INNER_BULL: { inner: 0, outer: 0.05 }
};

interface PlayerProfile {
  name: string;
  emoji: string;
  // Skill levels (0-100)
  skill: number;
  // Playing style
  t20Focus: number;
  t19Focus: number;
  bullFocus: number;
  // Stats to generate
  gamesPlayed: number;
  winRate: number;
  avgScore: number;
  checkoutPct: number;
  total180s: number;
  highestCheckout: number;
  bestLegDarts: number;
}

const PLAYER_PROFILES: PlayerProfile[] = [
  {
    name: 'Max "The Machine" Müller',
    emoji: '🤖',
    skill: 85,
    t20Focus: 0.7,
    t19Focus: 0.2,
    bullFocus: 0.05,
    gamesPlayed: 47,
    winRate: 0.72,
    avgScore: 82.5,
    checkoutPct: 42.3,
    total180s: 23,
    highestCheckout: 164,
    bestLegDarts: 15
  },
  {
    name: 'Anna "Bullseye" Schmidt',
    emoji: '🎯',
    skill: 70,
    t20Focus: 0.2,
    t19Focus: 0.15,
    bullFocus: 0.55,
    gamesPlayed: 38,
    winRate: 0.58,
    avgScore: 68.2,
    checkoutPct: 38.5,
    total180s: 8,
    highestCheckout: 148,
    bestLegDarts: 18
  },
  {
    name: 'Tom "Steady" Weber',
    emoji: '🏋️',
    skill: 60,
    t20Focus: 0.45,
    t19Focus: 0.3,
    bullFocus: 0.1,
    gamesPlayed: 52,
    winRate: 0.48,
    avgScore: 55.8,
    checkoutPct: 32.1,
    total180s: 5,
    highestCheckout: 121,
    bestLegDarts: 21
  },
  {
    name: 'Lisa "Lucky" Meyer',
    emoji: '🍀',
    skill: 45,
    t20Focus: 0.3,
    t19Focus: 0.25,
    bullFocus: 0.15,
    gamesPlayed: 29,
    winRate: 0.38,
    avgScore: 45.3,
    checkoutPct: 25.8,
    total180s: 2,
    highestCheckout: 98,
    bestLegDarts: 24
  },
  {
    name: 'Ben "Rookie" Fischer',
    emoji: '🌱',
    skill: 30,
    t20Focus: 0.35,
    t19Focus: 0.2,
    bullFocus: 0.05,
    gamesPlayed: 15,
    winRate: 0.2,
    avgScore: 35.7,
    checkoutPct: 18.2,
    total180s: 0,
    highestCheckout: 72,
    bestLegDarts: 30
  }
];

function gaussianRandom(mean: number = 0, stdev: number = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius
  };
}

function getSegmentFromAngle(angle: number): number {
  let normalizedAngle = ((angle % 360) + 360) % 360;
  const segmentIndex = Math.floor(((normalizedAngle + 9) % 360) / 18);
  return SEGMENTS[segmentIndex];
}

function getMultiplierFromRadius(radius: number): number {
  if (radius <= RINGS.INNER_BULL.outer) return 2;
  if (radius <= RINGS.OUTER_BULL.outer) return 1;
  if (radius <= RINGS.INNER_SINGLE.outer) return 1;
  if (radius <= RINGS.TRIPLE.outer) return 3;
  if (radius <= RINGS.OUTER_SINGLE.outer) return 1;
  if (radius <= RINGS.DOUBLE.outer) return 2;
  return 0;
}

function generateThrow(profile: PlayerProfile, targetType: 'T20' | 'T19' | 'BULL' | 'RANDOM' = 'T20'): {
  segment: number;
  multiplier: number;
  score: number;
  x: number;
  y: number;
} {
  let targetAngle: number;
  let targetRadius: number;

  if (targetType === 'T20') {
    targetAngle = SEGMENT_ANGLES[20];
    targetRadius = 0.5;
  } else if (targetType === 'T19') {
    targetAngle = SEGMENT_ANGLES[19];
    targetRadius = 0.5;
  } else if (targetType === 'BULL') {
    targetAngle = Math.random() * 360;
    targetRadius = 0.05;
  } else {
    const randomSegment = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
    targetAngle = SEGMENT_ANGLES[randomSegment];
    targetRadius = 0.3 + Math.random() * 0.4;
  }

  const accuracy = profile.skill / 100;
  const angleVariance = gaussianRandom(0, (1 - accuracy) * 25);
  const radiusVariance = gaussianRandom(0, (1 - accuracy) * 0.25);

  const actualAngle = targetAngle + angleVariance;
  let actualRadius = Math.max(0, Math.min(1.05, targetRadius + radiusVariance));

  const { x, y } = polarToCartesian(actualAngle, actualRadius);

  let segment: number;
  let multiplier: number;
  let score: number;

  if (actualRadius > 1.0) {
    segment = 0;
    multiplier = 0;
    score = 0;
  } else if (actualRadius <= RINGS.OUTER_BULL.outer) {
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

function generateVisit(profile: PlayerProfile): Array<{
  segment: number;
  multiplier: number;
  score: number;
  x: number;
  y: number;
}> {
  const darts = [];
  for (let i = 0; i < 3; i++) {
    const rand = Math.random();
    let targetType: 'T20' | 'T19' | 'BULL' | 'RANDOM';

    if (rand < profile.t20Focus) targetType = 'T20';
    else if (rand < profile.t20Focus + profile.t19Focus) targetType = 'T19';
    else if (rand < profile.t20Focus + profile.t19Focus + profile.bullFocus) targetType = 'BULL';
    else targetType = 'RANDOM';

    darts.push(generateThrow(profile, targetType));
  }
  return darts;
}

async function main() {
  console.log('🎯 Seeding complete demo data...\n');

  const now = Date.now();

  // 1. First, ensure VPS tenant exists
  console.log('1️⃣ Setting up VPS tenant...');

  // Check if tenant exists, if not create it (need user first)
  const existingTenant = db.prepare(`SELECT id FROM tenants WHERE id = ?`).get(VPS_TENANT_ID);
  if (!existingTenant) {
    // Check if user exists
    let userId = db.prepare(`SELECT id FROM users WHERE email = 'martinpaush@gmail.com'`).get() as { id: string } | undefined;
    if (!userId) {
      const newUserId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, email, name, email_verified, created_at, last_active)
        VALUES (?, 'martinpaush@gmail.com', 'Martin Pfeffer', 1, ?, ?)
      `).run(newUserId, now, now);
      userId = { id: newUserId };
      console.log(`   Created user: ${newUserId}`);
    }

    db.prepare(`
      INSERT INTO tenants (id, user_id, name, avatar, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(VPS_TENANT_ID, userId.id, "Martin's Profil", '🎯', now, now);
    console.log(`   Created tenant: ${VPS_TENANT_ID}`);
  } else {
    console.log(`   Tenant exists: ${VPS_TENANT_ID}`);
  }

  // Get current players
  const existingPlayers = db.prepare(`SELECT id, name FROM players`).all() as Array<{ id: string; name: string }>;
  console.log(`   Found ${existingPlayers.length} existing players\n`);

  // 2. Clean up and recreate players if needed
  console.log('2️⃣ Setting up demo players...');

  // Delete existing demo data
  db.prepare(`DELETE FROM throws`).run();
  db.prepare(`DELETE FROM legs`).run();
  db.prepare(`DELETE FROM match_players`).run();
  db.prepare(`DELETE FROM matches`).run();
  db.prepare(`DELETE FROM player_stats`).run();
  db.prepare(`DELETE FROM player_achievements`).run();
  db.prepare(`DELETE FROM personal_bests`).run();
  db.prepare(`DELETE FROM heatmap_data`).run();
  db.prepare(`DELETE FROM players`).run();

  // Create fresh players
  const playerIds: Record<string, string> = {};

  for (const profile of PLAYER_PROFILES) {
    const playerId = uuidv4();
    playerIds[profile.name] = playerId;

    db.prepare(`
      INSERT INTO players (id, tenant_id, name, avatar, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(playerId, VPS_TENANT_ID, profile.name, profile.emoji, now);

    console.log(`   ✅ Created: ${profile.name} (${playerId})`);
  }
  console.log('');

  // 3. Generate matches and match stats
  console.log('3️⃣ Generating matches and statistics...\n');

  const matchSettings = JSON.stringify({
    startingScore: 501,
    setsToWin: 1,
    legsToWin: 3,
    doubleOut: true
  });

  for (const profile of PLAYER_PROFILES) {
    const playerId = playerIds[profile.name];
    console.log(`   🎯 ${profile.name}:`);

    const gamesWon = Math.round(profile.gamesPlayed * profile.winRate);
    const legsPlayed = profile.gamesPlayed * 3; // ~3 legs per game
    const legsWon = Math.round(legsPlayed * profile.winRate);

    // Generate heatmap data from throws
    const heatmapData: Record<string, { x: number[]; y: number[]; count: number }> = {};
    let totalDarts = 0;
    let totalScore = 0;
    let count180s = 0;
    let count140Plus = 0;
    let count100Plus = 0;
    let count60Plus = 0;

    // Create matches
    for (let g = 0; g < profile.gamesPlayed; g++) {
      const matchId = uuidv4();
      const matchTime = now - (profile.gamesPlayed - g) * 86400000; // 1 day apart
      const isWin = g < gamesWon;

      // Pick random opponent
      const opponents = PLAYER_PROFILES.filter(p => p.name !== profile.name);
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      const opponentId = playerIds[opponent.name];

      db.prepare(`
        INSERT INTO matches (id, tenant_id, game_type, status, winner, started_at, completed_at, settings)
        VALUES (?, ?, 'X01', 'completed', ?, ?, ?, ?)
      `).run(matchId, VPS_TENANT_ID, isWin ? playerId : opponentId, matchTime, matchTime + 600000, matchSettings);

      // Add players to match
      const playerMatchAvg = profile.avgScore + gaussianRandom(0, 5);
      const opponentMatchAvg = opponent.avgScore + gaussianRandom(0, 5);

      db.prepare(`
        INSERT INTO match_players (id, match_id, player_id, match_average, first9_average, highest_score,
          checkouts_hit, checkout_attempts, match_180s, match_140_plus, match_100_plus, darts_thrown, legs_won)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), matchId, playerId,
        playerMatchAvg, playerMatchAvg + gaussianRandom(0, 3),
        Math.min(180, Math.round(profile.avgScore * 2 + Math.random() * 60)),
        Math.round(3 * profile.checkoutPct / 100),
        3,
        Math.random() < profile.total180s / profile.gamesPlayed ? 1 : 0,
        Math.round(Math.random() * 3),
        Math.round(Math.random() * 5),
        Math.round(501 / profile.avgScore * 3 * 3),
        isWin ? 3 : Math.floor(Math.random() * 3)
      );

      db.prepare(`
        INSERT INTO match_players (id, match_id, player_id, match_average, darts_thrown, legs_won)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), matchId, opponentId,
        opponentMatchAvg,
        Math.round(501 / opponent.avgScore * 3 * 3),
        isWin ? Math.floor(Math.random() * 3) : 3
      );

      // Create legs with throws
      for (let leg = 0; leg < 3; leg++) {
        const legId = uuidv4();
        db.prepare(`
          INSERT INTO legs (id, match_id, leg_number, winner, started_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(legId, matchId, leg + 1, playerId, matchTime + leg * 60000, matchTime + (leg + 1) * 60000);

        // Generate visits for this leg
        const numVisits = Math.round(501 / profile.avgScore);
        for (let v = 0; v < numVisits; v++) {
          const visit = generateVisit(profile);
          const visitScore = visit.reduce((sum, d) => sum + d.score, 0);

          totalScore += visitScore;
          totalDarts += 3;

          if (visitScore === 180) count180s++;
          else if (visitScore >= 140) count140Plus++;
          else if (visitScore >= 100) count100Plus++;
          else if (visitScore >= 60) count60Plus++;

          // Track heatmap
          for (const dart of visit) {
            if (dart.score > 0) {
              const key = dart.segment === 25
                ? `${dart.multiplier === 2 ? 50 : 25}-1`
                : `${dart.segment}-${dart.multiplier}`;

              if (!heatmapData[key]) {
                heatmapData[key] = { x: [], y: [], count: 0 };
              }
              heatmapData[key].x.push(Math.round(dart.x * 1000) / 1000);
              heatmapData[key].y.push(Math.round(dart.y * 1000) / 1000);
              heatmapData[key].count++;
            }
          }

          // Insert throw
          db.prepare(`
            INSERT INTO throws (id, leg_id, player_id, darts, score, remaining, timestamp, visit_number, running_average)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(), legId, playerId,
            JSON.stringify(visit.map(d => ({ segment: d.segment, multiplier: d.multiplier, score: d.score, x: d.x, y: d.y }))),
            visitScore, Math.max(0, 501 - (v + 1) * profile.avgScore),
            matchTime + v * 5000, v + 1, profile.avgScore
          );
        }
      }
    }

    const actualAvg = totalDarts > 0 ? Math.round(totalScore / totalDarts * 3 * 100) / 100 : 0;
    console.log(`      Games: ${profile.gamesPlayed} (${gamesWon} wins)`);
    console.log(`      Darts: ${totalDarts}, Avg: ${actualAvg}`);
    console.log(`      180s: ${count180s}, 140+: ${count140Plus}, 100+: ${count100Plus}`);

    // 4. Insert player_stats
    db.prepare(`
      INSERT INTO player_stats (
        player_id, games_played, games_won, total_legs_played, total_legs_won,
        highest_checkout, total_180s, total_171_plus, total_140_plus, total_100_plus, total_60_plus,
        best_average, average_overall, checkout_percentage, best_leg, nine_dart_finishes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId,
      profile.gamesPlayed,
      gamesWon,
      legsPlayed,
      legsWon,
      profile.highestCheckout,
      profile.total180s,
      Math.round(profile.total180s * 0.5), // 171+
      count140Plus,
      count100Plus,
      count60Plus,
      profile.avgScore + 10, // Best avg slightly higher
      profile.avgScore,
      profile.checkoutPct,
      profile.bestLegDarts,
      profile.skill > 80 ? 1 : 0 // Only top player might have 9-darter
    );

    // 5. Insert personal_bests
    const personalBests = {
      highestScore: { value: 180, date: now - Math.random() * 30 * 86400000 },
      bestAverage: { value: profile.avgScore + 15, date: now - Math.random() * 30 * 86400000 },
      most180s: { value: Math.ceil(profile.total180s / profile.gamesPlayed * 2), date: now - Math.random() * 30 * 86400000 },
      highestCheckout: { value: profile.highestCheckout, date: now - Math.random() * 30 * 86400000 },
      bestCheckoutRate: { value: profile.checkoutPct + 10, date: now - Math.random() * 30 * 86400000 },
      shortestLeg: { value: profile.bestLegDarts, date: now - Math.random() * 30 * 86400000 },
      longestWinStreak: { value: Math.round(profile.winRate * 5), date: now - Math.random() * 30 * 86400000 },
      mostLegsWon: { value: Math.round(profile.winRate * 6), date: now - Math.random() * 30 * 86400000 }
    };

    db.prepare(`
      INSERT INTO personal_bests (player_id, data, last_updated)
      VALUES (?, ?, ?)
    `).run(playerId, JSON.stringify(personalBests), now);

    // 6. Insert heatmap_data
    db.prepare(`
      INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
      VALUES (?, ?, ?, ?)
    `).run(playerId, JSON.stringify(heatmapData), totalDarts, now);

    const topSegments = Object.entries(heatmapData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v.count}`)
      .join(', ');
    console.log(`      Heatmap top: ${topSegments}\n`);
  }

  // 7. Unlock achievements
  console.log('4️⃣ Unlocking achievements...\n');

  const achievements = db.prepare(`SELECT id, name FROM achievements`).all() as Array<{ id: string; name: string }>;
  console.log(`   Found ${achievements.length} achievements`);

  for (const profile of PLAYER_PROFILES) {
    const playerId = playerIds[profile.name];
    const unlockedAchievements: string[] = [];

    // Unlock based on profile stats
    if (profile.total180s >= 1) unlockedAchievements.push('first-180');
    if (profile.total180s >= 10) unlockedAchievements.push('ten-180s');
    if (profile.gamesPlayed >= 1 && profile.winRate > 0) unlockedAchievements.push('first-win');
    if (profile.winRate >= 0.5 && profile.gamesPlayed >= 5) unlockedAchievements.push('winning-streak-5');
    if (profile.highestCheckout >= 100) unlockedAchievements.push('high-checkout');
    if (profile.highestCheckout >= 170) unlockedAchievements.push('perfect-checkout');
    if (profile.avgScore >= 80) unlockedAchievements.push('average-80');
    if (profile.avgScore >= 100) unlockedAchievements.push('average-100');
    if (profile.gamesPlayed >= 10) unlockedAchievements.push('games-played-10');
    if (profile.skill > 80) unlockedAchievements.push('nine-darter');

    for (const achievementId of unlockedAchievements) {
      const exists = achievements.find(a => a.id === achievementId);
      if (exists) {
        db.prepare(`
          INSERT OR IGNORE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
          VALUES (?, ?, ?, ?, 100)
        `).run(uuidv4(), playerId, achievementId, now - Math.random() * 30 * 86400000);
      }
    }

    console.log(`   ${profile.name}: ${unlockedAchievements.length} achievements`);
  }

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Copy database to VPS:');
  console.log('      scp server/data/state-of-the-dart.db root@69.62.121.168:/var/www/stateofthedart-backend/data/');
  console.log('   2. Restart backend:');
  console.log('      ssh root@69.62.121.168 "pm2 restart stateofthedart-backend"');

  db.close();
}

main().catch(console.error);
