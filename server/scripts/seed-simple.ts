import { getDatabase, initDatabase } from '../src/database';
import { v4 as uuidv4 } from 'uuid';

async function generateSimpleTestData() {
  console.log('🔧 Initializing database...');
  initDatabase();
  const db = getDatabase();

  // Find admin user
  const adminUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get('martinpaush@gmail.com') as any;
  
  if (!adminUser) {
    console.error('❌ Admin user martinpaush@gmail.com not found!');
    process.exit(1);
  }

  console.log(`✅ Found admin user: ${adminUser.email}`);

  // Create tenant for admin if not exists
  let tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(adminUser.id) as any;
  
  if (!tenant) {
    const tenantId = uuidv4();
    const now = Date.now();
    db.prepare(`
      INSERT INTO tenants (id, user_id, name, avatar, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenantId, adminUser.id, 'Test Tenant', '🎯', now, now);
    tenant = { id: tenantId };
    console.log('✅ Created tenant');
  }

  // Create 5 test players
  const players = [
    { id: uuidv4(), name: 'Max "The Machine" Müller', avatar: '🎯', avgScore: 80 },
    { id: uuidv4(), name: 'Anna "Bullseye" Schmidt', avatar: '🎪', avgScore: 65 },
    { id: uuidv4(), name: 'Tom "Steady" Weber', avatar: '⚡', avgScore: 50 },
    { id: uuidv4(), name: 'Lisa "Lucky" Meyer', avatar: '🌟', avgScore: 50 },
    { id: uuidv4(), name: 'Ben "Rookie" Fischer', avatar: '🎲', avgScore: 35 },
  ];

  console.log('📝 Creating 5 test players...');
  for (const player of players) {
    // Check if player exists
    const existing = db.prepare('SELECT id FROM players WHERE id = ?').get(player.id);
    if (existing) {
      console.log(`  ⏭️  Player ${player.name} already exists, skipping...`);
      continue;
    }

    db.prepare(`
      INSERT INTO players (id, tenant_id, name, avatar, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(player.id, tenant.id, player.name, player.avatar, Date.now());
    
    // Create player_stats entry
    db.prepare(`
      INSERT INTO player_stats (player_id) VALUES (?)
    `).run(player.id);
    
    console.log(`  ✅ Created ${player.name}`);
  }

  console.log('\n🎮 Generating 30 test matches...');
  
  const matchTypes = [
    { mode: '301', startScore: 301 },
    { mode: '501', startScore: 501 },
    { mode: '701', startScore: 701 },
  ];

  let matchCount = 0;

  for (let i = 0; i < 30; i++) {
    // Random match type
    const matchType = matchTypes[Math.floor(Math.random() * matchTypes.length)];
    
    // Random 2 players
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const player1 = shuffled[0];
    const player2 = shuffled[1];

    // Determine winner based on avgScore
    const player1WinChance = player1.avgScore / (player1.avgScore + player2.avgScore);
    const player1Wins = Math.random() < player1WinChance;

    const matchId = uuidv4();
    const now = Date.now() - (30 - i) * 24 * 60 * 60 * 1000; // Spread over last 30 days

    // Create match
    db.prepare(`
      INSERT INTO matches (
        id, tenant_id, game_type, status, started_at, completed_at,
        settings, winner
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchId,
      tenant.id,
      matchType.mode,
      'completed',
      now,
      now + 20 * 60 * 1000,
      JSON.stringify({ startScore: matchType.startScore, legsToWin: 1, doubleOut: true }),
      player1Wins ? player1.id : player2.id
    );

    // Create match players
    const matchPlayer1Id = uuidv4();
    const matchPlayer2Id = uuidv4();

    const player1Avg = player1.avgScore + (Math.random() * 20 - 10);
    const player2Avg = player2.avgScore + (Math.random() * 20 - 10);

    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, sets_won, legs_won, match_average,
        highest_score, match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
        checkout_attempts, checkouts_hit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchPlayer1Id, matchId, player1.id,
      0, player1Wins ? 1 : 0, player1Avg,
      Math.floor(Math.random() * 140) + 60,
      Math.random() < 0.1 ? 1 : 0,
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 5) + 1,
      player1Wins ? 1 : 0
    );

    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, sets_won, legs_won, match_average,
        highest_score, match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
        checkout_attempts, checkouts_hit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchPlayer2Id, matchId, player2.id,
      0, player1Wins ? 0 : 1, player2Avg,
      Math.floor(Math.random() * 140) + 60,
      Math.random() < 0.1 ? 1 : 0,
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 5) + 1,
      player1Wins ? 0 : 1
    );

    // Update player stats
    const winner = player1Wins ? player1 : player2;
    const loser = player1Wins ? player2 : player1;
    const winnerAvg = player1Wins ? player1Avg : player2Avg;
    const loserAvg = player1Wins ? player2Avg : player1Avg;

    // Update winner stats
    db.prepare(`
      UPDATE player_stats SET
        games_played = games_played + 1,
        games_won = games_won + 1,
        total_legs_played = total_legs_played + 1,
        total_legs_won = total_legs_won + 1,
        total_180s = total_180s + ?,
        best_average = CASE WHEN best_average < ? THEN ? ELSE best_average END,
        average_overall = ((average_overall * games_played) + ?) / (games_played + 1)
      WHERE player_id = ?
    `).run(
      Math.random() < 0.1 ? 1 : 0,
      winnerAvg, winnerAvg, winnerAvg,
      winner.id
    );

    // Update loser stats
    db.prepare(`
      UPDATE player_stats SET
        games_played = games_played + 1,
        total_legs_played = total_legs_played + 1,
        total_180s = total_180s + ?,
        best_average = CASE WHEN best_average < ? THEN ? ELSE best_average END,
        average_overall = ((average_overall * games_played) + ?) / (games_played + 1)
      WHERE player_id = ?
    `).run(
      Math.random() < 0.05 ? 1 : 0,
      loserAvg, loserAvg, loserAvg,
      loser.id
    );

    matchCount++;
    console.log(`  ✅ Match ${matchCount}/30: ${player1.name} vs ${player2.name} (${matchType.mode}) - Winner: ${winner.name}`);
  }

  console.log('\n✅ Test data generation complete!');
  console.log('\n📊 Summary:');
  console.log(`  - Admin User: martinpaush@gmail.com`);
  console.log(`  - Players: ${players.length}`);
  console.log(`  - Matches: ${matchCount}`);
  console.log(`  - Tenant ID: ${tenant.id}`);
  console.log('\n🎯 You can now test statistics and achievements!');
}

generateSimpleTestData().catch((error) => {
  console.error('❌ Error generating test data:', error);
  process.exit(1);
});
