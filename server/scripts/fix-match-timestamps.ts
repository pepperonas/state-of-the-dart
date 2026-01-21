import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔧 Fixing matches with missing timestamps...\n');

try {
  // Get all matches with NULL or 0 started_at
  const matchesWithoutTimestamp = db.prepare(`
    SELECT id, completed_at FROM matches WHERE started_at IS NULL OR started_at = 0
  `).all() as Array<{ id: string; completed_at: number | null }>;

  console.log(`Found ${matchesWithoutTimestamp.length} matches with missing timestamps\n`);

  let fixed = 0;
  let failed = 0;

  for (const match of matchesWithoutTimestamp) {
    try {
      let timestamp: number | null = null;

      // Try to get the earliest throw timestamp from this match's legs
      const earliestThrow = db.prepare(`
        SELECT MIN(t.timestamp) as earliest
        FROM throws t
        JOIN legs l ON t.leg_id = l.id
        WHERE l.match_id = ? AND t.timestamp IS NOT NULL AND t.timestamp > 0
      `).get(match.id) as { earliest: number | null };

      if (earliestThrow?.earliest) {
        timestamp = earliestThrow.earliest;
        console.log(`✅ Match ${match.id}: Using earliest throw timestamp ${new Date(timestamp).toISOString()}`);
      } else if (match.completed_at) {
        // Use completed_at minus 30 minutes as fallback
        timestamp = match.completed_at - (30 * 60 * 1000);
        console.log(`⚠️  Match ${match.id}: Using completed_at minus 30min: ${new Date(timestamp).toISOString()}`);
      } else {
        // Last resort: use current time minus 30 days
        timestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);
        console.log(`⚠️  Match ${match.id}: Using fallback timestamp: ${new Date(timestamp).toISOString()}`);
      }

      // Update the match
      db.prepare('UPDATE matches SET started_at = ? WHERE id = ?').run(timestamp, match.id);
      fixed++;
    } catch (err) {
      console.error(`❌ Failed to fix match ${match.id}:`, err);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total matches: ${matchesWithoutTimestamp.length}`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Failed: ${failed}`);
  console.log('\n✨ Migration complete!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

db.close();
