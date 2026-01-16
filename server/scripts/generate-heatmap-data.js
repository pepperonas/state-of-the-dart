const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'state-of-the-dart.db');
const db = new Database(dbPath);

console.log('🎯 Generating Demo Heatmap Data...\n');

// Get all players
const players = db.prepare('SELECT id, name FROM players').all();
console.log(`Found ${players.length} players`);

if (players.length === 0) {
  console.log('❌ No players found!');
  process.exit(1);
}

// Generate realistic heatmap data for each player
players.forEach(player => {
  console.log(`\n📊 Generating heatmap for ${player.name}...`);
  
  // Simulate 100-200 darts with realistic distribution
  const totalDarts = Math.floor(Math.random() * 100) + 100;
  
  // Realistic dart distribution (focus on T20, T19, T18, Bull)
  const segments = {};
  
  // Helper to add dart hit
  const addHit = (segment, multiplier, count) => {
    const key = `${segment}-${multiplier}`;
    if (!segments[key]) {
      segments[key] = { x: [], y: [], count: 0 };
    }
    
    for (let i = 0; i < count; i++) {
      // Generate random coordinates within segment
      const angle = ((segment * 18 - 90) * Math.PI / 180) + (Math.random() - 0.5) * 0.3;
      const distance = multiplier === 3 ? 0.48 : 
                      multiplier === 2 ? 0.90 : 
                      multiplier === 25 ? 0.08 : 0.65;
      
      const variance = 0.05 * (Math.random() - 0.5);
      const x = Math.cos(angle) * (distance + variance);
      const y = Math.sin(angle) * (distance + variance);
      
      segments[key].x.push(x);
      segments[key].y.push(y);
      segments[key].count++;
    }
  };
  
  // Realistic distribution
  let dartsPlaced = 0;
  
  // T20 (30-40% of darts)
  const t20Count = Math.floor(totalDarts * (0.3 + Math.random() * 0.1));
  addHit(20, 3, t20Count);
  dartsPlaced += t20Count;
  
  // T19 (15-20%)
  const t19Count = Math.floor(totalDarts * (0.15 + Math.random() * 0.05));
  addHit(19, 3, t19Count);
  dartsPlaced += t19Count;
  
  // T18 (10-15%)
  const t18Count = Math.floor(totalDarts * (0.10 + Math.random() * 0.05));
  addHit(18, 3, t18Count);
  dartsPlaced += t18Count;
  
  // Singles around T20 (misses) (10-15%)
  const s20Count = Math.floor(totalDarts * (0.10 + Math.random() * 0.05));
  addHit(20, 1, s20Count);
  dartsPlaced += s20Count;
  
  const s5Count = Math.floor(totalDarts * (0.05 + Math.random() * 0.03));
  addHit(5, 1, s5Count);
  dartsPlaced += s5Count;
  
  const s1Count = Math.floor(totalDarts * (0.05 + Math.random() * 0.03));
  addHit(1, 1, s1Count);
  dartsPlaced += s1Count;
  
  // Doubles for checkout (5-10%)
  const d20Count = Math.floor(totalDarts * (0.03 + Math.random() * 0.03));
  addHit(20, 2, d20Count);
  dartsPlaced += d20Count;
  
  const d16Count = Math.floor(totalDarts * (0.02 + Math.random() * 0.02));
  addHit(16, 2, d16Count);
  dartsPlaced += d16Count;
  
  // Bull (3-5%)
  const bullCount = Math.floor(totalDarts * (0.03 + Math.random() * 0.02));
  addHit(25, 25, bullCount);
  dartsPlaced += bullCount;
  
  // Fill remaining with random segments
  const remaining = totalDarts - dartsPlaced;
  const randomSegments = [19, 18, 17, 16, 15, 12, 11, 10, 9, 8, 7, 6, 4, 3, 2];
  for (let i = 0; i < remaining; i++) {
    const seg = randomSegments[Math.floor(Math.random() * randomSegments.length)];
    const mult = Math.random() > 0.8 ? 3 : 1;
    addHit(seg, mult, 1);
  }
  
  // Insert into database
  const stmt = db.prepare(`
    INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      segments = excluded.segments,
      total_darts = excluded.total_darts,
      last_updated = excluded.last_updated
  `);
  
  stmt.run(
    player.id,
    JSON.stringify(segments),
    totalDarts,
    Date.now()
  );
  
  console.log(`✅ Generated ${totalDarts} darts for ${player.name}`);
  console.log(`   Segments: ${Object.keys(segments).length}`);
});

console.log('\n🎉 Heatmap data generated successfully!');

db.close();
