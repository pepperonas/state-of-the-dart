-- Export demo data from local DB for VPS import
-- Run: sqlite3 data/state-of-the-dart.db < scripts/export-demo-data.sql > demo-data.sql

.mode insert players
SELECT * FROM players;

.mode insert player_stats
SELECT * FROM player_stats;

.mode insert personal_bests
SELECT * FROM personal_bests;

.mode insert heatmap_data
SELECT * FROM heatmap_data;

.mode insert player_achievements
SELECT * FROM player_achievements;

.mode insert matches
SELECT * FROM matches;

.mode insert match_players
SELECT * FROM match_players;

.mode insert legs
SELECT * FROM legs;

.mode insert throws
SELECT * FROM throws;
