import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';

const ADMIN_EMAIL = 'martin.pfeffer@celox.io';

// Demo player names
const PLAYER_NAMES = ['Max Mustermann', 'Anna Schmidt', 'Tom Weber', 'Lisa Müller'];

// Helper to generate random dart score
function generateDartScore(segment: number, multiplier: number): number {
  if (segment === 25) return multiplier === 2 ? 50 : 25; // Bullseye
  return segment * multiplier;
}

// Helper to generate realistic dart throw
function generateRealisticThrow(): { segment: number; multiplier: number; score: number; x: number; y: number } {
  const skillLevel = 0.7 + Math.random() * 0.3; // 70-100% skill
  
  // Target segments weighted by common dart throws
  const targetSegments = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];
  const weights = [0.3, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02];
  
  let rand = Math.random();
  let segment = 20;
  
  for (let i = 0; i < targetSegments.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      segment = targetSegments[i];
      break;
    }
  }
  
  // Multiplier based on skill
  const multiplierRand = Math.random();
  let multiplier = 1;
  
  if (multiplierRand < skillLevel * 0.4) {
    multiplier = 3; // Triple
  } else if (multiplierRand < skillLevel * 0.6) {
    multiplier = 2; // Double
  } else {
    multiplier = 1; // Single
  }
  
  // Sometimes miss (hit single instead of triple/double)
  if (Math.random() > skillLevel && multiplier > 1) {
    multiplier = 1;
  }
  
  const score = generateDartScore(segment, multiplier);
  
  // Generate x, y coordinates (simplified dartboard mapping)
  const angle = Math.random() * Math.PI * 2;
  const radius = multiplier === 3 ? 0.65 : multiplier === 2 ? 0.85 : 0.5 + Math.random() * 0.3;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  return { segment, multiplier, score, x, y };
}

// Generate a realistic leg
function generateLeg(players: any[], startingScore: number = 501) {
  const legId = uuidv4();
  const throws: any[] = [];
  
  const playerScores = players.map(() => startingScore);
  let currentPlayerIndex = 0;
  let visitNumber = 0;
  let winner: string | null = null;
  
  while (!winner) {
    const player = players[currentPlayerIndex];
    const remaining = playerScores[currentPlayerIndex];
    
    visitNumber++;
    
    // Generate 3 darts
    const darts: any[] = [];
    let turnScore = 0;
    let isBust = false;
    let isCheckout = false;
    
    for (let dartNum = 0; dartNum < 3; dartNum++) {
      if (isBust || isCheckout) break;
      
      const dart = generateRealisticThrow();
      darts.push(dart);
      turnScore += dart.score;
      
      // Check for bust or checkout
      const newRemaining = remaining - turnScore;
      
      if (newRemaining === 0 && dart.multiplier === 2) {
        // Perfect checkout!
        isCheckout = true;
        winner = player.id;
      } else if (newRemaining === 1 || newRemaining < 0) {
        // Bust!
        isBust = true;
        turnScore = 0;
      }
    }
    
    if (isBust) {
      turnScore = 0;
    }
    
    playerScores[currentPlayerIndex] -= turnScore;
    
    // Create throw record
    const throwData = {
      id: uuidv4(),
      leg_id: legId,
      player_id: player.id,
      darts: JSON.stringify(darts),
      score: turnScore,
      remaining: playerScores[currentPlayerIndex],
      timestamp: Date.now() + visitNumber * 5000,
      is_checkout_attempt: remaining <= 170 ? 1 : 0,
      is_bust: isBust ? 1 : 0,
      visit_number: visitNumber,
      running_average: 0, // Will calculate later
      first9_average: 0,
    };
    
    throws.push(throwData);
    
    if (isCheckout) {
      break;
    }
    
    // Next player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  }
  
  return {
    id: legId,
    winner,
    throws,
  };
}

async function seedDemoData() {
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const db = new Database(dbPath);

  try {
    console.log('🔍 Finding admin user...');
    
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL) as any;
    
    if (!adminUser) {
      console.error('❌ Admin user not found! Please run create-admin script first.');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', adminUser.id);
    
    // Create tenant for admin
    console.log('📝 Creating tenant profile...');
    const tenantId = uuidv4();
    db.prepare(`
      INSERT INTO tenants (id, user_id, name, avatar, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenantId, adminUser.id, 'Martin\'s Profil', '🎯', Date.now(), Date.now());
    
    console.log('✅ Tenant created:', tenantId);
    
    // Create demo players
    console.log('📝 Creating demo players...');
    const players: any[] = [];
    
    for (const playerName of PLAYER_NAMES) {
      const playerId = uuidv4();
      const avatar = playerName.charAt(0).toUpperCase();
      
      db.prepare(`
        INSERT INTO players (id, tenant_id, name, avatar, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(playerId, tenantId, playerName, avatar, Date.now());
      
      // Initialize player stats
      db.prepare(`
        INSERT INTO player_stats (player_id) VALUES (?)
      `).run(playerId);
      
      // Initialize heatmap data
      db.prepare(`
        INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
        VALUES (?, ?, ?, ?)
      `).run(playerId, '{}', 0, Date.now());
      
      players.push({ id: playerId, name: playerName });
      console.log(`  ✅ ${playerName} (${playerId})`);
    }
    
    // Generate 20 demo matches
    console.log('📝 Generating 20 demo matches...');
    
    for (let matchNum = 0; matchNum < 20; matchNum++) {
      const matchId = uuidv4();
      
      // Random 2 players
      const player1 = players[Math.floor(Math.random() * players.length)];
      let player2 = players[Math.floor(Math.random() * players.length)];
      while (player2.id === player1.id) {
        player2 = players[Math.floor(Math.random() * players.length)];
      }
      
      const matchPlayers = [player1, player2];
      const startedAt = Date.now() - (20 - matchNum) * 24 * 60 * 60 * 1000; // Spread over 20 days
      
      // Create match
      const settings = {
        startingScore: 501,
        legMode: true,
        legs: 3,
        doubleIn: false,
        doubleOut: true,
      };
      
      db.prepare(`
        INSERT INTO matches (id, tenant_id, game_type, status, winner, started_at, completed_at, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        matchId,
        tenantId,
        'X01',
        'completed',
        null, // Will set later
        startedAt,
        startedAt + 30 * 60 * 1000, // 30 minutes later
        JSON.stringify(settings)
      );
      
      // Create match_players entries
      for (const player of matchPlayers) {
        db.prepare(`
          INSERT INTO match_players (id, match_id, player_id)
          VALUES (?, ?, ?)
        `).run(uuidv4(), matchId, player.id);
      }
      
      // Generate legs (best of 3)
      const legsToWin = 2;
      const legWins = [0, 0];
      let legNumber = 0;
      let matchWinner: string | null = null;
      
      while (legWins[0] < legsToWin && legWins[1] < legsToWin) {
        legNumber++;
        
        const leg = generateLeg(matchPlayers);
        
        // Create leg
        db.prepare(`
          INSERT INTO legs (id, match_id, leg_number, winner, started_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          leg.id,
          matchId,
          legNumber,
          leg.winner,
          startedAt + (legNumber - 1) * 10 * 60 * 1000,
          startedAt + legNumber * 10 * 60 * 1000
        );
        
        // Insert throws
        for (const throwData of leg.throws) {
          db.prepare(`
            INSERT INTO throws (
              id, leg_id, player_id, darts, score, remaining, timestamp,
              is_checkout_attempt, is_bust, visit_number, running_average, first9_average
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            throwData.id,
            throwData.leg_id,
            throwData.player_id,
            throwData.darts,
            throwData.score,
            throwData.remaining,
            throwData.timestamp,
            throwData.is_checkout_attempt,
            throwData.is_bust,
            throwData.visit_number,
            throwData.running_average,
            throwData.first9_average
          );
        }
        
        // Update leg wins
        const winnerIndex = matchPlayers.findIndex(p => p.id === leg.winner);
        legWins[winnerIndex]++;
        
        if (legWins[winnerIndex] >= legsToWin) {
          matchWinner = leg.winner;
        }
      }
      
      // Update match winner
      db.prepare('UPDATE matches SET winner = ? WHERE id = ?').run(matchWinner, matchId);
      
      console.log(`  ✅ Match ${matchNum + 1}/20: ${player1.name} vs ${player2.name} - Winner: ${matchPlayers.find(p => p.id === matchWinner)?.name}`);
    }
    
    console.log('🎉 Demo data seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 1 Tenant`);
    console.log(`   - ${players.length} Players`);
    console.log(`   - 20 Matches`);
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedDemoData();
