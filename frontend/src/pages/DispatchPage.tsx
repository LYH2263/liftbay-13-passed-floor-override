import { useEffect, useState } from "react";
import { api } from "../api/client";
type Call = { id: number; building_id: number; floor: number; direction: string; passengers: number; status: string; score: string; assigned_car_id: number | null };
type B = { id: number; name: string; floors: number; allow_passed_pickup: boolean };
export default function DispatchPage() {
  const [rows, setRows] = useState<Call[]>([]);
  const [buildings, setBuildings] = useState<B[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const reload = () => {
    api<Call[]>("/calls").then(setRows);
    api<B[]>("/buildings").then(setBuildings);
  };
  useEffect(() => { reload(); }, []);
  async function run(id: number) {
    setMsg(""); setErr("");
    try {
      const c = await api<Call>("/dispatch", { method: "POST", body: JSON.stringify({ call_id: id }) });
      setMsg(`呼梯 #${c.id} → 轿厢 ${c.assigned_car_id}，评分 ${c.score}`);
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); reload(); }
  }
  async function togglePolicy(b: B, value: boolean) {
    setMsg(""); setErr("");
    setBuildings(bs => bs.map(x => x.id === b.id ? { ...x, allow_passed_pickup: value } : x));
    try {
      const updated = await api<B>(`/buildings/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ allow_passed_pickup: value }),
      });
      setBuildings(bs => bs.map(x => x.id === updated.id ? updated : x));
      setMsg(`${b.name}：已${value ? "打开" : "关闭"}允许已过站接驳`);
    } catch (e) {
      setBuildings(bs => bs.map(x => x.id === b.id ? { ...x, allow_passed_pickup: !value } : x));
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  const waiting = rows.filter(r => r.status === "waiting");
  return (<>
    <h2>派工</h2>
    {msg && <div className="ok">{msg}</div>}
    {err && <div className="err">{err}</div>}
    {buildings.length > 0 && (
      <table className="table"><thead><tr><th>楼栋</th><th>允许已过站接驳</th></tr></thead>
        <tbody>{buildings.map(b => <tr key={b.id}>
          <td>{b.name}</td>
          <td>
            <label title="打开后同向已过站不再扣分，近处已过站车可胜出；满员拒绝不受影响">
              <input type="checkbox" checked={b.allow_passed_pickup}
                onChange={e => togglePolicy(b, e.target.checked)} />{" "}
              {b.allow_passed_pickup ? "已允许（不扣已过站分）" : "扣分中（默认）"}
            </label>
          </td>
        </tr>)}</tbody></table>
    )}
    <table className="table"><thead><tr><th>呼梯</th><th>楼栋</th><th>楼层</th><th>方向</th><th>人数</th><th></th></tr></thead>
    <tbody>{waiting.map(c => <tr key={c.id}>
      <td>#{c.id}</td>
      <td>{buildings.find(b => b.id === c.building_id)?.name ?? c.building_id}</td>
      <td>{c.floor}</td><td>{c.direction}</td><td>{c.passengers}</td>
      <td><button onClick={() => run(c.id)}>评分派轿厢</button></td></tr>)}
      {!waiting.length && <tr><td colSpan={6}>暂无待派呼梯</td></tr>}
    </tbody></table>
  </>);
}
