import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing book id" });
  }

  try {
    const redis = Redis.fromEnv();
    const book = await redis.get(`weeeeki:book:${id}`);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.status(200).json({ book });
  } catch (err) {
    console.error("Failed to fetch book:", err);
    return res.status(500).json({ error: "Failed to load book" });
  }
}
