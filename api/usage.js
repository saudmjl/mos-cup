// /api/usage — (أدمن فقط) قائمة دخول اللاعبين: تطبيق/متصفح + الجهاز + آخر دخول + العدد
import { db, readToken, json } from "./_lib.js";

export default async function handler(req, res) {
  const token = req.method === "GET" ? req.query.token : req.body && req.body.token;
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة" });
  const { data: me } = await db.from("players").select("is_admin").eq("id", user.id).single();
  if (!(me && me.is_admin)) return json(res, 403, { error: "للأدمن فقط" });

  const { data: players } = await db.from("players")
    .select("name,last_open,last_mode,platform,installed,opens,created_at");
  // ترتيب: الأحدث دخولًا أولًا، ومن لم يدخل أبدًا في الأخير
  const list = (players || []).slice().sort((a, b) => {
    const ta = a.last_open ? new Date(a.last_open).getTime() : 0;
    const tb = b.last_open ? new Date(b.last_open).getTime() : 0;
    return tb - ta;
  });
  const installedCount = list.filter(p => p.installed).length;
  return json(res, 200, { players: list, total: list.length, installedCount, now: new Date().toISOString() });
}
