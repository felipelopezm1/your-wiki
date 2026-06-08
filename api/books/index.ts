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

const WIKI_WORD_LIMIT = 620;

interface WikiSummary {
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

interface WikiExtractResponse {
  query?: {
    pages?: Record<string, { extract?: string }>;
  };
}

function getRedis() {
  return Redis.fromEnv();
}

function parseWikiUrl(url: string): { lang: string; title: string } | null {
  try {
    const parsed = new URL(url);
    const hostMatch = parsed.hostname.match(/^(\w+)\.wikipedia\.org$/);
    if (!hostMatch) return null;
    const lang = hostMatch[1];
    const pathMatch = parsed.pathname.match(/^\/wiki\/(.+)$/);
    if (!pathMatch) return null;
    return { lang, title: decodeURIComponent(pathMatch[1]) };
  } catch {
    return null;
  }
}

function cleanWikiExtract(text: string): string {
  const stopHeadings = new Set([
    "véase también",
    "referencias",
    "bibliografía",
    "enlaces externos",
    "notas",
    "fuentes",
  ]);
  const lines = text
    .replace(/\u200b/g, "")
    .replace(/\[\d+\]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const kept: string[] = [];
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/=+/g, "").trim();
    if (stopHeadings.has(normalized)) break;
    if (/^=+.*=+$/.test(line)) continue;
    kept.push(line);
  }

  return kept.join("\n\n").replace(/\s+([,.;:])/g, "$1");
}

function trimToWords(text: string, maxWords = WIKI_WORD_LIMIT): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

async function fetchWikiArticle(lang: string, articleTitle: string): Promise<{
  summary: WikiSummary;
  fullExtract: string;
}> {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, "_"));
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  const wikiRes = await fetch(summaryUrl, {
    headers: { "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)" },
  });
  if (!wikiRes.ok) {
    throw new Error(`Wikipedia summary returned ${wikiRes.status}`);
  }

  const summary = (await wikiRes.json()) as WikiSummary;
  const extractParams = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    exsectionformat: "plain",
    redirects: "1",
    format: "json",
    titles: articleTitle.replace(/ /g, "_"),
  });
  const extractUrl = `https://${lang}.wikipedia.org/w/api.php?${extractParams.toString()}`;
  const extractRes = await fetch(extractUrl, {
    headers: { "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)" },
  });

  if (!extractRes.ok) {
    return { summary, fullExtract: summary.extract ?? "" };
  }

  const extractData = (await extractRes.json()) as WikiExtractResponse;
  const page = Object.values(extractData.query?.pages ?? {})[0];
  const fullExtract = page?.extract ? trimToWords(cleanWikiExtract(page.extract)) : summary.extract ?? "";

  return { summary, fullExtract };
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
      const books = results.filter(Boolean).map((entry) => {
        const obj = typeof entry === "string" ? JSON.parse(entry) : entry;
        if (obj && typeof obj === "object") {
          delete (obj as Record<string, unknown>).editToken;
        }
        return obj;
      });
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
        wikiUrl,
        coverTheme = "cream",
        avatarUrl,
        images = [],
        galleryImages = [],
      } = req.body;

      if (!contributorName || !title || !messageBody) {
        return res
          .status(400)
          .json({ error: "Name, title, and message are required" });
      }

      const id = nanoid(12);
      const editToken = nanoid(24);
      const now = new Date().toISOString();
      const reactionStyle =
        REACTION_STYLES[Math.floor(Math.random() * REACTION_STYLES.length)];

      let bookBody = messageBody;
      let bookTitle = title;
      let sourceUrl: string | undefined;
      let sourceLabel: string | undefined;
      let bookImages: string[] = images;
      const personalImages = Array.isArray(galleryImages) ? galleryImages.slice(0, 8) : [];
      let bookType: "friend" | "wiki" = "friend";

      if (wikiUrl && typeof wikiUrl === "string") {
        const parsed = parseWikiUrl(wikiUrl);
        if (parsed) {
          const { lang, title: articleTitle } = parsed;
          try {
            const { summary, fullExtract } = await fetchWikiArticle(lang, articleTitle);
            bookBody = fullExtract || summary.extract || messageBody;
            bookTitle = summary.title || title;
            sourceUrl = summary.content_urls?.desktop?.page || wikiUrl;
            sourceLabel = `Wikipedia (${lang})`;
            bookType = "wiki";
            if (summary.thumbnail?.source) {
              bookImages = [summary.thumbnail.source, ...images];
            }
          } catch (err) {
            console.error("Failed to enrich Wikipedia book:", err);
          }
        }
      }

      const book = {
        id,
        type: bookType,
        title: bookTitle,
        authorLabel: contributorName,
        avatarUrl: avatarUrl || undefined,
        coverTheme,
        spineLabel: contributorName,
        body: bookBody,
        sourceLabel,
        sourceUrl,
        images: bookImages,
        galleryImages: personalImages,
        reactionStyle,
        createdAt: now,
        isFeatured: false,
        senderName: contributorName,
        senderMessage: messageBody,
        editToken,
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

  if (req.method === "PUT") {
    try {
      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: "Missing book id" });
      }

      const raw = await redis.get(`weeeeki:book:${id}`);
      if (!raw) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const existing = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;

      const { editToken } = req.body;
      if (!existing.editToken || existing.editToken !== editToken) {
        return res
          .status(403)
          .json({ error: "You don't have permission to edit this entry" });
      }

      const {
        contributorName,
        title,
        messageBody,
        wikiUrl,
        coverTheme,
        avatarUrl,
        galleryImages,
      } = req.body;

      let bookBody = messageBody ?? (existing.body as string);
      let bookTitle = title ?? (existing.title as string);
      let sourceUrl = existing.sourceUrl as string | undefined;
      let sourceLabel = existing.sourceLabel as string | undefined;
      let bookType = existing.type as "friend" | "wiki";
      let bookImages = (existing.images as string[]) ?? [];

      if (wikiUrl && typeof wikiUrl === "string") {
        const parsed = parseWikiUrl(wikiUrl);
        if (parsed) {
          try {
            const { summary, fullExtract } = await fetchWikiArticle(parsed.lang, parsed.title);
            bookBody = fullExtract || summary.extract || (messageBody ?? (existing.body as string));
            bookTitle = summary.title || bookTitle;
            sourceUrl = summary.content_urls?.desktop?.page || wikiUrl;
            sourceLabel = `Wikipedia (${parsed.lang})`;
            bookType = "wiki";
            if (summary.thumbnail?.source) {
              bookImages = [summary.thumbnail.source];
            }
          } catch (err) {
            console.error("Failed to refresh Wikipedia content on edit:", err);
          }
        }
      } else if (bookType === "friend") {
        bookBody = messageBody ?? (existing.body as string);
      }

      const personalImages = Array.isArray(galleryImages)
        ? galleryImages.slice(0, 8)
        : existing.galleryImages;

      const updated = {
        ...existing,
        title: bookTitle,
        authorLabel: contributorName ?? existing.authorLabel,
        avatarUrl:
          avatarUrl !== undefined ? avatarUrl || undefined : existing.avatarUrl,
        coverTheme: coverTheme ?? existing.coverTheme,
        spineLabel: contributorName ?? existing.spineLabel,
        body: bookBody,
        sourceLabel,
        sourceUrl,
        type: bookType,
        images: bookImages,
        galleryImages: personalImages,
        senderName: contributorName ?? existing.senderName,
        senderMessage: messageBody ?? existing.senderMessage,
        updatedAt: new Date().toISOString(),
      };

      await redis.set(`weeeeki:book:${id}`, JSON.stringify(updated));

      return res.status(200).json({ book: updated });
    } catch (err) {
      console.error("Failed to update book:", err);
      return res.status(500).json({ error: "Failed to update entry" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
