# Recalculating stored averages (2026-10-05)

Until 0.23.0, averages divided by the **stored** darts. A total typed on the
numpad is stored as "plausible" darts (60 = one T20), so a visit of 60 was a
180 average. 0.23.0 fixed the calculation (`dartsInVisit`); this recalculated
what was already in the database.

Run once on production on 2026-10-05 (01:34 UTC+2). Backup taken first:
`/var/www/stateofthedart-backend/data/backups/pre-recalc-averages-20261005-013421.db`.

1. `python3 recalc.py <copy.db>` — recompute `match_players.match_average`,
   `first9_average`, `darts_thrown` for real x01 matches from `throws`
   (3 darts per visit, actual darts for the checkout). Writes `changes.json`.
2. `python3 plan.py <copy.db>` — derive `player_stats.best_average`
   (best completed match; players with seed matches keep a higher old value),
   `average_overall` (old value + Σ(new − old) / games_played over completed
   real matches) and `personal_bests.bestAverage`. Writes `plan.json`.
3. `python3 gensql.py` — one transaction; every UPDATE is guarded by the old
   value, so a row that changed meanwhile is left alone.

Result: 78 match rows, 17 player stats, 10 personal bests; a re-run on the
new state reports 0 changes, integrity check ok.

**Left alone on purpose:**
- Seed/demo data (`game_type = 'X01'`, `startingScore`): synthetic throws that
  do not add up (907 points in a 501 leg) — recalculating them would produce
  nonsense. Demo players (Max, Anna, Ben, Lisa, Tom "Steady") keep their values.
- 32 match rows without stored throws (nothing to recalculate from).
- `throws.running_average` — never computed by the app, never shown.
- Achievements unlocked with the inflated averages — not revoked automatically.
