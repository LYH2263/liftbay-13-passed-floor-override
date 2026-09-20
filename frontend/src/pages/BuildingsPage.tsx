import { useEffect, useState } from "react";
import { api } from "../api/client";
type B = { id: number; name: string; floors: number; allow_passed_pickup: boolean };
export default function BuildingsPage() {
  const [rows, setRows] = useState<B[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { api<B[]>("/buildings").then(setRows); }, []);
  async function toggle(b: B, value: boolean) {
    setMsg(""); setErr("");
    setRows(rs => rs.map(r => r.id === b.id ? { ...r, allow_passed_pickup: value } : r));
    try {
      const updated = await api<B>(`/buildings/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ allow_passed_pickup: value }),
      });
      setRows(rs => rs.map(r => r.id === updated.id ? updated : r));
      setMsg(`${b.name}：已${value ? "打开" : "关闭"}允许已过站接驳`);
    } catch (e) {
      setRows(rs => rs.map(r => r.id === b.id ? { ...r, allow_passed_pickup: !value } : r));
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  return (<>
    <h2>楼栋</h2>
    {msg && <div className="ok">{msg}</div>}
    {err && <div className="err">{err}</div>}
    <table className="table"><thead><tr><th>名称</th><th>楼层数</th><th>允许已过站接驳</th></tr></thead>
    <tbody>{rows.map(b => <tr key={b.id}>
      <td>{b.name}</td>
      <td className="mono">{b.floors}</td>
      <td>
        <label title="打开后，同向但已过站的近处轿厢不再扣分，可成为胜者；默认关闭（保持现网扣分）">
          <input type="checkbox" checked={b.allow_passed_pickup}
            onChange={e => toggle(b, e.target.checked)} />{" "}
          {b.allow_passed_pickup ? "已允许" : "扣分中（默认）"}
        </label>
      </td>
    </tr>)}</tbody></table>
  </>);
}
