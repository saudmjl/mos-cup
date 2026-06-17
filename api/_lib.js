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
