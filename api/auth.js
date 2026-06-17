// POST /api/auth  { action:'login'|'register', name, pin, groupPassword }
import { db, hashPin, makeToken, GROUP_PASSWORD, json } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const { action, name, pin, groupPassword } = req.body || {};

  if (!name || !pin) return json(res, 400, { error: "اكتب الاسم والرقم السري" });
  if (String(pin).length < 4) return json(res, 400, { error: "الرقم السري 4 أرقام على الأقل" });

  // كلمة دخول القروب مطلوبة للتسجيل الجديد
  if (action === "register" && groupPassword !== GROUP_PASSWORD) {
    return json(res, 403, { error: "كلمة دخول القروب غير صحيحة" });
  }

  const cleanName = String(name).trim();
  const { data: existing } = await db.from("players").select("*").eq("name", cleanName).maybeSingle();

  if (action === "register") {
    // منع الرموز الخطرة في الاسم (حماية من XSS) وضبط الطول
    if (cleanName.length < 2 || cleanName.length > 24 || /[<>&"'`\\\/.]/.test(cleanName)) {
      return json(res, 400, { error: "الاسم يجب أن يكون 2–24 حرفًا وبدون رموز خاصة (< > & \" ' / . \\)" });
    }
    if (existing) return json(res, 409, { error: "الاسم مستخدم — اختر غيره أو سجّل دخول" });
    const { data: created, error } = await db.from("players")
      .insert({ name: cleanName, pin_hash: hashPin(pin) }).select().single();
    if (error) return json(res, 500, { error: "تعذّر التسجيل" });
    return json(res, 200, { token: makeToken(created.id, created.name), name: created.name, isAdmin: created.is_admin });
  }

  // login
  if (!existing) return json(res, 404, { error: "الاسم غير مسجّل — سجّل أولًا" });
  if (existing.pin_hash !== hashPin(pin)) return json(res, 401, { error: "الرقم السري غير صحيح" });
  return json(res, 200, { token: makeToken(existing.id, existing.name), name: existing.name, isAdmin: existing.is_admin });
}
