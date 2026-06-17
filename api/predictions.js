// /api/predictions
//   GET  ?token=...           → مباريات + توقعات اللاعب
//   POST { token, matchId, pred1, pred2, isDouble } → حفظ توقع
import { db, readToken, json } from "./_lib.js";

// مفتاح الجولة: دور المجموعات 3 جولات (Matchday 1-7 / 8-13 / 14-17)، ثم الأدوار الإقصائية
function roundKey(md) {
  const m = /Matchday\s+(\d+)/i.exec(md || "");
  if (m) { const n = +m[1]; return n <= 7 ? "g1" : n <= 13 ? "g2" : "g3"; }
  if (/Round of 32/i.test(md)) return "r32";
  if (/Round of 16/i.test(md)) return "r16";
  if (/Quarter/i.test(md)) return "qf";
  if (/Semi/i.test(md)) return "sf";
  if (/third/i.test(md)) return "third";
  if (/Final/i.test(md)) return "final";
  return md || "other";
}

export default async function handler(req, res) {
  const token = req.method === "GET" ? req.query.token : req.body?.token;
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة — سجّل دخول" });

  // ─── جلب المباريات + توقعات اللاعب ───
  if (req.method === "GET") {
    const { data: matches } = await db.from("matches").select("*").order("kickoff");
    const { data: mine } = await db.from("predictions").select("*").eq("player_id", user.id);
    const { data: me } = await db.from("players").select("is_admin").eq("id", user.id).single();
    const predMap = Object.fromEntries((mine || []).map(p => [p.match_id, p]));
    const isAdmin = !!(me && me.is_admin);

    // عدد من توقّع لكل مباراة + إجمالي اللاعبين (للجميع — مجرد عدد، لا يكشف التوقعات)
    const { data: players } = await db.from("players").select("id");
    const { data: allPreds } = await db.from("predictions").select("match_id");
    const counts = {};
    for (const p of allPreds || []) counts[p.match_id] = (counts[p.match_id] || 0) + 1;
    const totalPlayers = (players || []).length;

    return json(res, 200, { matches: matches || [], predictions: predMap, isAdmin, counts, totalPlayers, now: new Date().toISOString() });
  }

  // ─── حفظ توقع ───
  if (req.method === "POST") {
    const { matchId, pred1, pred2, isDouble } = req.body || {};
    if (pred1 == null || pred2 == null) return json(res, 400, { error: "اكتب النتيجة" });

    const { data: match } = await db.from("matches").select("*").eq("id", matchId).single();
    if (!match) return json(res, 404, { error: "مباراة غير موجودة" });

    // قفل عند صافرة البداية
    if (new Date(match.kickoff) <= new Date()) {
      return json(res, 403, { error: "أُقفلت — بدأت المباراة" });
    }

    // الدبل: مباراة واحدة لكل جولة، ويُقفل بمجرد أن تبدأ مباراته (لا يُنقَل بعدها).
    if (isDouble) {
      const rk = roundKey(match.matchday);
      const { data: allMatches } = await db.from("matches").select("id,matchday,kickoff");
      const roundIds = (allMatches || []).filter(m => roundKey(m.matchday) === rk).map(m => m.id);

      // إن كان دبل هذه الجولة موضوعًا على مباراة بدأت بالفعل → لا يُسمح بنقله
      const { data: myRound } = await db.from("predictions")
        .select("match_id,is_double").eq("player_id", user.id).in("match_id", roundIds);
      const lockedDbl = (myRound || []).find(p => {
        if (!p.is_double || p.match_id === matchId) return false;
        const dm = (allMatches || []).find(m => m.id === p.match_id);
        return dm && new Date(dm.kickoff) <= new Date();
      });
      if (lockedDbl) {
        return json(res, 403, { error: "دبل هذه الجولة مُقفل — مباراة الدبل بدأت بالفعل" });
      }

      // نلغي الدبل فقط عن مباريات الجولة التي لم تبدأ بعد (لا نلمس مباراة بدأت/انتهت)
      const openRoundIds = (allMatches || [])
        .filter(m => roundKey(m.matchday) === rk && new Date(m.kickoff) > new Date())
        .map(m => m.id);
      await db.from("predictions").update({ is_double: false })
        .eq("player_id", user.id).in("match_id", openRoundIds);
    }

    await db.from("predictions").upsert({
      player_id: user.id, match_id: matchId,
      pred1: parseInt(pred1), pred2: parseInt(pred2),
      is_double: !!isDouble, scored: false, points: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "player_id,match_id" });

    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: "method" });
}
