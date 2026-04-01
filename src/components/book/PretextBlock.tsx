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
  effectsEnabled?: boolean;
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
  effectsEnabled = true,
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
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = font;
    const allChars: CharData[] = [];
    result.lines.forEach((line, lineIdx) => {
      let xOffset = 0;
      for (let ci = 0; ci < line.text.length; ci++) {
        const ch = line.text[ci];
        allChars.push({ char: ch, lineIndex: lineIdx, charIndex: ci, x: xOffset, y: lineIdx * lineHeight });
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

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!effectsEnabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    cursorRef.current.x = e.clientX - rect.left;
    cursorRef.current.y = e.clientY - rect.top;
  }, [effectsEnabled]);

  const handleMouseLeave = useCallback(() => {
    cursorRef.current.x = -9999;
    cursorRef.current.y = -9999;
  }, []);

  useEffect(() => {
    if (!effectsEnabled) {
      for (const el of charEls.current) {
        if (!el) continue;
        el.style.transform = "";
        el.style.opacity = "";
        el.style.filter = "";
        el.style.textShadow = "none";
        el.style.backgroundColor = "";
        el.style.color = "";
      }
      return;
    }

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
          el.style.textShadow = "none";
          el.style.backgroundColor = "";
          el.style.color = "";
          continue;
        }

        const dx = cx - (cd.x + 4);
        const dy = cy - (cd.y + lineHeight / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        applyEffect(el, reactionStyle, dist, dx, dy, cd, lineHeight);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    if (chars.length > 0) {
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [chars, reactionStyle, lineHeight, effectsEnabled]);

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
          ref={(el) => { charEls.current[i] = el; }}
          className="absolute will-change-transform"
          style={{
            left: cd.x,
            top: cd.y,
            height: lineHeight,
            lineHeight: `${lineHeight}px`,
            display: "inline-block",
            fontFamily: '"Merriweather", Georgia, serif',
            fontSize: "16px",
            whiteSpace: "pre",
            transition: "none",
          }}
        >
          {cd.char}
        </span>
      ))}
    </div>
  );
}

// ---------- CRAZY EFFECTS ----------
const R = 250;
const INNER = 80;

function applyEffect(
  el: HTMLSpanElement,
  style: ReactionStyleName,
  dist: number,
  dx: number,
  dy: number,
  cd: CharData,
  lh: number
) {
  const t = Math.max(0, 1 - dist / R);
  const ti = Math.max(0, 1 - dist / INNER);
  const now = Date.now();

  switch (style) {
    // SMOKE RISE: chars lift, blur, and dissolve like rising smoke
    case "whisper-fade": {
      const rise = t * 30;
      const drift = Math.sin(cd.charIndex * 0.7 + now * 0.004) * t * 18;
      const opacity = 1 - t * 0.8;
      const blur = t * 3;
      el.style.transform = `translate(${drift}px, ${-rise}px) scale(${1 + t * 0.4}) rotate(${drift * 0.8}deg)`;
      el.style.opacity = String(opacity);
      el.style.filter = `blur(${blur}px)`;
      el.style.textShadow = `0 ${-t * 8}px ${t * 15}px rgba(26,26,26,${t * 0.3})`;
      break;
    }

    // EXPLOSIVE SHOCKWAVE: chars blast outward with spin
    case "paper-ripple": {
      if (t > 0.01) {
        const angle = Math.atan2(dy, dx);
        const force = t * t * 45;
        const spin = t * 60 * (cd.charIndex % 2 === 0 ? 1 : -1);
        el.style.transform = `translate(${Math.cos(angle) * force}px, ${Math.sin(angle) * force}px) rotate(${spin}deg) scale(${1 + ti * 0.5})`;
        el.style.opacity = String(1 - t * 0.4);
        el.style.textShadow = `0 0 ${t * 12}px rgba(200,150,80,${t * 0.5})`;
      } else {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.textShadow = "none";
      }
      break;
    }

    // INK SUPERNOVA: chars grow huge with glowing halos
    case "ink-bloom": {
      const scale = 1 + ti * 0.8;
      const angle = Math.atan2(dy, dx);
      const spread = t * 10;
      el.style.transform = `translate(${-Math.cos(angle) * spread}px, ${-Math.sin(angle) * spread}px) scale(${scale})`;
      el.style.textShadow = t > 0.05
        ? `0 0 ${t * 20}px rgba(26,26,26,${t * 0.5}), 0 0 ${t * 40}px rgba(100,60,20,${t * 0.3}), 0 0 ${t * 60}px rgba(200,150,50,${t * 0.15})`
        : "none";
      el.style.color = ti > 0.3 ? `rgb(${80 + ti * 120}, ${40 + ti * 40}, ${20})` : "";
      break;
    }

    // DANCING ANNOTATIONS: chars bounce and symbols burst out
    case "floating-annotation": {
      const bounce = Math.sin(now * 0.008 + cd.charIndex * 0.5) * t * 12;
      const sway = Math.cos(now * 0.006 + cd.charIndex * 0.3) * t * 6;
      el.style.transform = `translate(${sway}px, ${bounce - t * 8}px) rotate(${sway * 1.5}deg)`;
      el.style.textShadow = t > 0.2
        ? `${t * 4}px ${-t * 6}px ${t * 8}px rgba(180,120,50,${t * 0.4})`
        : "none";
      el.style.color = ti > 0.5 ? "#8B5E3C" : "";
      break;
    }

    // DISINTEGRATION: chars spiral upward and scatter like ashes
    case "memory-dust": {
      const spiral = t * 35;
      const angle2 = (cd.charIndex * 0.8 + now * 0.003) * 1.5;
      const sx = Math.cos(angle2) * spiral * 0.6;
      const sy = -spiral + Math.sin(angle2) * spiral * 0.3;
      const rot = t * 90 * Math.sin(cd.charIndex);
      el.style.transform = `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${1 - t * 0.5})`;
      el.style.opacity = String(1 - t * 0.7);
      el.style.filter = `blur(${t * 2.5}px)`;
      el.style.textShadow = `0 0 ${t * 10}px rgba(255,200,100,${t * 0.4})`;
      break;
    }

    // CASCADING GHOSTS: multiple trailing echoes
    case "typewriter-echo": {
      const layers = Math.floor(ti * 4);
      const offsetX = t * 6;
      const offsetY = t * 4;
      el.style.transform = `translate(${offsetX}px, ${offsetY}px) skewX(${t * -8}deg)`;
      el.style.opacity = String(1 - t * 0.2);
      const shadows = [];
      for (let l = 1; l <= Math.max(1, layers); l++) {
        shadows.push(`${-l * t * 5}px ${-l * t * 3}px 0 rgba(26,26,26,${(t * 0.2) / l})`);
      }
      el.style.textShadow = shadows.join(", ");
      break;
    }

    // BLAZING FIRE: golden fire glow that warps text
    case "warm-highlight": {
      if (t > 0.02) {
        const flicker = 0.8 + Math.sin(now * 0.01 + cd.charIndex * 0.5) * 0.2;
        const intensity = t * flicker;
        el.style.backgroundColor = `rgba(255, 220, 100, ${intensity * 0.5})`;
        el.style.transform = `translateY(${-t * 4 * flicker}px) scaleY(${1 + t * 0.15})`;
        el.style.textShadow = `0 0 ${intensity * 15}px rgba(255,180,50,${intensity * 0.6}), 0 ${-intensity * 8}px ${intensity * 20}px rgba(255,100,20,${intensity * 0.3})`;
        el.style.color = ti > 0.3 ? `rgb(${140 + ti * 60}, ${60 + ti * 30}, ${10})` : "";
      } else {
        el.style.backgroundColor = "";
        el.style.transform = "";
        el.style.textShadow = "none";
        el.style.color = "";
      }
      break;
    }

    // STAR EXPLOSION: chars rotate and scale with sparkle glow
    case "star-margin": {
      const pulse = Math.sin(now * 0.007 + cd.charIndex * 0.4) * 0.5 + 0.5;
      const scale = 1 + ti * 0.6 * pulse;
      const rot = t * 25 * Math.sin(cd.charIndex * 1.2 + now * 0.005);
      el.style.transform = `scale(${scale}) rotate(${rot}deg) translateY(${-t * 6}px)`;
      el.style.textShadow = t > 0.1
        ? `0 0 ${t * 15}px rgba(255,220,100,${t * 0.6}), ${Math.cos(now * 0.003) * t * 5}px ${Math.sin(now * 0.003) * t * 5}px ${t * 10}px rgba(255,180,50,${t * 0.4})`
        : "none";
      el.style.color = ti > 0.2 ? `hsl(${40 + ti * 20}, ${70 + ti * 30}%, ${50 + ti * 20}%)` : "";
      break;
    }

    // PRISMATIC RAINBOW SWEEP: color-shifting light band
    case "folded-light": {
      const band = Math.max(0, 1 - Math.abs(dx) / 100);
      if (band > 0.02 && Math.abs(dy) < lh * 1.5) {
        const hue = (cd.x * 2 + now * 0.1) % 360;
        el.style.color = `hsl(${hue}, 80%, 40%)`;
        el.style.transform = `scaleY(${1 + band * 0.2}) translateY(${-band * 5}px)`;
        el.style.textShadow = `0 0 ${band * 20}px hsla(${hue}, 90%, 60%, ${band * 0.5}), 0 0 ${band * 40}px hsla(${(hue + 60) % 360}, 90%, 60%, ${band * 0.25})`;
        el.style.filter = `brightness(${1 + band * 0.3})`;
      } else {
        el.style.color = "";
        el.style.transform = "";
        el.style.textShadow = "none";
        el.style.filter = "";
      }
      break;
    }

    // DRAMATIC HEARTBEAT: chars bounce like a cardiac monitor
    case "heartbeat-shift": {
      const heartPhase = Math.sin(now * 0.008 + cd.charIndex * 0.3);
      const beat = heartPhase > 0.7 ? (heartPhase - 0.7) * 3.33 : 0;
      const scale = 1 + ti * 0.5 * beat;
      const jumpY = -ti * 20 * beat;
      const jumpX = Math.sin(cd.charIndex * 2.5) * ti * 5 * beat;
      el.style.transform = `translate(${jumpX}px, ${jumpY}px) scale(${scale})`;
      el.style.transformOrigin = "center bottom";
      el.style.textShadow = beat > 0.1
        ? `0 ${jumpY * 0.3}px ${ti * 12}px rgba(200,50,50,${ti * beat * 0.5})`
        : "none";
      el.style.color = ti * beat > 0.3 ? `rgb(${180 + ti * 75}, ${30 + ti * 30}, ${30})` : "";
      break;
    }
  }
}
