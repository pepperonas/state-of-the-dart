import json
ch=json.load(open('changes.json')); plan=json.load(open('plan.json'))
def num(v): return 'NULL' if v is None else repr(float(v)) if isinstance(v,float) else str(v)
def guard(col, v): return f"{col} IS NULL" if v is None else f"abs(ifnull({col},0) - {float(v)}) < 0.0001"
out=["BEGIN;"]
for c in ch:
    a,f9,d=c['new']; oa,of9,od=c['old']
    out.append(f"UPDATE match_players SET match_average={a}, first9_average={f9}, darts_thrown={d} WHERE id='{c['id']}' AND {guard('match_average',oa)} AND {guard('first9_average',of9)} AND ifnull(darts_thrown,0)={od or 0};")
for p in plan:
    out.append(f"UPDATE player_stats SET best_average={p['best_new']}, average_overall={p['ov_new']} WHERE player_id='{p['pid']}' AND {guard('best_average',p['best_old'])} AND {guard('average_overall',p['ov_old'])};")
    if p['pb_old'] is not None:
        out.append(f"UPDATE personal_bests SET data=json_set(data,'$.bestAverage.value',{p['pb_new']}) WHERE player_id='{p['pid']}' AND abs(json_extract(data,'$.bestAverage.value') - {float(p['pb_old'])}) < 0.0001;")
out.append("COMMIT;")
open('apply.sql','w').write("\n".join(out)+"\n")
print(len(ch),'match_players,',len(plan),'player_stats,',sum(p['pb_old'] is not None for p in plan),'personal_bests')
