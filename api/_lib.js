// ── أدوات الخادم: اتصال Supabase + تشفير الرقم السري ──
// تعمل على Vercel Serverless. المفتاح السري يبقى في الخادم فقط.
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY          // مفتاح الخادم — لا يُكشف للمتصفح
);

// كلمة دخول القروب (تعطيها للشباب فقط)
export const GROUP_PASSWORD = process.env.GROUP_PASSWORD || "mos123";

// تشفير الرقم السري (PIN) — لا نخزّنه كنص صريح
export function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin) + "::f1salt").digest("hex");
}

// توكن جلسة بسيط موقّع — يربط اسم اللاعب بهويته
export function makeToken(playerId, name) {
  const body = `${playerId}.${name}`;
  const sig = crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_KEY)
                    .update(body).digest("hex").slice(0, 24);
  return Buffer.from(`${body}.${sig}`).toString("base64");
}

export function readToken(token) {
  try {
    const raw = Buffer.from(token, "base64").toString();
    const [id, name, sig] = raw.split(".");
    const expect = crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_KEY)
                         .update(`${id}.${name}`).digest("hex").slice(0, 24);
    if (sig !== expect) return null;
    return { id: parseInt(id), name };
  } catch { return null; }
}

export function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

// ── جلب كل الصفوف بالترقيم (يتجاوز حد 1000 صف الافتراضي في Supabase/PostgREST) ──
// مهم جدًا: بدون هذا، أي قراءة كاملة لجدول التوقعات تُقصّ عند 1000 صف،
// فتختفي توقعات اللاعبين الأحدث ولا تُحتسب نقاطها.
// الاستخدام: await selectAll("predictions", "*", q => q.eq("match_id", 5))
export async function selectAll(table, columns = "*", applyFilters) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    let q = db.from(table).select(columns).range(from, from + pageSize - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    const batch = data || [];
    all.push(...batch);
    if (batch.length < pageSize) break;   // آخر صفحة
    from += pageSize;
  }
  return all;
}
