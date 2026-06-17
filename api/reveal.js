// GET /api/reveal?token=... → توقعات كل اللاعبين للمباريات التي بدأت فقط
// مهم للخصوصية: لا تُكشف توقعات أي مباراة لم تبدأ بعد (منعًا للنسخ).
import { db, readToken, json } from "./_lib.js";

export default async function handler(req, res) {
  const user = readToken(req.query?.token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة — سجّل دخول" });

  const now = new Date();
  const { data: matches } = await db.from("matches").select("*").order("kickoff");
  const started = (matches || []).filter(m => new Date(m.kickoff) <= now); // بدأت أو انتهت فقط
  const startedIds = new Set(started.map(m => m.id));

  const { data: preds } = await db.from("predictions")
    .select("player_id,match_id,pred1,pred2,is_double,points,scored");
  const { data: players } = await db.from("players").select("id,name");
  const nameById = Object.fromEntries((players || []).map(p => [p.id, p.name]));

  const byMatch = {};
  for (const p of preds || []) {
    if (!startedIds.has(p.match_id)) continue; // ← حماية: لا نكشف مباراة لم تبدأ
    (byMatch[p.match_id] = byMatch[p.match_id] || []).push({
      name: nameById[p.player_id] || "?",
      pred1: p.pred1, pred2: p.pred2, is_double: p.is_double,
      points: p.points, scored: p.scored,
    });
  }

  // الأحدث أولًا (آخر مباراة بدأت تظهر فوق)
  const out = started.sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff)).map(m => ({
    id: m.id, team1: m.team1, team2: m.team2, matchday: m.matchday,
    kickoff: m.kickoff, status: m.status, score1: m.score1, score2: m.score2,
    preds: byMatch[m.id] || [],
  }));

  return json(res, 200, { now: now.toISOString(), matches: out });
}
