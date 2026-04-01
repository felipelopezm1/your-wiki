import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const SEED_TOPICS = [
  "Friendship",
  "Memory",
  "Stars",
  "London",
  "Mycology",
  "Cookbook",
  "Joke",
  "Robot",
  "Constellation",
  "Flower",
];

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

const THEMES = ["sky", "sage", "lavender", "slate", "amber", "cream", "rose"];

interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const redis = Redis.fromEnv();
  const seeded: string[] = [];

  for (let i = 0; i < SEED_TOPICS.length; i++) {
    const topic = SEED_TOPICS[i];
    const encoded = encodeURIComponent(topic.replace(/ /g, "_"));

    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        {
          headers: {
            "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)",
          },
        },
      );

      if (!wikiRes.ok) continue;
      const summary: WikiSummary = await wikiRes.json();

      const id = `wiki-${topic.toLowerCase().replace(/\s+/g, "-")}`;
      const book = {
        id,
        type: "wiki",
        title: summary.title,
        authorLabel: "Wikipedia",
        avatarUrl: summary.thumbnail?.source,
        coverTheme: THEMES[i % THEMES.length],
        spineLabel: summary.title,
        body: summary.extract,
        sourceLabel: "Wikipedia",
        sourceUrl: summary.content_urls.desktop.page,
        images: summary.thumbnail ? [summary.thumbnail.source] : [],
        reactionStyle: REACTION_STYLES[i % REACTION_STYLES.length],
        createdAt: new Date().toISOString(),
        isFeatured: false,
      };

      await redis.set(`weeeeki:book:${id}`, JSON.stringify(book));
      await redis.zadd("weeeeki:books", { score: Date.now() - i, member: id });
      seeded.push(topic);
    } catch (err) {
      console.error(`Failed to seed ${topic}:`, err);
    }
  }

  return res.status(200).json({ seeded, count: seeded.length });
}
