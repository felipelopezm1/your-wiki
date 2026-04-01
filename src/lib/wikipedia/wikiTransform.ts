import type { WikiSummary } from "./wikipedia";
import type { BookEntry, ReactionStyleName } from "@/types";
import { REACTION_STYLES } from "@/types";

export function wikiSummaryToBookEntry(
  summary: WikiSummary,
  index: number,
): BookEntry {
  const themes = ["sky", "sage", "lavender", "slate", "amber", "cream", "rose"];
  const reactionStyle: ReactionStyleName =
    REACTION_STYLES[index % REACTION_STYLES.length];

  return {
    id: `wiki-${summary.title.toLowerCase().replace(/\s+/g, "-")}`,
    type: "wiki",
    title: summary.title,
    authorLabel: "Wikipedia",
    avatarUrl: summary.thumbnail?.source,
    coverTheme: themes[index % themes.length],
    spineLabel: summary.title,
    body: summary.extract,
    sourceLabel: "Wikipedia",
    sourceUrl: summary.content_urls.desktop.page,
    images: summary.thumbnail ? [summary.thumbnail.source] : [],
    reactionStyle,
    createdAt: new Date().toISOString(),
    isFeatured: false,
  };
}
