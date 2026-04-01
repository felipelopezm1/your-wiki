export type ReactionStyleName =
  | "whisper-fade"
  | "paper-ripple"
  | "ink-bloom"
  | "floating-annotation"
  | "memory-dust"
  | "typewriter-echo"
  | "warm-highlight"
  | "star-margin"
  | "folded-light"
  | "heartbeat-shift";

export const REACTION_STYLES: ReactionStyleName[] = [
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
];

export interface BookEntry {
  id: string;
  type: "friend" | "wiki";
  title: string;
  authorLabel: string;
  avatarUrl?: string;
  coverTheme: string;
  spineLabel: string;
  body: string;
  sourceLabel?: string;
  sourceUrl?: string;
  images: string[];
  reactionStyle: ReactionStyleName;
  createdAt: string;
  isFeatured: boolean;
}

export interface FriendMessageBook {
  id: string;
  type: "friend";
  contributorName: string;
  contributorImageUrl?: string;
  title: string;
  coverTheme: string;
  spineLabel: string;
  messageBody: string;
  createdAt: string;
  reactionStyle: ReactionStyleName;
  galleryImages: string[];
  isFeatured: boolean;
}

export interface WikiBook {
  id: string;
  type: "wiki";
  title: string;
  subtitle?: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  coverTheme: string;
  heroImage?: string;
  extractedSections?: Array<{ heading: string; body: string }>;
  reactionStyle: ReactionStyleName;
}

export type CoverTheme =
  | "cream"
  | "sage"
  | "lavender"
  | "sky"
  | "rose"
  | "amber"
  | "slate";

export const COVER_THEMES: Record<CoverTheme, { bg: string; text: string }> = {
  cream: { bg: "#F5F0E8", text: "#3D3529" },
  sage: { bg: "#E8EDE5", text: "#2D3B2A" },
  lavender: { bg: "#EDE8F5", text: "#352D45" },
  sky: { bg: "#E5EEF5", text: "#1E3A54" },
  rose: { bg: "#F5E8EC", text: "#54202D" },
  amber: { bg: "#F5EEE5", text: "#544220" },
  slate: { bg: "#EAEBEE", text: "#2A2D35" },
};
