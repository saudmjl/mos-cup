// GET /api/stats → إحصائيات اللاعبين (عام، لا يحتاج تسجيل)
//   exact_count   = عدد النتائج الدقيقة الصحيحة
//   outcome_count = عدد المباريات المتوقَّع فائزها صح (تشمل الدقيقة)
import { db, json } from "./_lib.js";

export default async function handler(req, res) {
  const { data, error } = await db.from("stats").select("*");
  if (error) return json(res, 500, { error: "تعذّر جلب الإحصائيات" });
  return json(res, 200, { stats: data || [] });
}
