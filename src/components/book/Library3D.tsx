import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  OrbitControls,
  useCursor,
} from "@react-three/drei";
import { easing } from "maath";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import type { BookEntry } from "@/types";
import { COVER_THEMES, type CoverTheme } from "@/types";
import { isBookLocked } from "@/lib/bookLock";

const BOOK_H = 0.85;
const COVER_W = 0.60;
const BOOK_GAP = 0.005;

// ---------- Texture helpers ----------

function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity = 10) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function darken(hex: string, amt: number): string {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((c >> 16) & 0xff) - amt);
  const g = Math.max(0, ((c >> 8) & 0xff) - amt);
  const b = Math.max(0, (c & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawPadlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color = "#E8C98A",
) {
  ctx.save();
  // Soft dark badge behind the lock for contrast
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fill();

  const bw = size * 0.92;
  const bh = size * 0.74;
  const bx = cx - bw / 2;
  const by = cy - size * 0.12;

  // Shackle
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, by, size * 0.3, Math.PI, 0);
  ctx.stroke();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, size * 0.14);
  ctx.fill();

  // Keyhole
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.arc(cx, by + bh * 0.42, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - size * 0.04, by + bh * 0.42, size * 0.08, bh * 0.32);
  ctx.restore();
}

function createCoverTexture(title: string, author: string, bg: string, text: string, label: string, locked = false): CanvasTexture {
  const W = 512, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text; ctx.globalAlpha = 0.2; ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1; ctx.strokeRect(30, 30, W - 60, H - 60); ctx.globalAlpha = 1;
  ctx.fillStyle = text; ctx.globalAlpha = 0.35;
  ctx.save(); ctx.translate(W / 2, 56); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  ctx.globalAlpha = 0.45; ctx.font = '600 13px "Inter", system-ui, sans-serif'; ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), W / 2, 92); ctx.globalAlpha = 1;
  ctx.strokeStyle = text; ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.moveTo(W * 0.28, 108); ctx.lineTo(W * 0.72, 108); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = text; ctx.font = 'bold 32px "Merriweather", Georgia, serif'; ctx.textAlign = "center";
  const titleLines = wrapText(ctx, title, 380);
  const titleY = H * 0.42 - (titleLines.length * 44) / 2;
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, titleY + i * 44));
  ctx.strokeStyle = text; ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.moveTo(W * 0.3, titleY + titleLines.length * 44 + 18);
  ctx.lineTo(W * 0.7, titleY + titleLines.length * 44 + 18); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = text; ctx.globalAlpha = 0.55; ctx.font = 'italic 18px "Merriweather", Georgia, serif';
  ctx.fillText(author, W / 2, H * 0.74); ctx.globalAlpha = 1;
  ctx.fillStyle = text; ctx.globalAlpha = 0.22; ctx.font = "20px serif";
  ctx.fillText("\u25C6", W / 2, H - 48); ctx.globalAlpha = 1;
  if (locked) drawPadlock(ctx, W - 64, 70, 26);
  addGrain(ctx, W, H, 10);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}

function createSpineTexture(title: string, bg: string, text: string, locked = false): CanvasTexture {
  const W = 80, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = darken(bg, 18); ctx.fillRect(0, 0, W, H);
  const eg = ctx.createLinearGradient(0, 0, W, 0);
  eg.addColorStop(0, "rgba(0,0,0,0.2)"); eg.addColorStop(0.15, "rgba(0,0,0,0)");
  eg.addColorStop(0.85, "rgba(0,0,0,0)"); eg.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text; ctx.globalAlpha = 0.3; ctx.lineWidth = 1;
  for (const y of [24, 28, H - 24, H - 28]) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = text; ctx.font = 'bold 15px "Merriweather", Georgia, serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tr = title.length > 22 ? title.substring(0, 22) + "\u2026" : title;
  ctx.fillText(tr, 0, 0); ctx.restore();
  if (locked) drawPadlock(ctx, W / 2, 58, 16);
  addGrain(ctx, W, H, 8);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}

function createPageEdgeTexture(): CanvasTexture {
  const W = 128, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F0E8D8"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(180,170,150,0.22)"; ctx.lineWidth = 0.5;
  for (let y = 1; y < H; y += 2.5) { ctx.beginPath(); ctx.moveTo(0, y + Math.random() * 0.4); ctx.lineTo(W, y + Math.random() * 0.4); ctx.stroke(); }
  addGrain(ctx, W, H, 5);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}

function createBackTexture(bg: string, text: string, blurb: string): CanvasTexture {
  const W = 512, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text; ctx.globalAlpha = 0.1; ctx.lineWidth = 1.5;
  ctx.strokeRect(30, 30, W - 60, H - 60); ctx.globalAlpha = 1;
  if (blurb) {
    ctx.fillStyle = text; ctx.globalAlpha = 0.6; ctx.font = 'italic 15px "Merriweather", Georgia, serif'; ctx.textAlign = "center";
    const blurbLines = wrapText(ctx, blurb, W - 100);
    const maxLines = Math.min(blurbLines.length, 10);
    const startY = H / 2 - (maxLines * 22) / 2;
    for (let i = 0; i < maxLines; i++) ctx.fillText(blurbLines[i], W / 2, startY + i * 22);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = text; ctx.globalAlpha = 0.15; ctx.font = 'bold 14px "Merriweather", Georgia, serif'; ctx.textAlign = "center";
  ctx.fillText("WEEEEKI", W / 2, H - 50); ctx.globalAlpha = 1;
  addGrain(ctx, W, H, 10);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}

function createFillerSpineTexture(bg: string): CanvasTexture {
  const W = 80, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = darken(bg, 18); ctx.fillRect(0, 0, W, H);
  const eg = ctx.createLinearGradient(0, 0, W, 0);
  eg.addColorStop(0, "rgba(0,0,0,0.2)"); eg.addColorStop(0.15, "rgba(0,0,0,0)");
  eg.addColorStop(0.85, "rgba(0,0,0,0)"); eg.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1;
  for (const y of [24, 28, H - 24, H - 28]) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke(); }
  addGrain(ctx, W, H, 8);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
}

const sharedPageEdgeTex = createPageEdgeTexture();
const pageEdgeColor = new Color("#F0E8D8");

// ---------- Interactive Book ----------

interface ShelfBookProps {
  book: BookEntry;
  position: [number, number, number];
  thickness: number;
  tiltZ?: number;
  onClick: () => void;
}

function ShelfBook({ book, position, thickness, tiltZ = 0, onClick }: ShelfBookProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const theme = COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;
  const blurb = book.body.split(/[.!?]/)[0] + ".";
  const locked = isBookLocked(book);

  const { geometry, materials } = useMemo(() => {
    const coverTex = createCoverTexture(book.title, book.authorLabel, theme.bg, theme.text, book.sourceLabel ? "WIKIPEDIA" : "MESSAGE", locked);
    const spineTex = createSpineTexture(book.spineLabel || book.title, theme.bg, theme.text, locked);
    const backTex = createBackTexture(theme.bg, theme.text, blurb);
    const geo = new BoxGeometry(thickness, BOOK_H, COVER_W);
    const mats = [
      new MeshStandardMaterial({ map: coverTex, roughness: 0.5 }),
      new MeshStandardMaterial({ map: backTex, roughness: 0.55 }),
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
      new MeshStandardMaterial({ map: spineTex, roughness: 0.6 }),
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
    ];
    return { geometry: geo, materials: mats };
  }, [book, theme, thickness, blurb, locked]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pullOut = hovered ? COVER_W * 1.1 : 0;
    const tiltY = hovered ? -1.05 : 0;
    const liftY = hovered ? 0.1 : 0;
    const targetTiltZ = hovered ? 0 : tiltZ;
    easing.damp(meshRef.current.position, "z", position[2] + pullOut, 0.15, delta);
    easing.damp(meshRef.current.position, "y", position[1] + liftY, 0.15, delta);
    easing.damp(meshRef.current.rotation, "y", tiltY, 0.15, delta);
    easing.damp(meshRef.current.rotation, "z", targetTiltZ, 0.15, delta);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} rotation={[0, 0, tiltZ]} castShadow receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {materials.map((mat, i) => <primitive key={i} attach={`material-${i}`} object={mat} />)}
    </mesh>
  );
}

// ---------- Decorative filler book ----------

const FILLER_COLORS = [
  "#7B3F3F", "#3F5B3F", "#3F4A6B", "#6B5A42",
  "#5A3B5E", "#4A5A3A", "#8B6F4A", "#4A4A50",
  "#6B4A28", "#3A5A5A", "#5A2A2A", "#2A3A5A",
  "#6A6A3A", "#5A4A6A", "#3A5A3A", "#7A5A3A",
];

function FillerBook({ position, thickness, height, colorIndex, tiltZ = 0 }: {
  position: [number, number, number]; thickness: number; height: number; colorIndex: number; tiltZ?: number;
}) {
  const bg = FILLER_COLORS[colorIndex % FILLER_COLORS.length];
  const { geometry, materials } = useMemo(() => {
    const spineTex = createFillerSpineTexture(bg);
    const geo = new BoxGeometry(thickness, height, COVER_W);
    const coverMat = new MeshStandardMaterial({ color: bg, roughness: 0.55 });
    const mats = [coverMat, coverMat,
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
      new MeshStandardMaterial({ map: spineTex, roughness: 0.6 }),
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }),
    ];
    return { geometry: geo, materials: mats };
  }, [bg, thickness, height]);

  return (
    <mesh geometry={geometry} position={position} rotation={[0, 0, tiltZ]} castShadow receiveShadow>
      {materials.map((mat, i) => <primitive key={i} attach={`material-${i}`} object={mat} />)}
    </mesh>
  );
}

// ---------- Bookshelf (3 rows) ----------

function Bookshelf() {
  const shelfColor = "#9A9A9A";
  const backColor = "#7A7A7A";
  const shelfW = 3.6;
  const shelfDepth = COVER_W + 0.2;
  const shelfThick = 0.025;
  const rowSpacing = BOOK_H + 0.18;

  return (
    <group>
      {[-1, 0, 1].map((row) => {
        const yCenter = row * rowSpacing;
        return (
          <group key={row}>
            {/* Bottom plank */}
            <mesh position={[0, yCenter - BOOK_H / 2 - shelfThick / 2, -shelfDepth / 2 + COVER_W / 2]} receiveShadow castShadow>
              <boxGeometry args={[shelfW, shelfThick, shelfDepth]} />
              <meshStandardMaterial color={shelfColor} roughness={0.75} />
            </mesh>
            {/* Top plank */}
            <mesh position={[0, yCenter + BOOK_H / 2 + shelfThick / 2 + 0.04, -shelfDepth / 2 + COVER_W / 2]}>
              <boxGeometry args={[shelfW, shelfThick, shelfDepth]} />
              <meshStandardMaterial color={shelfColor} roughness={0.75} />
            </mesh>
            {/* Back panel */}
            <mesh position={[0, yCenter + 0.02, -shelfDepth + COVER_W / 2]}>
              <boxGeometry args={[shelfW, BOOK_H + 0.14, 0.02]} />
              <meshStandardMaterial color={backColor} roughness={0.85} />
            </mesh>
          </group>
        );
      })}
      {/* Side panels spanning all 3 rows */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * shelfW / 2, 0, -shelfDepth / 2 + COVER_W / 2]}>
          <boxGeometry args={[0.025, rowSpacing * 3 + 0.1, shelfDepth]} />
          <meshStandardMaterial color={shelfColor} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Scene ----------

const SEED_THICKNESSES = [0.09, 0.12, 0.07, 0.10, 0.13, 0.08, 0.11, 0.09, 0.10, 0.07, 0.12, 0.08];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generateFillerRow(rowY: number, count: number, seedOffset: number): { pos: [number, number, number]; thickness: number; height: number; colorIdx: number; tiltZ: number }[] {
  const items: { pos: [number, number, number]; thickness: number; height: number; colorIdx: number; tiltZ: number }[] = [];
  const thicknesses = Array.from({ length: count }, (_, i) => 0.05 + seededRandom(i * 37 + seedOffset) * 0.09);
  const totalW = thicknesses.reduce((a, b) => a + b, 0) + (count - 1) * BOOK_GAP;
  let x = -totalW / 2;
  for (let i = 0; i < count; i++) {
    const thick = thicknesses[i];
    const h = BOOK_H - seededRandom(i * 43 + seedOffset) * 0.15;
    const tilt = (i === 0) ? 0.08
      : (i === count - 1) ? -0.1
      : (seededRandom(i * 53 + seedOffset) > 0.65 ? (seededRandom(i * 59 + seedOffset) - 0.5) * 0.12 : 0);
    items.push({ pos: [x + thick / 2, rowY + (h - BOOK_H) / 2, 0], thickness: thick, height: h, colorIdx: (i + seedOffset) % FILLER_COLORS.length, tiltZ: tilt });
    x += thick + BOOK_GAP;
  }
  return items;
}

interface Library3DInnerProps {
  books: BookEntry[];
  onSelectBook: (index: number) => void;
}

function Library3DInner({ books, onSelectBook }: Library3DInnerProps) {
  const rowSpacing = BOOK_H + 0.18;

  // Middle row (row 0): interactive books + edge fillers
  const middleBooks = useMemo(() => {
    const positions: { pos: [number, number, number]; thickness: number; tiltZ: number }[] = [];
    const thicknesses = books.map((_, i) => SEED_THICKNESSES[i % SEED_THICKNESSES.length]);
    const totalW = thicknesses.reduce((s, t) => s + t, 0) + Math.max(0, books.length - 1) * BOOK_GAP;
    let x = -totalW / 2;
    for (let i = 0; i < books.length; i++) {
      const t = thicknesses[i];
      const tilt = (i === 0 || i === books.length - 1)
        ? (i === 0 ? 0.06 : -0.06)
        : (seededRandom(i * 7) > 0.7 ? (seededRandom(i * 13) - 0.5) * 0.08 : 0);
      positions.push({ pos: [x + t / 2, 0, 0], thickness: t, tiltZ: tilt });
      x += t + BOOK_GAP;
    }
    return positions;
  }, [books]);

  // Edge fillers for middle row
  const middleFillers = useMemo(() => {
    const fillers: { pos: [number, number, number]; thickness: number; height: number; colorIdx: number; tiltZ: number }[] = [];
    if (middleBooks.length === 0) return fillers;
    const rightEdge = middleBooks[middleBooks.length - 1].pos[0] + middleBooks[middleBooks.length - 1].thickness / 2;
    const leftEdge = middleBooks[0].pos[0] - middleBooks[0].thickness / 2;
    let x = rightEdge + BOOK_GAP;
    for (let i = 0; i < 5; i++) {
      const thick = 0.05 + seededRandom(i * 23) * 0.08;
      const h = BOOK_H - seededRandom(i * 17) * 0.12;
      const tilt = i === 4 ? -0.12 : (seededRandom(i * 31) > 0.6 ? (seededRandom(i * 41) - 0.5) * 0.1 : 0);
      fillers.push({ pos: [x + thick / 2, (h - BOOK_H) / 2, 0], thickness: thick, height: h, colorIdx: i + 10, tiltZ: tilt });
      x += thick + BOOK_GAP;
    }
    x = leftEdge - BOOK_GAP;
    for (let i = 0; i < 4; i++) {
      const thick = 0.05 + seededRandom(i * 29) * 0.07;
      const h = BOOK_H - seededRandom(i * 19) * 0.1;
      const tilt = i === 0 ? 0.1 : 0;
      x -= thick;
      fillers.push({ pos: [x + thick / 2, (h - BOOK_H) / 2, 0], thickness: thick, height: h, colorIdx: i + 5, tiltZ: tilt });
      x -= BOOK_GAP;
    }
    return fillers;
  }, [middleBooks]);

  // Top row (row +1): all fillers
  const topFillers = useMemo(() => generateFillerRow(rowSpacing, 16, 200), [rowSpacing]);

  // Bottom row (row -1): all fillers
  const bottomFillers = useMemo(() => generateFillerRow(-rowSpacing, 15, 400), [rowSpacing]);

  return (
    <>
      <ambientLight intensity={0.8} color="#FFFFFF" />
      <directionalLight position={[3, 6, 5]} intensity={1.0} color="#FFFFFF" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 4, 4]} intensity={0.4} color="#FFFFFF" />
      <pointLight position={[-3, 2, 4]} intensity={0.35} color="#FFFFFF" />
      <pointLight position={[3, 2, 4]} intensity={0.35} color="#FFFFFF" />
      <pointLight position={[0, -1, 3]} intensity={0.2} color="#FFFFFF" />
      <pointLight position={[0, 3, 2]} intensity={0.3} color="#FFFFFF" />

      <Bookshelf />

      {/* Middle row: interactive books */}
      {books.map((book, i) => {
        const data = middleBooks[i];
        if (!data) return null;
        return (
          <ShelfBook key={book.id} book={book} position={data.pos} thickness={data.thickness} tiltZ={data.tiltZ} onClick={() => onSelectBook(i)} />
        );
      })}

      {/* Middle row: edge fillers */}
      {middleFillers.map((f, i) => (
        <FillerBook key={`mf-${i}`} position={f.pos} thickness={f.thickness} height={f.height} colorIndex={f.colorIdx} tiltZ={f.tiltZ} />
      ))}

      {/* Top row: fillers */}
      {topFillers.map((f, i) => (
        <FillerBook key={`tf-${i}`} position={f.pos} thickness={f.thickness} height={f.height} colorIndex={f.colorIdx} tiltZ={f.tiltZ} />
      ))}

      {/* Bottom row: fillers */}
      {bottomFillers.map((f, i) => (
        <FillerBook key={`bf-${i}`} position={f.pos} thickness={f.thickness} height={f.height} colorIndex={f.colorIdx} tiltZ={f.tiltZ} />
      ))}

      <ContactShadows position={[0, -rowSpacing - BOOK_H / 2 - 0.025, 0.1]} opacity={0.3} scale={6} blur={2.5} far={2} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI / 5}
        maxAzimuthAngle={Math.PI / 5}
      />
      <Environment preset="apartment" environmentIntensity={0.45} />
    </>
  );
}

// ---------- Export ----------

interface Library3DProps {
  books: BookEntry[];
  onSelectBook: (index: number) => void;
}

export function Library3D({ books, onSelectBook }: Library3DProps) {
  const handleSelect = useCallback((i: number) => onSelectBook(i), [onSelectBook]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.15, 3.6], fov: 44, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      className="!fixed inset-0"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 50%, #F3F3F3 100%)" }}
    >
      <Suspense fallback={null}>
        <Library3DInner books={books} onSelectBook={handleSelect} />
      </Suspense>
    </Canvas>
  );
}
