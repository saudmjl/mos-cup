// منطق التذكيرات المشترك — يستخدمه /api/notify (cron/أدمن) و /api/sync (احتياطي عند النشاط)
import { sendPush } from "./_push.js";

export const WINDOW_H = 3; // نطاق التذكير التلقائي بالساعات

function timeLeftAr(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m >= 60) { const h = Math.floor(m / 60), mm = m % 60; return mm ? `${h} ساعة و${mm} دقيقة` : `${h} ساعة`; }
  return `${m} دقيقة`;
}

// مباريات تبدأ خلال النطاق ولم تبدأ بعد
export function preWindowMatches(matches, now = Date.now()) {
  return (matches || []).filter((m) => {
    const k = new Date(m.kickoff).getTime();
    return k > now && k <= now + WINDOW_H * 3600 * 1000;
  });
}

// يرسل تذكير "لا تنسَ توقّعك" لغير المتوقّعين في المباريات المعطاة
//   force=true → يتجاوز سجل الإرسال (للأدمن، يسمح بإعادة الإرسال)
export async function remindForMatches(db, targets, { force = false } = {}) {
  if (!targets || !targets.length) return { sent: 0, removed: 0, matches: 0 };
  if (!process.env.VAPID_PRIVATE_KEY) return { sent: 0, removed: 0, matches: 0, note: "VAPID غير مُعدّ" };

  const { data: subs } = await db.from("push_subscriptions").select("*");
  if (!subs || !subs.length) return { sent: 0, removed: 0, matches: targets.length, note: "لا مشتركين" };
  const subsByPlayer = {};
  for (const s of subs) (subsByPlayer[s.player_id] = subsByPlayer[s.player_id] || []).push(s);

  const { data: preds } = await db.from("predictions").select("player_id,match_id");
  const predicted = new Set((preds || []).map((p) => p.player_id + ":" + p.match_id));
  const { data: logRows } = await db.from("push_log").select("player_id,match_id");
  const logged = new Set((logRows || []).map((p) => p.player_id + ":" + p.match_id));

  const now = Date.now();
  let sent = 0, removed = 0;
  const newLogs = [];
  for (const m of targets) {
    const left = new Date(m.kickoff).getTime() - now;
    const title = "⏰ لا تنسَ توقّعك!";
    const body = `${m.team1} × ${m.team2} — تبدأ بعد ${timeLeftAr(left)}. سجّل توقّعك الحين 👈`;
    for (const pid of Object.keys(subsByPlayer)) {
      const playerId = +pid;
      if (predicted.has(playerId + ":" + m.id)) continue;
      if (!force && logged.has(playerId + ":" + m.id)) continue;
      for (const s of subsByPlayer[pid]) {
        const r = await sendPush(s, { title, body, tag: "m" + m.id, url: "/" });
        if (r.ok) sent++;
        else if (r.gone) { await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); removed++; }
      }
      newLogs.push({ player_id: playerId, match_id: m.id, sent_at: new Date().toISOString() });
    }
  }
  if (newLogs.length) await db.from("push_log").upsert(newLogs, { onConflict: "player_id,match_id" });
  return { sent, removed, matches: targets.length };
}
