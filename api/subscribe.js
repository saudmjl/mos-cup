// /api/subscribe — حفظ/إلغاء اشتراك إشعارات اللاعب
import { db, readToken, json } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const { token, subscription, action } = req.body || {};
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة — سجّل دخول" });

  if (action === "unsubscribe") {
    if (subscription && subscription.endpoint)
      await db.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    return json(res, 200, { ok: true });
  }

  if (!subscription || !subscription.endpoint || !subscription.keys)
    return json(res, 400, { error: "اشتراك غير صالح" });

  await db.from("push_subscriptions").upsert(
    {
      player_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  return json(res, 200, { ok: true });
}
