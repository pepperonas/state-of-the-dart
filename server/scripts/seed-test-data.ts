import { getDatabase, initDatabase } from '../src/database';
import { v4 as uuidv4 } from 'uuid';

interface Player {
  id: string;
  name: string;
  avatar: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

// Skill levels bestimmen die Wahrscheinlichkeiten
const SKILL_PROFILES = {
  beginner: {
    avgScore: 35,
    triple20Rate: 0.10,
    checkoutRate: 0.20,
    avg180Rate: 0.01,
  },
  intermediate: {
    avgScore: 50,
    triple20Rate: 0.20,
    checkoutRate: 0.35,
    avg180Rate: 0.03,
  },
  advanced: {
    avgScore: 65,
    triple20Rate: 0.30,
    checkoutRate: 0.45,
    avg180Rate: 0.08,
  },
  pro: {
    avgScore: 80,
    triple20Rate: 0.40,
    checkoutRate: 0.60,
    avg180Rate: 0.15,
  },
};

async function generateTestData() {
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
    const tenant_id = uuidv4();
    const now = Date.now();
    db.prepare(`
      INSERT INTO tenants (id, user_id, name, avatar, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenant_id, adminUser.id, 'Test Tenant', '🎯', now, now);
    tenant = { id: tenant_id };
    console.log('✅ Created tenant');
  }

  // Create 5 test players with different skill levels
  const players: Player[] = [
    { id: uuidv4(), name: 'Max "The Machine" Müller', avatar: '🎯', skillLevel: 'pro' },
    { id: uuidv4(), name: 'Anna "Bullseye" Schmidt', avatar: '🎪', skillLevel: 'advanced' },
    { id: uuidv4(), name: 'Tom "Steady" Weber', avatar: '⚡', skillLevel: 'intermediate' },
    { id: uuidv4(), name: 'Lisa "Lucky" Meyer', avatar: '🌟', skillLevel: 'intermediate' },
    { id: uuidv4(), name: 'Ben "Rookie" Fischer', avatar: '🎲', skillLevel: 'beginner' },
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
    `).run(
      player.id,
      tenant.id,
      player.name,
      player.avatar,
      Date.now()
    );
    
    // Create player_stats entry
    db.prepare(`
      INSERT INTO player_stats (player_id) VALUES (?)
    `).run(player.id);
    
    console.log(`  ✅ Created ${player.name} (${player.skillLevel})`);
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

    // Determine winner based on skill level
    const player1Skill = SKILL_PROFILES[player1.skillLevel];
    const player2Skill = SKILL_PROFILES[player2.skillLevel];
    const player1WinChance = player1Skill.avgScore / (player1Skill.avgScore + player2Skill.avgScore);
    const player1Wins = Math.random() < player1WinChance;

    const match_id = uuidv4();
    const leg_id = uuidv4();
    const now = Date.now() - (30 - i) * 24 * 60 * 60 * 1000; // Spread over last 30 days

    // Create match
    db.prepare(`
      INSERT INTO matches (
        id, tenant_id, game_type, status, started_at, completed_at,
        settings, winner
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      match_id,
      tenant.id,
      matchType.mode,
      'completed',
      now,
      now + 20 * 60 * 1000, // 20 minutes later
      JSON.stringify({ startScore: matchType.startScore, legsToWin: 1, doubleOut: true }),
      player1Wins ? player1.id : player2.id
    );

    // Create match players
    const matchPlayer1Id = uuidv4();
    const matchPlayer2Id = uuidv4();

    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, sets_won, legs_won, match_average,
        highest_score, match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
        checkout_attempts, checkouts_hit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchPlayer1Id,
      match_id,
      player1.id,
      0,
      player1Wins ? 1 : 0,
      player1Skill.avgScore + (Math.random() * 20 - 10), // +/- 10 variance
      Math.floor(Math.random() * 140) + 60, // Random high score
      Math.random() < player1Skill.avg180Rate * 3 ? 1 : 0, // Chance for 180
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 5) + 1, // 1-5 checkout attempts
      player1Wins ? 1 : 0
    );

    db.prepare(`
      INSERT INTO match_players (
        id, match_id, player_id, sets_won, legs_won, match_average,
        highest_score, match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
        checkout_attempts, checkouts_hit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchPlayer2Id,
      match_id,
      player2.id,
      0,
      player1Wins ? 0 : 1,
      player2Skill.avgScore + (Math.random() * 20 - 10),
      Math.floor(Math.random() * 140) + 60,
      Math.random() < player2Skill.avg180Rate * 3 ? 1 : 0,
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 5) + 1,
      player1Wins ? 0 : 1
    );

    // Create leg
    db.prepare(`
      INSERT INTO match_legs (
        id, match_id, leg_number, started_at, completed_at, winner
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      leg_id,
      match_id,
      0,
      now,
      now + 20 * 60 * 1000,
      player1Wins ? matchPlayer1Id : matchPlayer2Id
    );

    // Generate throws for the leg
    const numThrows = Math.floor(Math.random() * 15) + 10; // 10-25 throws per player
    let player1Score = matchType.startScore;
    let player2Score = matchType.startScore;
    let currentPlayer = matchPlayer1Id;

    for (let t = 0; t < numThrows * 2; t++) {
      const isPlayer1 = currentPlayer === matchPlayer1Id;
      const profile = isPlayer1 ? player1Skill : player2Skill;
      const currentScore = isPlayer1 ? player1Score : player2Score;

      // Generate 3 darts
      const darts: number[] = [];
      let visitScore = 0;

      for (let d = 0; d < 3; d++) {
        if (currentScore - visitScore <= 0) break; // Already finished

        // Simple scoring logic based on skill
        const rand = Math.random();
        let score = 0;

        if (currentScore - visitScore <= 40 && Math.random() < profile.checkoutRate) {
          // Checkout attempt
          const remaining = currentScore - visitScore;
          if (remaining % 2 === 0 && remaining <= 40) {
            score = remaining; // Successful checkout
          } else {
            score = Math.floor(Math.random() * 20) + 1; // Missed
          }
        } else if (rand < profile.triple20Rate) {
          score = 60; // Triple 20
        } else if (rand < profile.triple20Rate + 0.2) {
          score = Math.floor(Math.random() * 15) + 40; // 40-55
        } else {
          score = Math.floor(Math.random() * 30) + 10; // 10-40
        }

        darts.push(score);
        visitScore += score;
      }

      const throwId = uuidv4();
      const newScore = currentScore - visitScore;
      const is_bust = newScore < 0 || (newScore === 1) || (newScore === 0 && visitScore % 2 !== 0);

      db.prepare(`
        INSERT INTO match_throws (
          id, leg_id, match_player_id, darts, score, remaining,
          timestamp, is_bust, is_checkout_attempt, visit_number, running_average
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        throwId,
        leg_id,
        currentPlayer,
        JSON.stringify(darts.map(s => ({ score: s, multiplier: 1, segment: Math.floor(s / 3) }))),
        is_bust ? 0 : visitScore,
        is_bust ? currentScore : newScore,
        now + t * 30000, // 30 seconds per throw
        is_bust ? 1 : 0,
        newScore <= 170 ? 1 : 0,
        Math.floor(t / 2) + 1,
        profile.avgScore
      );

      if (!is_bust) {
        if (isPlayer1) {
          player1Score = newScore;
        } else {
          player2Score = newScore;
        }
      }

      // Check if game is over
      if ((isPlayer1 && player1Score === 0) || (!isPlayer1 && player2Score === 0)) {
        break;
      }

      // Switch player
      currentPlayer = currentPlayer === matchPlayer1Id ? matchPlayer2Id : matchPlayer1Id;
    }

    // Update player stats
    const winner = player1Wins ? player1 : player2;
    const loser = player1Wins ? player2 : player1;

    // Update winner stats
    const winnerAvg = SKILL_PROFILES[winner.skillLevel].avgScore + (Math.random() * 20 - 10);
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
      Math.random() < SKILL_PROFILES[winner.skillLevel].avg180Rate ? 1 : 0,
      winnerAvg,
      winnerAvg,
      winnerAvg,
      winner.id
    );

    // Update loser stats
    const loserAvg = SKILL_PROFILES[loser.skillLevel].avgScore + (Math.random() * 20 - 10);
    db.prepare(`
      UPDATE player_stats SET
        games_played = games_played + 1,
        total_legs_played = total_legs_played + 1,
        total_180s = total_180s + ?,
        best_average = CASE WHEN best_average < ? THEN ? ELSE best_average END,
        average_overall = ((average_overall * games_played) + ?) / (games_played + 1)
      WHERE player_id = ?
    `).run(
      Math.random() < SKILL_PROFILES[loser.skillLevel].avg180Rate ? 1 : 0,
      loserAvg,
      loserAvg,
      loserAvg,
      loser.id
    );

    matchCount++;
    console.log(`  ✅ Match ${matchCount}/30: ${player1.name} vs ${player2.name} (${matchType.mode}) - Winner: ${winner.name}`);
  }

  console.log('\n📊 Generating achievements...');
  
  // Generate some achievements for players
  const achievementIds = [
    'first_game',
    'rookie', 
    'ton_80',
    'high_roller',
    'checkout_king',
    'trainee',
  ];

  for (const player of players) {
    const playerAchievements: any[] = [];
    
    // Based on skill level, unlock certain achievements
    const numAchievements = player.skillLevel === 'pro' ? 4 : 
                           player.skillLevel === 'advanced' ? 3 :
                           player.skillLevel === 'intermediate' ? 2 : 1;
    
    for (let i = 0; i < numAchievements; i++) {
      if (achievementIds[i]) {
        playerAchievements.push({
          achievementId: achievementIds[i],
          unlockedAt: Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
          player_id: player.id,
        });
      }
    }

    if (playerAchievements.length > 0) {
      // Store achievements (simplified - in real app this would go through achievements table)
      console.log(`  🏆 ${player.name}: ${playerAchievements.length} achievements`);
    }
  }

  console.log('\n✅ Test data generation complete!');
  console.log('\n📊 Summary:');
  console.log(`  - Admin User: martinpaush@gmail.com`);
  console.log(`  - Players: ${players.length}`);
  console.log(`  - Matches: ${matchCount}`);
  console.log(`  - Tenant ID: ${tenant.id}`);
  console.log('\n🎯 You can now test statistics and achievements!');
}

generateTestData().catch((error) => {
  console.error('❌ Error generating test data:', error);
  process.exit(1);
});
