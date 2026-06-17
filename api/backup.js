// GET /api/backup?key=XXX → نسخة كاملة من اللاعبين وتوقعاتهم (JSON)
// محمي بمفتاح سرّي في متغيّر البيئة BACKUP_KEY. يُستخدم للنسخ الاحتياطي اليومي.
import { db, json } from "./_lib.js";

export default async function handler(req, res) {
  const key = req.query?.key;
  if (!process.env.BACKUP_KEY || key !== process.env.BACKUP_KEY) {
    return json(res, 403, { error: "forbidden" });
  }
  const { data: players } = await db.from("players").select("*");
  const { data: predictions } = await db.from("predictions").select("*");
  return json(res, 200, {
    at: new Date().toISOString(),
    counts: { players: (players || []).length, predictions: (predictions || []).length },
    players: players || [],
    predictions: predictions || [],
  });
}
