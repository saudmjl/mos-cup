// أداة إرسال إشعارات Web Push (VAPID)
import webpush from "web-push";

let configured = false;
function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:mos@worldcup.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// يرسل إشعارًا لاشتراك واحد. يعيد {ok} أو {ok:false, gone} عند انتهاء الاشتراك.
export async function sendPush(sub, payload) {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (e) {
    const code = e && e.statusCode;
    return { ok: false, gone: code === 404 || code === 410, code };
  }
}
