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
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`${API_BASE}/page/summary/${encoded}`, {
    headers: { "Api-User-Agent": "Weeeeki/1.0 (contact@weeeeki.app)" },
  });
  if (!res.ok) return null;
  return res.json();
}

export const SEED_TOPICS = [
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
] as const;
