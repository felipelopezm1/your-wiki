import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

const REACTION_STYLES = [
  "whisper-fade",
  "paper-ripple",
  "ink-bloom",
  "floating-annotation",
  "memory-dust",
  "typewriter-echo",
  "warm-highlight",
  "star-margin",
  "folded-light",
  "heartbeat-shift",
] as const;

function getRedis() {
  return Redis.fromEnv();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redis = getRedis();

  if (req.method === "GET") {
    try {
      const ids = await redis.zrange("weeeeki:books", 0, -1, { rev: true });
      if (!ids || ids.length === 0) {
        return res.status(200).json({ books: [] });
      }

      const pipeline = redis.pipeline();
      for (const id of ids) {
        pipeline.get(`weeeeki:book:${id}`);
      }
      const results = await pipeline.exec();
      const books = results.filter(Boolean);
      return res.status(200).json({ books });
    } catch (err) {
      console.error("Failed to list books:", err);
      return res.status(500).json({ error: "Failed to load books" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        contributorName,
        title,
        messageBody,
        coverTheme = "cream",
        avatarUrl,
        images = [],
      } = req.body;

      if (!contributorName || !title || !messageBody) {
        return res
          .status(400)
          .json({ error: "Name, title, and message are required" });
      }

      const id = nanoid(12);
      const now = new Date().toISOString();
      const reactionStyle =
        REACTION_STYLES[Math.floor(Math.random() * REACTION_STYLES.length)];

      const book = {
        id,
        type: "friend" as const,
        title,
        authorLabel: contributorName,
        avatarUrl: avatarUrl || undefined,
        coverTheme,
        spineLabel: contributorName,
        body: messageBody,
        sourceLabel: undefined,
        sourceUrl: undefined,
        images,
        reactionStyle,
        createdAt: now,
        isFeatured: false,
      };

      await redis.set(`weeeeki:book:${id}`, JSON.stringify(book));
      await redis.zadd("weeeeki:books", {
        score: Date.now(),
        member: id,
      });

      return res.status(201).json({ book });
    } catch (err) {
      console.error("Failed to create book:", err);
      return res.status(500).json({ error: "Failed to save message" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
