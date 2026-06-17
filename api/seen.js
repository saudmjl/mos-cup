// /api/seen — تسجيل دخول اللاعب: تطبيق/متصفح + الجهاز + الوقت + عدّاد المرات
import { db, readToken, json } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const { token, mode, platform } = req.body || {};
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة" });

  const { data: cur } = await db.from("players").select("opens,installed").eq("id", user.id).single();
  const isApp = mode === "app";
  const upd = {
    last_open: new Date().toISOString(),
    last_mode: isApp ? "app" : "browser",
    platform: String(platform || "").slice(0, 20),
    opens: ((cur && cur.opens) || 0) + 1,
    installed: (cur && cur.installed) || isApp,   // يبقى true بمجرد فتحه كتطبيق مرة
  };
  await db.from("players").update(upd).eq("id", user.id);
  return json(res, 200, { ok: true });
}
