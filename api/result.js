// POST /api/result  { token, matchId, score1, score2 }  → إدخال نتيجة يدويًا (أدمن)
//        { token, matchId, clear:true }                  → إلغاء النتيجة اليدوية
// محمي: للأدمن فقط (is_admin). يحسب النقاط فورًا، والمزامنة لا تمسح النتيجة.
import { db, readToken, json } from "./_lib.js";

function calcPoints(p1, p2, s1, s2, dbl) {
  if (s1 == null || s2 == null) return 0;
  let pts = 0;
  if (p1 === s1 && p2 === s2) pts = 50;
  else if (Math.sign(p1 - p2) === Math.sign(s1 - s2)) pts = 20;
  return dbl ? pts * 2 : pts;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const { token, matchId, score1, score2, clear } = req.body || {};
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة" });

  const { data: me } = await db.from("players").select("is_admin").eq("id", user.id).single();
  if (!me || !me.is_admin) return json(res, 403, { error: "هذه الخاصية للأدمن فقط" });

  const { data: match } = await db.from("matches").select("*").eq("id", matchId).single();
  if (!match) return json(res, 404, { error: "مباراة غير موجودة" });

  const { data: preds } = await db.from("predictions").select("*").eq("match_id", matchId);

  if (clear) {
    await db.from("matches").update({ score1: null, score2: null, status: "scheduled", manual: false, updated_at: new Date().toISOString() }).eq("id", matchId);
    for (const p of preds || []) await db.from("predictions").update({ points: 0, scored: false }).eq("id", p.id);
    return json(res, 200, { ok: true, cleared: true });
  }

  const s1 = parseInt(score1), s2 = parseInt(score2);
  if (!(s1 >= 0 && s1 <= 99 && s2 >= 0 && s2 <= 99)) return json(res, 400, { error: "اكتب نتيجة صحيحة (0–99)" });

  await db.from("matches").update({ score1: s1, score2: s2, status: "finished", manual: true, updated_at: new Date().toISOString() }).eq("id", matchId);
  for (const p of preds || []) {
    const pts = calcPoints(p.pred1, p.pred2, s1, s2, p.is_double);
    await db.from("predictions").update({ points: pts, scored: true }).eq("id", p.id);
  }
  return json(res, 200, { ok: true, scored: (preds || []).length });
}
