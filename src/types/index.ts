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
  | "burgundy"
  | "forest"
  | "navy"
  | "cognac"
  | "plum"
  | "moss"
  | "ivory"
  | "charcoal"
  | "cream"
  | "sage"
  | "lavender"
  | "sky"
  | "rose"
  | "amber"
  | "slate";

export const COVER_THEMES: Record<string, { bg: string; text: string }> = {
  burgundy: { bg: "#6B1D2A", text: "#F5E6C8" },
  forest: { bg: "#2D4A2D", text: "#E8DFC0" },
  navy: { bg: "#1E2D4A", text: "#D6CEB4" },
  cognac: { bg: "#8B5E3C", text: "#F8F0E0" },
  plum: { bg: "#5B2D5E", text: "#E8D8EA" },
  moss: { bg: "#4A5A3A", text: "#EDE8D8" },
  ivory: { bg: "#E8DEC8", text: "#3A3020" },
  charcoal: { bg: "#3A3A40", text: "#D8D0C0" },
  cream: { bg: "#F5F0E8", text: "#3D3529" },
  sage: { bg: "#E8EDE5", text: "#2D3B2A" },
  lavender: { bg: "#EDE8F5", text: "#352D45" },
  sky: { bg: "#E5EEF5", text: "#1E3A54" },
  rose: { bg: "#F5E8EC", text: "#54202D" },
  amber: { bg: "#F5EEE5", text: "#544220" },
  slate: { bg: "#EAEBEE", text: "#2A2D35" },
};
