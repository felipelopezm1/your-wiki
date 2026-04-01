import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  prepareMessage,
  layoutMessage,
} from "@/lib/pretext/prepareMessageText";
import type { ReactionStyleName } from "@/types";

interface PretextBlockProps {
  text: string;
  reactionStyle: ReactionStyleName;
  font?: string;
  lineHeight?: number;
  className?: string;
}

interface CharData {
  char: string;
  lineIndex: number;
  charIndex: number;
  x: number;
  y: number;
}

export function PretextBlock({
  text,
  reactionStyle,
  font = '16px "Merriweather", Georgia, serif',
  lineHeight = 28,
  className = "",
}: PretextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chars, setChars] = useState<CharData[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [prepared] = useState(() => prepareMessage(text, font));
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const charEls = useRef<(HTMLSpanElement | null)[]>([]);

  const doLayout = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width <= 0) return;
    const result = layoutMessage(prepared, width, lineHeight);
    setContainerHeight(result.height);

    // Build per-character position data using canvas measurement
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = font;

    const allChars: CharData[] = [];
    result.lines.forEach((line, lineIdx) => {
      let xOffset = 0;
      for (let ci = 0; ci < line.text.length; ci++) {
        const ch = line.text[ci];
        allChars.push({
          char: ch,
          lineIndex: lineIdx,
          charIndex: ci,
          x: xOffset,
          y: lineIdx * lineHeight,
        });
        xOffset += ctx.measureText(ch).width;
      }
    });

    setChars(allChars);
    charEls.current = new Array(allChars.length).fill(null);
  }, [prepared, lineHeight, font]);

  useEffect(() => {
    doLayout();
    const observer = new ResizeObserver(() => doLayout());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [doLayout]);

  // Cursor tracking via RAF for smooth 60fps updates
  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    cursorRef.current.x = -9999;
    cursorRef.current.y = -9999;
  }, []);

  // Animation loop for cursor-reactive effects
  useEffect(() => {
    const animate = () => {
      const cx = cursorRef.current.x;
      const cy = cursorRef.current.y;
      const isActive = cx > -9000;

      for (let i = 0; i < charEls.current.length; i++) {
        const el = charEls.current[i];
        if (!el) continue;
        const cd = chars[i];
        if (!cd) continue;

        if (!isActive) {
          el.style.transform = "";
          el.style.opacity = "";
          el.style.filter = "";
          continue;
        }

        const dx = cx - (cd.x + 4);
        const dy = cy - (cd.y + lineHeight / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        applyReactionEffect(el, reactionStyle, dist, dx, dy, cd, lineHeight);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    if (chars.length > 0) {
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [chars, reactionStyle, lineHeight]);

  return (
    <div
      ref={containerRef}
      className={`relative select-text cursor-default ${className}`}
      style={{ height: containerHeight || "auto", lineHeight: `${lineHeight}px` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {chars.map((cd, i) => (
        <span
          key={`${cd.lineIndex}-${cd.charIndex}`}
          ref={(el) => {
            charEls.current[i] = el;
          }}
          className="absolute transition-none will-change-transform"
          style={{
            left: cd.x,
            top: cd.y,
            height: lineHeight,
            lineHeight: `${lineHeight}px`,
            display: "inline-block",
            fontFamily: '"Merriweather", Georgia, serif',
            fontSize: "16px",
            whiteSpace: "pre",
          }}
        >
          {cd.char}
        </span>
      ))}
    </div>
  );
}

const RADIUS = 120;
const INNER = 30;

function applyReactionEffect(
  el: HTMLSpanElement,
  style: ReactionStyleName,
  dist: number,
  dx: number,
  dy: number,
  _cd: CharData,
  lineHeight: number
) {
  const t = Math.max(0, 1 - dist / RADIUS);
  const tInner = Math.max(0, 1 - dist / INNER);

  switch (style) {
    // Inspired by Typexperiments cursor-reactive lava text
    case "whisper-fade": {
      const opacity = 0.4 + t * 0.6;
      const brightness = 1 + t * 0.15;
      el.style.opacity = String(opacity);
      el.style.filter = `brightness(${brightness})`;
      el.style.transform = `translateY(${-t * 2}px)`;
      break;
    }

    // Inspired by Cocktail Peanut - characters ripple away from cursor
    case "paper-ripple": {
      if (dist < RADIUS) {
        const angle = Math.atan2(dy, dx);
        const push = t * 4;
        el.style.transform = `translate(${Math.cos(angle) * push}px, ${Math.sin(angle) * push}px)`;
      } else {
        el.style.transform = "";
      }
      el.style.opacity = "";
      break;
    }

    // Inspired by Pretext Explosive - ink spreads/blooms outward
    case "ink-bloom": {
      const spread = t * 3;
      const angle = Math.atan2(dy, dx);
      el.style.transform = `translate(${-Math.cos(angle) * spread}px, ${-Math.sin(angle) * spread}px) scale(${1 + tInner * 0.15})`;
      el.style.textShadow = t > 0.1
        ? `0 0 ${t * 8}px rgba(26,26,26,${t * 0.3})`
        : "none";
      break;
    }

    // Inspired by Editorial Engine - annotation marks appear
    case "floating-annotation": {
      el.style.transform = `translateY(${-t * 3}px)`;
      if (tInner > 0.3 && _cd.char === " ") {
        el.style.opacity = "1";
        el.textContent = "\u2022";
        el.style.color = "var(--color-accent-warm)";
        el.style.fontSize = "10px";
      } else {
        el.textContent = _cd.char;
        el.style.color = "";
        el.style.fontSize = "";
      }
      break;
    }

    // Inspired by Bookworms - characters drift upward like dust
    case "memory-dust": {
      const rise = t * 6;
      const wobble = Math.sin((_cd.charIndex + Date.now() * 0.003) * 2) * t * 2;
      el.style.transform = `translate(${wobble}px, ${-rise}px)`;
      el.style.opacity = String(0.5 + t * 0.5);
      break;
    }

    // Typewriter ghost echo offset
    case "typewriter-echo": {
      el.style.transform = t > 0.1
        ? `translate(${t * 2}px, ${t * 1.5}px)`
        : "";
      el.style.opacity = String(1 - t * 0.3);
      el.style.textShadow = t > 0.1
        ? `${-t * 3}px ${-t * 2}px 0 rgba(26,26,26,${t * 0.15})`
        : "none";
      break;
    }

    // Warm marker highlight sweep following cursor
    case "warm-highlight": {
      if (t > 0.05) {
        el.style.backgroundColor = `rgba(255, 243, 200, ${t * 0.6})`;
        el.style.borderRadius = "2px";
      } else {
        el.style.backgroundColor = "";
      }
      el.style.transform = "";
      break;
    }

    // Stars/sparks appear near cursor in margin
    case "star-margin": {
      if (tInner > 0.2 && _cd.charIndex === 0) {
        el.style.transform = `translateX(-16px) scale(${0.5 + tInner * 0.5})`;
        el.textContent = "\u2726";
        el.style.color = "var(--color-accent-warm)";
        el.style.opacity = String(tInner);
      } else {
        el.textContent = _cd.char;
        el.style.color = "";
        el.style.opacity = "";
        el.style.transform = t > 0.1 ? `translateY(${-t * 1}px)` : "";
      }
      break;
    }

    // Cursor-following light reflection band
    case "folded-light": {
      const lightIntensity = Math.max(0, 1 - Math.abs(dx) / 80);
      if (lightIntensity > 0.05 && Math.abs(dy) < lineHeight) {
        el.style.color = `rgba(26,26,26,${0.6 + lightIntensity * 0.4})`;
        el.style.textShadow = `0 0 ${lightIntensity * 4}px rgba(200,180,140,${lightIntensity * 0.4})`;
        el.style.transform = `scaleY(${1 + lightIntensity * 0.05})`;
      } else {
        el.style.color = "";
        el.style.textShadow = "none";
        el.style.transform = "";
      }
      break;
    }

    // Characters pulse with scale based on cursor proximity
    case "heartbeat-shift": {
      const pulse = Math.sin(Date.now() * 0.006 + _cd.charIndex * 0.3) * 0.5 + 0.5;
      const scale = 1 + tInner * 0.12 * pulse;
      el.style.transform = t > 0.05 ? `scale(${scale})` : "";
      el.style.transformOrigin = "center bottom";
      break;
    }
  }
}
