import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const REACTION_STYLES = [
  "whisper-fade", "paper-ripple", "ink-bloom", "floating-annotation",
  "memory-dust", "typewriter-echo", "warm-highlight", "star-margin",
  "folded-light", "heartbeat-shift",
] as const;

const THEMES = [
  "burgundy", "forest", "navy", "cognac", "plum",
  "moss", "ivory", "charcoal", "sky", "sage",
  "lavender", "slate", "amber", "cream", "rose",
];

const WIKI_WORD_LIMIT = 620;

interface WikiSummary {
  title: string;
  extract?: string;
  description?: string;
  thumbnail?: { source: string };
  content_urls: { desktop: { page: string } };
}

interface WikiExtractResponse {
  query?: {
    pages?: Record<string, { extract?: string }>;
  };
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

async function fetchWikiExtract(lang: string, title: string): Promise<string> {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    exsectionformat: "plain",
    redirects: "1",
    format: "json",
    titles: title.replace(/ /g, "_"),
  });
  const extractRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)" },
  });
  if (!extractRes.ok) return "";

  const extractData = (await extractRes.json()) as WikiExtractResponse;
  const page = Object.values(extractData.query?.pages ?? {})[0];
  return page?.extract ? trimToWords(cleanWikiExtract(page.extract)) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing 'url' field. Provide a Wikipedia article URL." });
  }

  const parsed = parseWikiUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid Wikipedia URL. Expected format: https://{lang}.wikipedia.org/wiki/{Article}" });
  }

  const { lang, title } = parsed;
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  let summary: WikiSummary;
  let fullExtract = "";
  try {
    const wikiRes = await fetch(apiUrl, {
      headers: { "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)" },
    });
    if (!wikiRes.ok) {
      return res.status(502).json({ error: `Wikipedia API returned ${wikiRes.status}`, apiUrl });
    }
    summary = await wikiRes.json();
    fullExtract = await fetchWikiExtract(lang, title);
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch from Wikipedia API", detail: String(err) });
  }

  const redis = Redis.fromEnv();

  const existingIds = await redis.zrange("weeeeki:books", 0, -1);
  const bookIndex = existingIds.length;

  const id = `wiki-${lang}-${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  const book = {
    id,
    type: "wiki",
    title: summary.title,
    authorLabel: `Wikipedia (${lang})`,
    avatarUrl: summary.thumbnail?.source,
    coverTheme: THEMES[bookIndex % THEMES.length],
    spineLabel: summary.title.length > 18 ? summary.title.substring(0, 18) + "\u2026" : summary.title,
    body: fullExtract || summary.extract || "",
    sourceLabel: `Wikipedia (${lang})`,
    sourceUrl: summary.content_urls?.desktop?.page || url,
    images: summary.thumbnail ? [summary.thumbnail.source] : [],
    reactionStyle: REACTION_STYLES[bookIndex % REACTION_STYLES.length],
    createdAt: new Date().toISOString(),
    isFeatured: false,
  };

  await redis.set(`weeeeki:book:${id}`, JSON.stringify(book));
  await redis.zadd("weeeeki:books", { score: Date.now(), member: id });

  return res.status(201).json({
    message: `Added "${summary.title}" from ${lang}.wikipedia.org`,
    book,
  });
}
