// /api/predictors — (أدمن فقط) لكل مباراة: من توقّع (أسماء). لا يكشف قيم التوقعات، فقط المشاركة.
import { db, readToken, json } from "./_lib.js";

export default async function handler(req, res) {
  const token = req.method === "GET" ? req.query.token : req.body && req.body.token;
  const user = readToken(token || "");
  if (!user) return json(res, 401, { error: "جلسة غير صالحة" });
  const { data: me } = await db.from("players").select("is_admin").eq("id", user.id).single();
  if (!(me && me.is_admin)) return json(res, 403, { error: "للأدمن فقط" });

  const { data: players } = await db.from("players").select("id,name");
  const { data: preds } = await db.from("predictions").select("player_id,match_id");
  const predByMatch = {};
  for (const p of preds || []) (predByMatch[p.match_id] = predByMatch[p.match_id] || []).push(p.player_id);

  return json(res, 200, { players: players || [], predByMatch });
}
