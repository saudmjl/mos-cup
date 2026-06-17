// /api/notify — إرسال تذكيرات "لا تنسَ توقّعك" للّاعبين الذين لم يتوقّعوا
//   • تلقائي (Vercel cron):  Authorization: Bearer <CRON_SECRET>  → مباريات تبدأ خلال WINDOW_H ساعة
//   • مؤقّت خارجي اختياري:    ?key=<CRON_SECRET>                   → نفس السلوك
//   • يدوي (الأدمن):          POST {token, force:true}             → المباراة القادمة فقط (يعيد الإرسال)
import { db, readToken, json } from "./_lib.js";
import { remindForMatches, preWindowMatches } from "./_remind.js";

export default async function handler(req, res) {
  const key = req.query && req.query.key;
  const token = (req.query && req.query.token) || (req.body && req.body.token);
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  const secret = process.env.CRON_SECRET;

  // صلاحية: سرّ الكرون (هيدر أو مفتاح) أو توكن أدمن
  let admin = false;
  if (token) {
    const u = readToken(token);
    if (u) { const { data: me } = await db.from("players").select("is_admin").eq("id", u.id).single(); admin = !!(me && me.is_admin); }
  }
  const secretOk = secret && (key === secret || authHeader === `Bearer ${secret}`);
  if (!secretOk && !admin) return json(res, 403, { error: "forbidden" });

  const now = Date.now();
  const matchId = (req.body && req.body.matchId) || (req.query && req.query.matchId ? +req.query.matchId : null);
  const force = (req.body && req.body.force === true) || (req.query && req.query.force === "1");

  const { data: matches } = await db.from("matches").select("id,team1,team2,kickoff,status");

  let targets = [];
  if (matchId) {
    const m = (matches || []).find((x) => x.id === matchId);
    if (m) targets = [m];
  } else if (force && admin) {
    // أدمن بدون تحديد → المباراة القادمة فقط
    const up = (matches || []).filter((m) => new Date(m.kickoff).getTime() > now)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    if (up[0]) targets = [up[0]];
  } else {
    targets = preWindowMatches(matches, now);
  }

  const result = await remindForMatches(db, targets, { force: force && admin });
  return json(res, 200, { ok: true, ...result });
}
