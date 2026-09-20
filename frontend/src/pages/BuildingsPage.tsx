import { useEffect, useState } from "react";
import { api } from "../api/client";
type B = { id: number; name: string; floors: number; allow_passed_pickup: boolean };
export default function BuildingsPage() {
  const [rows, setRows] = useState<B[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { api<B[]>("/buildings").then(setRows); }, []);
  async function toggle(b: B) {
    setErr("");
    const next = !b.allow_passed_pickup;
    setRows(rs => rs.map(x => x.id === b.id ? { ...x, allow_passed_pickup: next } : x));
    try {
      await api(`/buildings/${b.id}`, { method: "PATCH", body: JSON.stringify({ allow_passed_pickup: next }) });
    } catch (e) {
      setRows(rs => rs.map(x => x.id === b.id ? { ...x, allow_passed_pickup: b.allow_passed_pickup } : x));
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  return (<>
    <h2>楼栋</h2>
    {err && <div className="err">{err}</div>}
    <table className="table"><thead><tr><th>名称</th><th>楼层数</th><th>允许已过站接驳</th></tr></thead>
    <tbody>{rows.map(b => <tr key={b.id}>
      <td>{b.name}</td>
      <td className="mono">{b.floors}</td>
      <td>
        <label style={{ display: "inline-flex", gap: ".5rem", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={b.allow_passed_pickup} onChange={() => toggle(b)} style={{ width: "auto" }} />
          {b.allow_passed_pickup
            ? <span className="ok">开（同向已过站不扣分，近处已过站车可胜）</span>
            : <span>关（现网默认，同向已过站扣分）</span>}
        </label>
      </td>
    </tr>)}</tbody></table>
  </>);
}
