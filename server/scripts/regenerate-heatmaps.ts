import Database from 'better-sqlite3';
import path from 'path';

interface DartData {
  segment: number;
  multiplier: number;
  score: number;
  x?: number;
  y?: number;
}

interface SegmentData {
  x: number[];
  y: number[];
  count: number;
}

async function regenerateHeatmaps() {
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const db = new Database(dbPath);

  try {
    console.log('🔍 Loading all players...');

    const players = db.prepare('SELECT id, name FROM players').all() as any[];
    console.log(`📊 Found ${players.length} players`);

    for (const player of players) {
      console.log(`\n🎯 Processing ${player.name} (${player.id})...`);

      // Get all throws for this player
      const throws = db.prepare(`
        SELECT darts FROM throws WHERE player_id = ?
      `).all(player.id) as any[];

      console.log(`   Found ${throws.length} throw records`);

      // Aggregate heatmap data
      const segments: Record<string, SegmentData> = {};
      let totalDarts = 0;

      for (const throwRecord of throws) {
        try {
          const darts: DartData[] = JSON.parse(throwRecord.darts);

          for (const dart of darts) {
            let key: string;

            // Skip misses (segment 0)
            if (dart.segment === 0) {
              key = '0-0'; // miss
            } else if (dart.segment === 25 || dart.segment === 50) {
              // Handle bulls
              key = dart.segment === 50 ? '25-2' : '25-1'; // bull or outer bull
            } else {
              // Regular segments
              key = `${dart.segment}-${dart.multiplier}`;
            }

            // Initialize if not exists
            if (!segments[key]) {
              segments[key] = { x: [], y: [], count: 0 };
            }

            // Add coordinates if available
            if (typeof dart.x === 'number' && typeof dart.y === 'number') {
              segments[key].x.push(dart.x);
              segments[key].y.push(dart.y);
            }
            segments[key].count++;
            totalDarts++;
          }
        } catch (e) {
          console.error(`   ⚠️ Error parsing darts:`, e);
        }
      }

      // Update heatmap_data in database
      const segmentsJson = JSON.stringify(segments);

      // Check if heatmap exists
      const existingHeatmap = db.prepare('SELECT player_id FROM heatmap_data WHERE player_id = ?').get(player.id);

      if (existingHeatmap) {
        db.prepare(`
          UPDATE heatmap_data
          SET segments = ?, total_darts = ?, last_updated = ?
          WHERE player_id = ?
        `).run(segmentsJson, totalDarts, Date.now(), player.id);
      } else {
        db.prepare(`
          INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
          VALUES (?, ?, ?, ?)
        `).run(player.id, segmentsJson, totalDarts, Date.now());
      }

      console.log(`   ✅ Aggregated ${totalDarts} darts into ${Object.keys(segments).length} segment keys`);

      // Show top 5 segments
      const sortedSegments = Object.entries(segments)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      console.log('   📈 Top segments:');
      for (const [key, data] of sortedSegments) {
        const hasCoords = data.x.length > 0;
        console.log(`      ${key}: ${data.count} hits ${hasCoords ? '(with coords)' : '(no coords)'}`);
      }
    }

    console.log('\n🎉 Heatmap regeneration completed!');

  } catch (error) {
    console.error('❌ Error regenerating heatmaps:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

regenerateHeatmaps();
