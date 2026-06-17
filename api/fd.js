// GET /api/fd?key=BACKUP_KEY → فحص مصادر النتائج (مؤقت للتطوير)
import { json } from "./_lib.js";

export default async function handler(req, res) {
  if (!process.env.BACKUP_KEY || req.query?.key !== process.env.BACKUP_KEY) {
    return json(res, 403, { error: "forbidden" });
  }
  const out = {};

  // football-data.org
  try {
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY || "" },
    });
    const d = await r.json();
    const fin = (d.matches || []).filter(m => m.status === "FINISHED")
      .map(m => ({ home: m.homeTeam?.name, away: m.awayTeam?.name, ft: m.score?.fullTime }));
    out.footballData = { status: r.status, count: (d.matches || []).length, finishedCount: fin.length, finishedSample: fin.slice(0, 5) };
  } catch (e) { out.footballData = { error: String(e) }; }

  // worldcup26.ir (بدون مفتاح)
  try {
    const r = await fetch("https://worldcup26.ir/get/games", { cache: "no-store" });
    const txt = await r.text();
    let d; try { d = JSON.parse(txt); } catch { d = null; }
    if (!d) { out.worldcup26 = { status: r.status, notJson: txt.slice(0, 200) }; }
    else {
      const arr = Array.isArray(d) ? d : (d.games || d.data || d.matches || d.result || []);
      const mex = (Array.isArray(arr) ? arr : []).find(g => JSON.stringify(g).toLowerCase().includes("mexico"));
      out.worldcup26 = { status: r.status, topKeys: Array.isArray(d) ? "array" : Object.keys(d), total: Array.isArray(arr) ? arr.length : null, mexicoItem: mex || null, firstItem: Array.isArray(arr) ? arr[0] : null };
    }
  } catch (e) { out.worldcup26 = { error: String(e) }; }

  return json(res, 200, out);
}
