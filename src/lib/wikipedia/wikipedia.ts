import type { BookEntry, ReactionStyleName } from "@/types";
import { REACTION_STYLES } from "@/types";

export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls: {
    desktop: { page: string };
  };
}

const API_BASE = "https://en.wikipedia.org/api/rest_v1";

export async function fetchWikiSummary(
  title: string,
): Promise<WikiSummary | null> {
  try {
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(`${API_BASE}/page/summary/${encoded}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const THEMES = ["sky", "sage", "lavender", "slate", "amber", "cream", "rose"];

export const SEED_TOPICS = [
  "Friendship",
  "Memory",
  "Star",
  "London",
  "Mycology",
  "Cookbook",
  "Robot",
  "Constellation",
  "Flower",
  "Joke",
] as const;

export async function fetchAndSeedWikiBooks(): Promise<BookEntry[]> {
  const books: BookEntry[] = [];
  const topics = SEED_TOPICS.slice(0, 6);

  const results = await Promise.allSettled(
    topics.map((topic) => fetchWikiSummary(topic))
  );

  results.forEach((result, i) => {
    if (result.status !== "fulfilled" || !result.value) return;
    const summary = result.value;
    const reactionStyle: ReactionStyleName =
      REACTION_STYLES[i % REACTION_STYLES.length];

    books.push({
      id: `wiki-live-${summary.title.toLowerCase().replace(/\s+/g, "-")}`,
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
      reactionStyle,
      createdAt: new Date().toISOString(),
      isFeatured: false,
    });
  });

  return books;
}
