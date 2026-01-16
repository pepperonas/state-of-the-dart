#!/usr/bin/env node

/**
 * Create elite dummy player "King Lui"
 * Unique throwing pattern: ONLY T20 and D7
 * - T20 (Triple 20): Main scoring field
 * - D7 (Double 7): Checkout field
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../data/state-of-the-dart.db');
const db = new Database(dbPath);

console.log('🎯 Creating elite player "King Lui"...\n');

// Get first available tenant
const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();
if (!tenant) {
  console.error('❌ No tenant found in database. Please create a tenant first.');
  process.exit(1);
}
const tenantId = tenant.id;
console.log(`📋 Using tenant: ${tenantId}`);

// Check if player already exists
const existingPlayer = db.prepare('SELECT id FROM players WHERE name = ? AND tenant_id = ?')
  .get('King Lui', tenantId);

if (existingPlayer) {
  console.log('⚠️  Player "King Lui" already exists. Deleting old data...');
  
  // Delete old data
  db.prepare('DELETE FROM throws WHERE player_id = ?').run(existingPlayer.id);
  db.prepare('DELETE FROM player_stats WHERE player_id = ?').run(existingPlayer.id);
  db.prepare('DELETE FROM heatmap_data WHERE player_id = ?').run(existingPlayer.id);
  db.prepare('DELETE FROM player_achievements WHERE player_id = ?').run(existingPlayer.id);
  
  // Delete matches where this player participated
  const matches = db.prepare('SELECT DISTINCT match_id FROM throws WHERE player_id = ?')
    .all(existingPlayer.id);
  matches.forEach(match => {
    db.prepare('DELETE FROM throws WHERE match_id = ?').run(match.match_id);
    db.prepare('DELETE FROM matches WHERE id = ?').run(match.match_id);
  });
  
  db.prepare('DELETE FROM players WHERE id = ?').run(existingPlayer.id);
  console.log('✅ Old data deleted.\n');
}

// Create player
const playerId = uuidv4();
const createdAt = Date.now();

db.prepare(`
  INSERT INTO players (id, tenant_id, name, avatar, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(playerId, tenantId, 'King Lui', null, createdAt);

console.log('✅ Player created:', playerId);

// Create player stats
// Pattern: ONLY T20 and D7
// This creates a very unique profile:
// - Extremely high average (only 60-point scores)
// - Perfect triple rate
// - Very high checkout % (always D7)

const gamesPlayed = 38;
const gamesWon = 32;
const winRate = (gamesWon / gamesPlayed) * 100;

// Average calculation:
// Assuming ~80% T20 (60 points) and ~20% D7 (14 points)
// Effective average per dart: 0.8 * 60 + 0.2 * 14 = 48 + 2.8 = 50.8
// But we need 3-dart average, and considering game flow
const bestAverage = 92.5;
const averageAverage = 85.7;

const total180s = 48; // Many 180s (3x T20)
const totalDarts = 550;

// Calculate other stats
const total140Plus = 12; // T20, T20, other combinations
const total100Plus = 25;
const total60Plus = 45;

const highestCheckout = 14; // D7 is only 14 points, but consistent!
const checkoutPercentage = 72.3; // Very high due to focus

db.prepare(`
  INSERT INTO player_stats (
    player_id,
    games_played,
    games_won,
    total_legs_played,
    total_legs_won,
    highest_checkout,
    total_180s,
    total_140_plus,
    total_100_plus,
    total_60_plus,
    best_average,
    average_overall,
    checkout_percentage,
    best_leg,
    nine_dart_finishes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  playerId,
  gamesPlayed,
  gamesWon,
  143, // total legs played (95 + 48)
  95,  // total legs won
  highestCheckout,
  total180s,
  total140Plus,
  total100Plus,
  total60Plus,
  bestAverage,
  averageAverage,
  checkoutPercentage,
  12, // best leg (darts)
  0   // nine dart finishes
);

console.log('✅ Stats created');

// Create EXTREME heatmap: ONLY T20 and D7
// This will create a VERY distinctive heatmap with only 2 hot spots!

const heatmapDarts = [];
const totalHeatmapDarts = 550;

// 80% T20, 20% D7
const t20Count = Math.floor(totalHeatmapDarts * 0.80); // 440 darts
const d7Count = totalHeatmapDarts - t20Count; // 110 darts

// T20 coordinates (top of board, 0°)
// Triple ring is at radius ~99-107 (let's use 103)
for (let i = 0; i < t20Count; i++) {
  const angle = 0; // T20 is at 0° (top)
  const radius = 99 + Math.random() * 8; // 99-107 for triple ring
  
  // Add tiny variation (±2° for realism, ±2 radius)
  const varAngle = angle + (Math.random() - 0.5) * 4;
  const varRadius = radius + (Math.random() - 0.5) * 4;
  
  const x = Math.cos(varAngle * Math.PI / 180) * varRadius;
  const y = Math.sin(varAngle * Math.PI / 180) * varRadius;
  
  heatmapDarts.push({ x, y, segment: 20, multiplier: 3, score: 60 });
}

// D7 coordinates (bottom right, ~260°)
// Double ring is at radius ~162-170 (let's use 166)
for (let i = 0; i < d7Count; i++) {
  const angle = 261.43; // D7 is at ~261°
  const radius = 162 + Math.random() * 8; // 162-170 for double ring
  
  // Add tiny variation (±2° for realism, ±2 radius)
  const varAngle = angle + (Math.random() - 0.5) * 4;
  const varRadius = radius + (Math.random() - 0.5) * 4;
  
  const x = Math.cos(varAngle * Math.PI / 180) * varRadius;
  const y = Math.sin(varAngle * Math.PI / 180) * varRadius;
  
  heatmapDarts.push({ x, y, segment: 7, multiplier: 2, score: 14 });
}

// Aggregate into segments for heatmap_data
const segments = {};
heatmapDarts.forEach(dart => {
  const key = `${dart.multiplier}x${dart.segment}`;
  if (!segments[key]) {
    segments[key] = 0;
  }
  segments[key]++;
});

// Store heatmap data
db.prepare(`
  INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(player_id) DO UPDATE SET
    segments = excluded.segments,
    total_darts = excluded.total_darts,
    last_updated = excluded.last_updated
`).run(
  playerId,
  JSON.stringify(segments),
  totalHeatmapDarts,
  createdAt
);

console.log('✅ Heatmap data created (ONLY T20 and D7!)');

// Create dummy matches
console.log('\n🎮 Creating dummy matches...');

// Get another player as opponent
const opponents = db.prepare(`
  SELECT id, name FROM players 
  WHERE tenant_id = ? AND id != ? 
  LIMIT 5
`).all(tenantId, playerId);

if (opponents.length === 0) {
  console.log('⚠️  No opponents found. Skipping match creation.');
} else {
  const matchCount = 10;
  
  for (let i = 0; i < matchCount; i++) {
    const matchId = uuidv4();
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    const isWin = Math.random() < 0.84; // 84% win rate (32/38)
    
    const startDate = Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days
    const completedDate = startDate + (25 * 60 * 1000); // +25 min
    
    const kingLuiLegs = isWin ? 3 : Math.floor(Math.random() * 3); // 0-2 if loss, 3 if win
    const opponentLegs = isWin ? Math.floor(Math.random() * 3) : 3; // 3 if King Lui loses
    
    // Create match
    db.prepare(`
      INSERT INTO matches (
        id, tenant_id, game_type, status, started_at, completed_at,
        winner, settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchId,
      tenantId,
      'x01',
      'completed',
      startDate,
      completedDate,
      isWin ? playerId : opponent.id,
      JSON.stringify({
        startingScore: 501,
        doubleOut: true,
        doubleIn: false,
        legs: 3
      })
    );
    
    // King Lui's match stats
    const matchAverage = 80 + Math.random() * 15; // 80-95
    const match180s = Math.floor(Math.random() * 6) + 2; // 2-7 per match
    const checkoutsHit = Math.floor(Math.random() * 2) + Math.min(kingLuiLegs, 1);
    const checkoutAttempts = checkoutsHit + Math.floor(Math.random() * 3);
    
    // Create match_players entry for King Lui
    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, match_average, first9_average,
        highest_score, checkouts_hit, checkout_attempts,
        match_180s, match_140_plus, match_100_plus, match_60_plus,
        darts_thrown, legs_won, sets_won
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      matchId,
      playerId,
      matchAverage,
      85.0,
      180, // highest score (3x T20)
      checkoutsHit,
      checkoutAttempts,
      match180s,
      Math.floor(match180s * 0.3),
      Math.floor(match180s * 0.5),
      Math.floor(match180s * 0.8),
      50 + Math.floor(Math.random() * 30),
      kingLuiLegs,
      0
    );
    
    // Create match_players entry for opponent
    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, match_average, first9_average,
        highest_score, checkouts_hit, checkout_attempts,
        match_180s, match_140_plus, match_100_plus, match_60_plus,
        darts_thrown, legs_won, sets_won
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      matchId,
      opponent.id,
      60 + Math.random() * 20,
      55.0,
      140,
      opponentLegs,
      opponentLegs + 2,
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      55 + Math.floor(Math.random() * 35),
      opponentLegs,
      0
    );
  }
  
  console.log(`✅ ${matchCount} matches created`);
}

console.log('\n🎉 DONE!\n');
console.log('═══════════════════════════════════════════════════');
console.log('👑 KING LUI - THE T20/D7 SPECIALIST');
console.log('═══════════════════════════════════════════════════');
console.log(`📋 Player ID: ${playerId}`);
console.log(`\n📊 STATS:`);
console.log(`   Games: ${gamesPlayed} (${gamesWon}W-${gamesPlayed - gamesWon}L)`);
console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
console.log(`   Average: ${averageAverage.toFixed(1)} (Best: ${bestAverage})`);
console.log(`   180s: ${total180s}`);
console.log(`   Checkout %: ${checkoutPercentage}%`);
console.log(`   Highest CO: ${highestCheckout} (D7 only!)`);
console.log(`\n🎯 THROWING PATTERN (EXTREME!):`);
console.log(`   ⚡ T20: ${t20Count} darts (${(t20Count/totalHeatmapDarts*100).toFixed(1)}%)`);
console.log(`   ⚡ D7:  ${d7Count} darts (${(d7Count/totalHeatmapDarts*100).toFixed(1)}%)`);
console.log(`   ⚡ Other: 0 darts (0.0%) - NONE!`);
console.log(`\n🗺️ HEATMAP:`);
console.log(`   🔴 TWO MASSIVE HOT SPOTS!`);
console.log(`   📍 T20: Extreme red zone (top)`);
console.log(`   📍 D7: Hot zone (bottom right)`);
console.log(`   ❄️  Rest: ICE COLD (nothing!)`);
console.log(`\n💡 STRATEGY:`);
console.log(`   Scores ONLY with T20 (60 points)`);
console.log(`   Finishes ONLY with D7 (14 points)`);
console.log(`   Perfekte Konsistenz, aber limitiert!`);
console.log('═══════════════════════════════════════════════════');

db.close();
console.log('\n✅ Database closed');
console.log('🔄 Hard refresh browser to see King Lui!\n');
