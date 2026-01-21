"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var path_1 = __importDefault(require("path"));
var dbPath = path_1.default.join(__dirname, '..', 'database.sqlite');
var db = new better_sqlite3_1.default(dbPath);
console.log('🔧 Fixing matches with missing timestamps...\n');
try {
    // Get all matches with NULL or 0 started_at
    var matchesWithoutTimestamp = db.prepare("\n    SELECT id, completed_at FROM matches WHERE started_at IS NULL OR started_at = 0\n  ").all();
    console.log("Found ".concat(matchesWithoutTimestamp.length, " matches with missing timestamps\n"));
    var fixed = 0;
    var failed = 0;
    for (var _i = 0, matchesWithoutTimestamp_1 = matchesWithoutTimestamp; _i < matchesWithoutTimestamp_1.length; _i++) {
        var match = matchesWithoutTimestamp_1[_i];
        try {
            var timestamp = null;
            // Try to get the earliest throw timestamp from this match's legs
            var earliestThrow = db.prepare("\n        SELECT MIN(t.timestamp) as earliest\n        FROM throws t\n        JOIN legs l ON t.leg_id = l.id\n        WHERE l.match_id = ? AND t.timestamp IS NOT NULL AND t.timestamp > 0\n      ").get(match.id);
            if (earliestThrow === null || earliestThrow === void 0 ? void 0 : earliestThrow.earliest) {
                timestamp = earliestThrow.earliest;
                console.log("\u2705 Match ".concat(match.id, ": Using earliest throw timestamp ").concat(new Date(timestamp).toISOString()));
            }
            else if (match.completed_at) {
                // Use completed_at minus 30 minutes as fallback
                timestamp = match.completed_at - (30 * 60 * 1000);
                console.log("\u26A0\uFE0F  Match ".concat(match.id, ": Using completed_at minus 30min: ").concat(new Date(timestamp).toISOString()));
            }
            else {
                // Last resort: use current time minus 30 days
                timestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);
                console.log("\u26A0\uFE0F  Match ".concat(match.id, ": Using fallback timestamp: ").concat(new Date(timestamp).toISOString()));
            }
            // Update the match
            db.prepare('UPDATE matches SET started_at = ? WHERE id = ?').run(timestamp, match.id);
            fixed++;
        }
        catch (err) {
            console.error("\u274C Failed to fix match ".concat(match.id, ":"), err);
            failed++;
        }
    }
    console.log('\n📊 Summary:');
    console.log("   Total matches: ".concat(matchesWithoutTimestamp.length));
    console.log("   Fixed: ".concat(fixed));
    console.log("   Failed: ".concat(failed));
    console.log('\n✨ Migration complete!');
}
catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
db.close();
