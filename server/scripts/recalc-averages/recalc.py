"""Step 1 of the 2026-10-05 average recalculation (see README.md here): recompute
match_players averages of REAL x01 matches from their throws. Seed data (game_type "X01") is excluded."""
import sqlite3, json, sys
db = sqlite3.connect(sys.argv[1]); db.row_factory = sqlite3.Row
def darts_in_visit(t):
    try: n = len(json.loads(t['darts']) or [])
    except Exception: n = 0
    if not t['is_bust'] and t['remaining'] == 0: return min(3, max(1, n))
    return 3
rows = db.execute("""select mp.id, mp.match_id, mp.player_id, mp.match_average, mp.first9_average, mp.darts_thrown, m.game_type, m.status
  from match_players mp join matches m on m.id=mp.match_id where m.game_type='x01'""").fetchall()
out = []
for r in rows:
    legs = db.execute("select id from legs where match_id=? order by leg_number", (r['match_id'],)).fetchall()
    allt=[]; f9=[]
    for l in legs:
        ts = db.execute("select * from throws where leg_id=? and player_id=? order by visit_number, timestamp", (l['id'], r['player_id'])).fetchall()
        allt += ts
        if ts:
            first = ts[:3]; d = sum(darts_in_visit(t) for t in first)
            f9.append(sum(t['score'] for t in first)/d*3 if d else 0)
    if not allt:
        out.append((r, None)); continue
    d = sum(darts_in_visit(t) for t in allt)
    avg = round(sum(t['score'] for t in allt)/d*3, 2)
    first9 = round(sum(f9)/len(f9), 2) if f9 else 0
    out.append((r, (avg, first9, d)))
changed = [(r,n) for r,n in out if n and (abs((r['match_average'] or 0)-n[0])>0.005 or abs((r['first9_average'] or 0)-n[1])>0.005 or (r['darts_thrown'] or 0)!=n[2])]
nothrows = [r for r,n in out if not n]
print(f"x01 match_players: {len(out)}, with throws: {len(out)-len(nothrows)}, without: {len(nothrows)}, changed: {len(changed)}")
import statistics
ups=[n[0]-(r['match_average'] or 0) for r,n in changed]
print("avg delta: min %.1f max %.1f median %.1f" % (min(ups), max(ups), statistics.median(ups)) if ups else "none")
for r,n in sorted(changed, key=lambda x: -abs(x[1][0]-(x[0]['match_average'] or 0)))[:12]:
    name = db.execute("select name from players where id=?", (r['player_id'],)).fetchone()
    print(f"  {name[0] if name else '?':20s} {r['status']:9s} avg {r['match_average'] or 0:7.2f} -> {n[0]:7.2f}  f9 {r['first9_average'] or 0:7.2f} -> {n[1]:7.2f}  darts {r['darts_thrown']} -> {n[2]}")
json.dump([{'id':r['id'],'match_id':r['match_id'],'player_id':r['player_id'],'old':[r['match_average'],r['first9_average'],r['darts_thrown']],'new':list(n)} for r,n in changed], open('changes.json','w'))
