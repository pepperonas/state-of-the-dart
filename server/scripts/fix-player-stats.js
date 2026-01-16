const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/state-of-the-dart.db');
const db = new Database(dbPath);

// Get all players for the tenant
const players = db.prepare(`
  SELECT p.id, p.name 
  FROM players p 
  WHERE p.tenant_id = '0bf65b4e-cd9b-405e-815d-a872c2503d91'
`).all();

console.log('🔧 Updating player stats with realistic data...');
console.log(`Found ${players.length} players to update`);

players.forEach((player, index) => {
  // Generate realistic stats based on skill level
  const skillLevels = [
    { avg: 65.5, checkout: 38.2, t180s: 12, t171: 25, t140: 48, t100: 102, t60: 156, best: 75.8, highest: 120, bestLeg: 15 },
    { avg: 58.3, checkout: 32.5, t180s: 8, t171: 18, t140: 38, t100: 85, t60: 138, best: 68.2, highest: 100, bestLeg: 18 },
    { avg: 52.7, checkout: 28.8, t180s: 4, t171: 12, t140: 28, t100: 68, t60: 115, best: 61.5, highest: 84, bestLeg: 21 },
    { avg: 48.2, checkout: 24.3, t180s: 2, t171: 8, t140: 22, t100: 54, t60: 92, best: 55.9, highest: 68, bestLeg: 24 },
    { avg: 55.6, checkout: 30.1, t180s: 6, t171: 14, t140: 32, t100: 74, t60: 125, best: 64.3, highest: 92, bestLeg: 19 }
  ];
  
  const stats = skillLevels[index % 5];
  
  db.prepare(`
    UPDATE player_stats SET
      average_overall = ?,
      best_average = ?,
      checkout_percentage = ?,
      highest_checkout = ?,
      total_180s = ?,
      total_171_plus = ?,
      total_140_plus = ?,
      total_100_plus = ?,
      total_60_plus = ?,
      best_leg = ?
    WHERE player_id = ?
  `).run(
    stats.avg,
    stats.best,
    stats.checkout,
    stats.highest,
    stats.t180s,
    stats.t171,
    stats.t140,
    stats.t100,
    stats.t60,
    stats.bestLeg,
    player.id
  );
  
  console.log(`✅ ${player.name}: Avg ${stats.avg}, Checkout ${stats.checkout}%, 180s: ${stats.t180s}`);
});

console.log('\n✅ All player stats updated!');
db.close();
