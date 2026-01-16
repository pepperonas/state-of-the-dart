const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'data', 'state-of-the-dart.db');
const db = new Database(dbPath);

console.log('🎯 Creating Elite Player: Hinz Kunz\n');

// Get tenant ID (first tenant)
const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();
if (!tenant) {
  console.log('❌ No tenant found!');
  process.exit(1);
}

const playerId = uuidv4();
const now = Date.now();

// Create player
console.log('👤 Creating player profile...');
db.prepare(`
  INSERT INTO players (id, tenant_id, name, avatar, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(playerId, tenant.id, 'Hinz Kunz', 'HK', now);

// Create elite stats (Profi-Level)
console.log('📊 Creating elite player stats...');
db.prepare(`
  INSERT INTO player_stats (
    player_id, games_played, games_won, total_legs_played, total_legs_won,
    highest_checkout, total_180s, total_171_plus, total_140_plus, 
    total_100_plus, total_60_plus, best_average, average_overall,
    checkout_percentage, best_leg, nine_dart_finishes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  playerId,
  42,           // games_played
  35,           // games_won (83% Winrate!)
  156,          // total_legs_played
  118,          // total_legs_won
  170,          // highest_checkout (Maximum Double-Bull)
  67,           // total_180s (sehr viele!)
  89,           // total_171_plus
  112,          // total_140_plus
  145,          // total_100_plus
  178,          // total_60_plus
  105.8,        // best_average (Profi-Level!)
  89.7,         // average_overall
  67.5,         // checkout_percentage (sehr hoch!)
  12,           // best_leg (12 Darts)
  1             // nine_dart_finishes (1x geschafft!)
);

// Create ELITE HEATMAP
// Charakteristisches Wurfbild: Fokus auf Triple 20, 19, 18 und starke Doubles
console.log('🗺️ Creating elite heatmap...');

const totalDarts = 450; // Viele Darts für gute Datenbasis
const segments = {};

// Helper to add dart hit with tight clustering (präzise Würfe!)
const addHit = (segment, multiplier, count) => {
  const key = `${segment}-${multiplier}`;
  if (!segments[key]) {
    segments[key] = { x: [], y: [], count: 0 };
  }
  
  for (let i = 0; i < count; i++) {
    // Segment-Winkel berechnen
    const segmentAngle = (segment * 18 - 90) * Math.PI / 180;
    
    // SEHR ENGE Streuung für Elite-Spieler (±5° statt ±15°)
    const angleVariance = (Math.random() - 0.5) * 0.087; // ±5° in Radians
    const angle = segmentAngle + angleVariance;
    
    // Radius je nach Multiplier
    let distance;
    if (multiplier === 3) {
      distance = 0.48; // Triple
    } else if (multiplier === 2) {
      distance = 0.90; // Double
    } else if (multiplier === 25) {
      distance = 0.08; // Bull
    } else {
      distance = 0.65; // Single
    }
    
    // SEHR GERINGE Streuung (Elite-Präzision!)
    const distanceVariance = 0.02 * (Math.random() - 0.5); // ±2%
    const finalDistance = distance + distanceVariance;
    
    const x = Math.cos(angle) * finalDistance;
    const y = Math.sin(angle) * finalDistance;
    
    segments[key].x.push(x);
    segments[key].y.push(y);
    segments[key].count++;
  }
};

// ELITE DISTRIBUTION
console.log('   🎯 Generating elite dart distribution...');

// T20 - 45% aller Würfe (extrem fokussiert!)
const t20Count = Math.floor(totalDarts * 0.45);
addHit(20, 3, t20Count);
console.log(`   ✓ T20: ${t20Count} darts (45%)`);

// T19 - 18%
const t19Count = Math.floor(totalDarts * 0.18);
addHit(19, 3, t19Count);
console.log(`   ✓ T19: ${t19Count} darts (18%)`);

// T18 - 12%
const t18Count = Math.floor(totalDarts * 0.12);
addHit(18, 3, t18Count);
console.log(`   ✓ T18: ${t18Count} darts (12%)`);

// D20 - 8% (starke Double-Quote!)
const d20Count = Math.floor(totalDarts * 0.08);
addHit(20, 2, d20Count);
console.log(`   ✓ D20: ${d20Count} darts (8%)`);

// D16 - 5%
const d16Count = Math.floor(totalDarts * 0.05);
addHit(16, 2, d16Count);
console.log(`   ✓ D16: ${d16Count} darts (5%)`);

// D18 - 4%
const d18Count = Math.floor(totalDarts * 0.04);
addHit(18, 2, d18Count);
console.log(`   ✓ D18: ${d18Count} darts (4%)`);

// D12 (Bull Finish) - 2%
const d12Count = Math.floor(totalDarts * 0.02);
addHit(12, 2, d12Count);
console.log(`   ✓ D12: ${d12Count} darts (2%)`);

// Bull - 3% (für Finish)
const bullCount = Math.floor(totalDarts * 0.03);
addHit(25, 25, bullCount);
console.log(`   ✓ BULL: ${bullCount} darts (3%)`);

// Singles um T20 (Misses, aber wenige!) - 3%
const s20Count = Math.floor(totalDarts * 0.02);
addHit(20, 1, s20Count);
const s5Count = Math.floor(totalDarts * 0.01);
addHit(5, 1, s5Count);
console.log(`   ✓ Singles (S20, S5): ${s20Count + s5Count} darts (3%)`);

// Insert into database
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
  totalDarts,
  now
);

console.log('\n✅ Elite Player "Hinz Kunz" created successfully!\n');
console.log('📊 Profile Summary:');
console.log('   Name: Hinz Kunz');
console.log('   Avatar: HK');
console.log('   Games: 42 (35 Wins, 83% Winrate)');
console.log('   Average: 89.7 (Best: 105.8)');
console.log('   180s: 67');
console.log('   Checkout %: 67.5%');
console.log('   Highest Checkout: 170');
console.log('   Nine-Darters: 1 🏆');
console.log('   Total Darts: 450');
console.log('   Triple Rate: ~75% (Elite!)');
console.log('   Double Rate: ~19% (Sehr stark!)');
console.log('\n🗺️ Heatmap Characteristics:');
console.log('   • Tight clustering auf T20, T19, T18');
console.log('   • Starke Double-Präsenz (D20, D16, D18)');
console.log('   • Minimal misses (nur 3%)');
console.log('   • Bull für Finishes');
console.log('\n🎯 Expected Heatmap Pattern:');
console.log('   🔴 Intensive RED HOT ZONE bei T20 (45%)');
console.log('   🟠 Orange bei T19 (18%)');
console.log('   🟡 Yellow bei T18 (12%)');
console.log('   🟢 Green Ring bei Doubles (D20, D16, D18)');
console.log('   🔵 Small Bull spot (3%)');

db.close();
