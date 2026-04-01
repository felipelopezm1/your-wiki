import type { ReactionStyleName } from "@/types";

export interface ReactionStyleConfig {
  name: ReactionStyleName;
  label: string;
  lineClassName: string;
  containerClassName: string;
  css: string;
}

export const reactionStyleMap: Record<ReactionStyleName, ReactionStyleConfig> = {
  "whisper-fade": {
    name: "whisper-fade",
    label: "Whisper Fade",
    lineClassName: "reaction-whisper-fade",
    containerClassName: "",
    css: `
      .reaction-whisper-fade {
        opacity: 0.75;
        transition: opacity 0.4s ease, filter 0.4s ease;
      }
      .reaction-whisper-fade:hover {
        opacity: 1;
        filter: brightness(1.05);
      }
    `,
  },
  "paper-ripple": {
    name: "paper-ripple",
    label: "Paper Ripple",
    lineClassName: "reaction-paper-ripple",
    containerClassName: "reaction-paper-ripple-container",
    css: `
      .reaction-paper-ripple {
        transition: transform 0.3s ease;
      }
      .reaction-paper-ripple-container:hover .reaction-paper-ripple {
        animation: ripple-wave 0.6s ease forwards;
      }
      @keyframes ripple-wave {
        0% { transform: translateY(0); }
        25% { transform: translateY(-2px); }
        50% { transform: translateY(1px); }
        75% { transform: translateY(-1px); }
        100% { transform: translateY(0); }
      }
    `,
  },
  "ink-bloom": {
    name: "ink-bloom",
    label: "Ink Bloom",
    lineClassName: "reaction-ink-bloom",
    containerClassName: "",
    css: `
      .reaction-ink-bloom {
        text-shadow: 0 0 0 transparent;
        transition: text-shadow 0.4s ease;
      }
      .reaction-ink-bloom:hover {
        text-shadow: 0 0 8px rgba(26, 26, 26, 0.15), 0 0 2px rgba(26, 26, 26, 0.1);
      }
    `,
  },
  "floating-annotation": {
    name: "floating-annotation",
    label: "Floating Annotation",
    lineClassName: "reaction-floating-annotation",
    containerClassName: "",
    css: `
      .reaction-floating-annotation {
        position: relative;
      }
      .reaction-floating-annotation::after {
        content: "\\2022";
        position: absolute;
        right: -16px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        color: var(--color-accent);
        font-size: 10px;
        transition: opacity 0.3s ease;
      }
      .reaction-floating-annotation:hover::after {
        opacity: 0.6;
      }
    `,
  },
  "memory-dust": {
    name: "memory-dust",
    label: "Memory Dust",
    lineClassName: "reaction-memory-dust",
    containerClassName: "reaction-memory-dust-container",
    css: `
      .reaction-memory-dust-container {
        position: relative;
      }
      .reaction-memory-dust-container::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, var(--color-accent-warm) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0;
        transition: opacity 0.5s ease;
        pointer-events: none;
        animation: dust-drift 3s ease infinite;
      }
      .reaction-memory-dust-container:hover::before {
        opacity: 0.15;
      }
      @keyframes dust-drift {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `,
  },
  "typewriter-echo": {
    name: "typewriter-echo",
    label: "Typewriter Echo",
    lineClassName: "reaction-typewriter-echo",
    containerClassName: "",
    css: `
      .reaction-typewriter-echo {
        position: relative;
      }
      .reaction-typewriter-echo::before {
        content: attr(data-text);
        position: absolute;
        top: 2px;
        left: 2px;
        opacity: 0;
        color: var(--color-ink-faint);
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .reaction-typewriter-echo:hover::before {
        opacity: 0.2;
      }
    `,
  },
  "warm-highlight": {
    name: "warm-highlight",
    label: "Warm Highlight",
    lineClassName: "reaction-warm-highlight",
    containerClassName: "",
    css: `
      .reaction-warm-highlight {
        background: linear-gradient(90deg, transparent 0%, rgba(255, 243, 200, 0.5) 50%, transparent 100%);
        background-size: 200% 100%;
        background-position: -100% 0;
        transition: background-position 0.5s ease;
      }
      .reaction-warm-highlight:hover {
        background-position: 100% 0;
      }
    `,
  },
  "star-margin": {
    name: "star-margin",
    label: "Star Margin",
    lineClassName: "reaction-star-margin",
    containerClassName: "",
    css: `
      .reaction-star-margin {
        position: relative;
      }
      .reaction-star-margin::before {
        content: "\\2726";
        position: absolute;
        left: -20px;
        top: 50%;
        transform: translateY(-50%) scale(0);
        opacity: 0;
        color: var(--color-accent-warm);
        font-size: 10px;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .reaction-star-margin:hover::before {
        opacity: 0.7;
        transform: translateY(-50%) scale(1);
      }
    `,
  },
  "folded-light": {
    name: "folded-light",
    label: "Folded Light",
    lineClassName: "reaction-folded-light",
    containerClassName: "",
    css: `
      .reaction-folded-light {
        position: relative;
        overflow: hidden;
      }
      .reaction-folded-light::after {
        content: "";
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.6s ease;
        pointer-events: none;
      }
      .reaction-folded-light:hover::after {
        left: 120%;
      }
    `,
  },
  "heartbeat-shift": {
    name: "heartbeat-shift",
    label: "Heartbeat Shift",
    lineClassName: "reaction-heartbeat-shift",
    containerClassName: "",
    css: `
      .reaction-heartbeat-shift {
        display: inline-block;
        transition: transform 0.2s ease;
      }
      .reaction-heartbeat-shift:hover {
        animation: heartbeat-pulse 0.6s ease;
      }
      @keyframes heartbeat-pulse {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.02); }
        50% { transform: scale(0.99); }
        75% { transform: scale(1.01); }
      }
      @media (prefers-reduced-motion: reduce) {
        .reaction-heartbeat-shift:hover {
          animation: none;
        }
      }
    `,
  },
};

export function getReactionStyle(name: ReactionStyleName): ReactionStyleConfig {
  return reactionStyleMap[name];
}

export function getAllReactionCSS(): string {
  return Object.values(reactionStyleMap)
    .map((s) => s.css)
    .join("\n");
}
