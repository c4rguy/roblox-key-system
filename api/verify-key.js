import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: "Missing key" });

  const ip = await redis.get(`ip:${key}`);

  if (!ip) {
    const isLifetime = await redis.get(`lifetime:${key}`);
    if (isLifetime) {
      return res.status(200).json({
        key,
        cooldownSecondsLeft: -1,
        lifetime: true,
      });
    }
    return res.status(404).json({ error: "Key not found or expired" });
  }

  const ttl = await redis.ttl(`key:${ip}`);
  if (ttl <= 0) {
    return res.status(404).json({ error: "Cooldown expired" });
  }

  return res.status(200).json({
    key,
    cooldownSecondsLeft: ttl,
  });
}
