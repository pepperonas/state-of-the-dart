import sqlite3, json, sys
db=sqlite3.connect(sys.argv[1]); db.row_factory=sqlite3.Row
ch={c['id']:c for c in json.load(open('changes.json'))}
def avg_of(mp): return ch[mp['id']]['new'][0] if mp['id'] in ch else (mp['match_average'] or 0)
plan=[]
for ps in db.execute("select ps.*, p.name from player_stats ps join players p on p.id=ps.player_id"):
    pid=ps['player_id']
    mps=db.execute("select mp.*, m.game_type, m.status from match_players mp join matches m on m.id=mp.match_id where mp.player_id=? and lower(m.game_type)='x01'",(pid,)).fetchall()
    if not any(mp['id'] in ch for mp in mps): continue
    real=[mp for mp in mps if mp['game_type']=='x01']
    seed=any(mp['game_type']=='X01' for mp in mps)
    done=[mp for mp in real if mp['status']=='completed']
    best=max([avg_of(mp) for mp in (done or real)] or [0])
    if seed: best=max(best, ps['best_average'] or 0)
    completed_real=[mp for mp in mps if mp['game_type']=='x01' and mp['status']=='completed' and mp['id'] in ch]
    gp=ps['games_played'] or 0
    overall=ps['average_overall'] or 0
    if gp>0:
        overall=max(0.0, overall+sum(ch[mp['id']]['new'][0]-(mp['match_average'] or 0) for mp in completed_real)/gp)
    pbbest=max([avg_of(mp) for mp in done] or [0])
    pb=db.execute("select data from personal_bests where player_id=?",(pid,)).fetchone()
    oldpb=json.loads(pb['data']).get('bestAverage',{}).get('value') if pb else None
    if seed and oldpb is not None: pbbest=max(pbbest, oldpb)
    plan.append(dict(pid=pid,name=ps['name'],gp=gp,best_old=ps['best_average'],best_new=round(best,2),ov_old=ps['average_overall'],ov_new=round(overall,2),pb_old=oldpb,pb_new=round(pbbest,2) if pb else None))
print(f"{'Spieler':24s} {'Spiele':>6s} {'Bester Schnitt':>18s} {'Gesamtschnitt':>17s} {'Bestwert':>17s}")
for p in plan:
    pbs=f"{p['pb_old']}->{p['pb_new']}" if p['pb_old'] is not None else "-"
    print(f"{p['name']:24s} {p['gp']:6d} {p['best_old']:8.2f}->{p['best_new']:7.2f} {p['ov_old']:7.2f}->{p['ov_new']:7.2f} {pbs:>17s}")
json.dump(plan,open('plan.json','w'))
