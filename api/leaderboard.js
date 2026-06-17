// GET /api/leaderboard → الترتيب العام + حركة الترتيب (▲▼ من آخر مباراة) + هل استخدم الدبل بالجولة الحالية
import { db, json } from "./_lib.js";

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
  const [{ data: players }, { data: matches }, { data: preds }] = await Promise.all([
    db.from("players").select("id,name"),
    db.from("matches").select("id,matchday,kickoff,status"),
    db.from("predictions").select("player_id,match_id,points,is_double"),
  ]);
  const P = players || [], M = matches || [], PR = preds || [];
  const now = Date.now();
  const mById = Object.fromEntries(M.map(m => [m.id, m]));
  const finished = M.filter(m => m.status === "finished");

  // آخر مباراة منتهية (الحركة تُحسب منها) + آخر جولة (احتياطيًا لتحديد الجولة الحالية)
  let lastMatchId = null, latestRound = null, maxK = -1;
  for (const m of finished) {
    const k = new Date(m.kickoff).getTime();
    if (k > maxK || (k === maxK && m.id > lastMatchId)) { maxK = k; lastMatchId = m.id; latestRound = roundKey(m.matchday); }
  }
  const prevFinishedIds = new Set(finished.filter(m => m.id !== lastMatchId).map(m => m.id));
  const hasPrev = prevFinishedIds.size > 0;

  // الجولة الحالية = جولة أقرب مباراة قادمة (وإلا آخر جولة)
  const upcoming = M.filter(m => new Date(m.kickoff).getTime() > now).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const currentRound = upcoming.length ? roundKey(upcoming[0].matchday) : latestRound;
  const currentRoundIds = new Set(M.filter(m => roundKey(m.matchday) === currentRound).map(m => m.id));
  const dblThisRound = new Set();
  for (const p of PR) {
    if (!p.is_double || !currentRoundIds.has(p.match_id)) continue;
    const m = mById[p.match_id];
    if (m && new Date(m.kickoff).getTime() <= now) dblThisRound.add(p.player_id); // يظهر فقط بعد بدء مباراة الدبل
  }

  // المجاميع (الكل + السابق بدون آخر جولة)
  const tot = {}, prev = {};
  for (const p of P) { tot[p.id] = { points: 0, correct: 0, scored: 0 }; prev[p.id] = { points: 0, correct: 0 }; }
  for (const pr of PR) {
    const t = tot[pr.player_id]; if (!t) continue;
    const pts = pr.points || 0;
    const fin = mById[pr.match_id] && mById[pr.match_id].status === "finished";
    t.points += pts; if (pts > 0) t.correct++; if (fin) t.scored++;
    if (hasPrev && prevFinishedIds.has(pr.match_id)) { prev[pr.player_id].points += pts; if (pts > 0) prev[pr.player_id].correct++; }
  }

  const cmp = (s) => (a, b) => s[b.id].points - s[a.id].points || s[b.id].correct - s[a.id].correct || String(a.name).localeCompare(String(b.name));
  const curSorted = [...P].sort(cmp(tot));
  const curRank = {}; curSorted.forEach((p, i) => curRank[p.id] = i + 1);
  let prevRank = {};
  if (hasPrev) { [...P].sort(cmp(prev)).forEach((p, i) => prevRank[p.id] = i + 1); }

  const leaderboard = curSorted.map(p => ({
    id: p.id, name: p.name,
    total_points: tot[p.id].points,
    correct_preds: tot[p.id].correct,
    games_scored: tot[p.id].scored,
    rank: curRank[p.id],
    movement: hasPrev ? (prevRank[p.id] - curRank[p.id]) : null,
    double_this_round: dblThisRound.has(p.id),
  }));

  return json(res, 200, { leaderboard, currentRound, hasMovement: hasPrev });
}
