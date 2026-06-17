// GET /api/sync — يسحب الجدول والنتائج من openfootball ويحدّث قاعدة البيانات
// ثم يعيد حساب نقاط كل التوقعات. يُستدعى تلقائيًا (cron) ويدويًا.
import { db, json } from "./_lib.js";

const SOURCE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const RESULTS_SOURCE = "https://worldcup26.ir/get/games"; // مصدر النتائج الفعلية

// توحيد أسماء الفرق بين المصدرين (لمطابقة آمنة)
function normTeam(s) {
  let x = String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  if (x.includes("czech")) return "czech";
  if (x.includes("bosnia")) return "bosnia";
  if (x === "usa" || x.includes("unitedstates")) return "usa";
  if (x.includes("korea")) return "korea";
  if (x.includes("ivor") || x.includes("cotedivoire")) return "ivory";
  if (x.includes("congo")) return "congo";
  if (x.includes("turk")) return "turkey";
  if (x.includes("curacao") || x.includes("curaao")) return "curacao";
  return x;
}
function pairKey(a, b) { return [normTeam(a), normTeam(b)].sort().join("|"); }

// قواعد النقاط (نسخة خادم): نتيجة دقيقة=50، فائز صح=20، غلط=0، الدبل يضاعف
function calcPoints(p1, p2, s1, s2, dbl) {
  if (s1 == null || s2 == null) return 0;
  let pts = 0;
  if (p1 === s1 && p2 === s2) pts = 50;
  else if (Math.sign(p1 - p2) === Math.sign(s1 - s2)) pts = 20;
  return dbl ? pts * 2 : pts;
}

// تحويل وقت openfootball ("2026-06-11" + "20:00 UTC-6") إلى ISO
function toKickoff(date, time) {
  if (!time) return new Date(date + "T18:00:00Z").toISOString();
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (!m) return new Date(date + "T18:00:00Z").toISOString();
  const [, hh, mm, off] = m;
  const utcH = parseInt(hh) - parseInt(off);
  const d = new Date(date + "T00:00:00Z");
  d.setUTCHours(utcH, parseInt(mm));
  return d.toISOString();
}

const THROTTLE_MS = 3 * 60 * 1000;   // مزامنة فعلية مرة كل 3 دقائق كحد أقصى

export default async function handler(req, res) {
  try {
    // ── مكابح: نتفادى المزامنة المتكررة (يستدعيها كل لاعب عند الفتح) ──
    const force = req.query && (req.query.force === "1");
    if (!force) {
      const { data: recent } = await db.from("matches")
        .select("updated_at").order("updated_at", { ascending: false }).limit(1);
      const last = recent && recent[0] ? new Date(recent[0].updated_at).getTime() : 0;
      if (Date.now() - last < THROTTLE_MS) {
        return json(res, 200, { ok: true, skipped: true });
      }
    }

    const r = await fetch(SOURCE, { cache: "no-store" });
    const data = await r.json();

    // النتائج المُدخلة يدويًا من الأدمن لا تُمسح بالمزامنة
    const { data: existing } = await db.from("matches").select("id,manual,score1,score2,status");
    const ex = Object.fromEntries((existing || []).map(m => [m.id, m]));

    const rows = [];
    let idCounter = 1;

    for (const m of data.matches) {
      const id = idCounter++;
      const score = m.score?.ft;
      const e = ex[id];
      const row = {
        id,
        matchday: m.round,
        round_label: m.group || m.round,
        team1: m.team1,
        team2: m.team2,
        grp: m.group || null,
        kickoff: toKickoff(m.date, m.time),
        score1: score ? score[0] : null,
        score2: score ? score[1] : null,
        status: score ? "finished" : "scheduled",
        manual: false,
        updated_at: new Date().toISOString(),
      };
      if (e && e.manual) {                 // احتفظ بالنتيجة اليدوية
        row.score1 = e.score1; row.score2 = e.score2;
        row.status = e.status; row.manual = true;
      }
      rows.push(row);
    }

    // ── طبقة النتائج من worldcup26.ir (يوفّر السكور الفعلي) ──
    try {
      const wr = await fetch(RESULTS_SOURCE, { cache: "no-store" });
      const wd = await wr.json();
      const games = Array.isArray(wd) ? wd : (wd.games || wd.data || []);
      const byPair = {};
      for (const row of rows) byPair[pairKey(row.team1, row.team2)] = row;
      for (const g of games || []) {
        if (String(g.finished).toUpperCase() !== "TRUE") continue;
        const hs = parseInt(g.home_score), as = parseInt(g.away_score);
        if (!(hs >= 0) || !(as >= 0)) continue;
        const row = byPair[pairKey(g.home_team_name_en, g.away_team_name_en)];
        if (!row || row.manual) continue;                  // النتيجة اليدوية لها الأولوية
        if (normTeam(g.home_team_name_en) === normTeam(row.team1)) { row.score1 = hs; row.score2 = as; }
        else { row.score1 = as; row.score2 = hs; }
        row.status = "finished";
      }
    } catch (e) { /* تجاهل تعذّر مصدر النتائج */ }

    // ── طبقة ESPN (مصدر موثوق ومباشر، بدون مفتاح) — لها الكلمة الأخيرة ──
    try {
      const byPair = {};
      for (const row of rows) byPair[pairKey(row.team1, row.team2)] = row;
      // نافذة تواريخ حول اليوم لالتقاط المباريات المباشرة والمنتهية حديثًا (UTC)
      const today = new Date();
      const dates = [];
      for (let off = -4; off <= 2; off++) {
        const d = new Date(today); d.setUTCDate(d.getUTCDate() + off);
        dates.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`);
      }
      for (const dt of dates) {
        try {
          const er = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dt}`, { cache: "no-store" });
          const ed = await er.json();
          for (const ev of ed.events || []) {
            if (ev.status?.type?.state !== "post") continue;     // المنتهية فقط
            const comp = ev.competitions?.[0]; if (!comp) continue;
            const c = comp.competitors || [];
            const home = c.find(x => x.homeAway === "home"), away = c.find(x => x.homeAway === "away");
            if (!home || !away) continue;
            const hs = parseInt(home.score), as = parseInt(away.score);
            if (!(hs >= 0) || !(as >= 0)) continue;
            const row = byPair[pairKey(home.team?.displayName, away.team?.displayName)];
            if (!row || row.manual) continue;                    // النتيجة اليدوية لها الأولوية
            if (normTeam(home.team?.displayName) === normTeam(row.team1)) { row.score1 = hs; row.score2 = as; }
            else { row.score1 = as; row.score2 = hs; }
            row.status = "finished";
          }
        } catch (e) { /* تجاهل يوم فاشل */ }
      }
    } catch (e) { /* تجاهل تعذّر ESPN */ }

    // upsert المباريات
    await db.from("matches").upsert(rows, { onConflict: "id" });

    // إعادة حساب النقاط للمباريات المنتهية غير المحسوبة
    const { data: finished } = await db.from("matches")
      .select("id,score1,score2").eq("status", "finished");
    const finMap = Object.fromEntries((finished || []).map(f => [f.id, f]));

    const { data: preds } = await db.from("predictions").select("*");
    const updates = [];
    for (const p of preds || []) {
      const fm = finMap[p.match_id];
      if (!fm) continue;
      const pts = calcPoints(p.pred1, p.pred2, fm.score1, fm.score2, p.is_double);
      if (!p.scored || p.points !== pts) {
        updates.push({ id: p.id, points: pts, scored: true });
      }
    }
    for (const u of updates) {
      await db.from("predictions").update({ points: u.points, scored: u.scored }).eq("id", u.id);
    }

    // ── احتياطي: تذكيرات قبل المباراة عند أي مزامنة فعلية (مع منع التكرار) ──
    try {
      const { remindForMatches, preWindowMatches } = await import("./_remind.js");
      const { data: ms } = await db.from("matches").select("id,team1,team2,kickoff");
      await remindForMatches(db, preWindowMatches(ms));
    } catch (e) { /* لا تُفشل المزامنة بسبب الإشعارات */ }

    return json(res, 200, { ok: true, matches: rows.length, recalculated: updates.length });
  } catch (e) {
    return json(res, 500, { error: "تعذّر المزامنة", detail: String(e) });
  }
}
