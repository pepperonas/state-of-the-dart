import type { DebugFlag } from '../types/debugFlag';

/**
 * Format a debug flag as structured text for AI-assisted debugging.
 * Designed to be copied to clipboard and pasted into an AI assistant.
 */
export function formatDebugFlagForAI(flag: DebugFlag): string {
  const lines: string[] = [];

  lines.push('=== DEBUG FLAG ===');
  lines.push(`ID: ${flag.id}`);
  lines.push(`Created: ${new Date(flag.createdAt).toISOString()}`);
  lines.push(`Route: ${flag.route || 'N/A'}`);
  lines.push(`Admin: ${flag.userName || 'Unknown'} (${flag.userEmail || 'N/A'})`);
  lines.push(`Status: ${flag.status}`);
  lines.push('');

  lines.push('--- ISSUE DESCRIPTION ---');
  lines.push(flag.comment);
  lines.push('');

  if (flag.adminNotes) {
    lines.push('--- ADMIN NOTES ---');
    lines.push(flag.adminNotes);
    lines.push('');
  }

  if (flag.browserInfo) {
    lines.push('--- BROWSER ---');
    lines.push(`UserAgent: ${flag.browserInfo.userAgent || 'N/A'}`);
    lines.push(`Viewport: ${flag.browserInfo.viewport || 'N/A'}`);
    lines.push(`Screen: ${flag.browserInfo.screenResolution || 'N/A'}`);
    lines.push(`Online: ${flag.browserInfo.onLine ?? 'N/A'}`);
    lines.push('');
  }

  if (flag.gameState) {
    lines.push('--- GAME STATE ---');
    const gs = flag.gameState as any;
    lines.push(`Match ID: ${gs.matchId || 'N/A'}`);
    lines.push(`Type: ${gs.type || 'N/A'}`);
    lines.push(`Status: ${gs.status || 'N/A'}`);
    if (gs.players && Array.isArray(gs.players)) {
      lines.push(`Players: ${gs.players.map((p: any) => `${p.name} (avg: ${p.matchAverage?.toFixed(1) || '?'}, legs: ${p.legsWon ?? '?'})`).join(' vs ')}`);
    }
    lines.push(`Leg: ${gs.currentLegIndex != null ? gs.currentLegIndex + 1 : 'N/A'} of ${gs.legsCount || 'N/A'}`);
    lines.push('');
  }

  if (flag.logEntries && flag.logEntries.length > 0) {
    const entries = flag.logEntries;
    const firstTs = new Date(entries[0].timestamp).getTime();
    const lastTs = new Date(entries[entries.length - 1].timestamp).getTime();
    const spanSec = ((lastTs - firstTs) / 1000).toFixed(1);

    lines.push(`--- LOG ENTRIES (${entries.length} entries, ${spanSec}s span) ---`);
    for (const entry of entries) {
      const ts = entry.timestamp;
      const level = entry.level.toUpperCase().padEnd(5);
      const cat = entry.category;
      let line = `[${ts}] [${level}] [${cat}] ${entry.message}`;
      if (entry.data !== undefined && entry.data !== null) {
        try {
          const dataStr = JSON.stringify(entry.data);
          if (dataStr.length <= 200) {
            line += `\n  data: ${dataStr}`;
          } else {
            line += `\n  data: ${dataStr.slice(0, 200)}...`;
          }
        } catch {
          line += '\n  data: [unserializable]';
        }
      }
      lines.push(line);
    }
    lines.push('');
  }

  lines.push('=== END DEBUG FLAG ===');

  return lines.join('\n');
}
