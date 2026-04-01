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

const BOOK_H = 0.85;
const COVER_W = 0.60;
const BOOK_GAP = 0.006;
const THICKNESSES = [0.09, 0.12, 0.07, 0.10, 0.13, 0.08, 0.11, 0.09];

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

function createCoverTexture(
  title: string, author: string, bg: string, text: string, label: string
): CanvasTexture {
  const W = 512, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(W / 2, 56);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.45;
  ctx.font = '600 13px "Inter", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), W / 2, 92);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.moveTo(W * 0.28, 108);
  ctx.lineTo(W * 0.72, 108);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.font = 'bold 32px "Merriweather", Georgia, serif';
  ctx.textAlign = "center";
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > 380) { lines.push(cur); cur = w; } else { cur = test; }
  }
  if (cur) lines.push(cur);
  const titleY = H * 0.42 - (lines.length * 44) / 2;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, titleY + i * 44));
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(W * 0.3, titleY + lines.length * 44 + 18);
  ctx.lineTo(W * 0.7, titleY + lines.length * 44 + 18);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.55;
  ctx.font = 'italic 18px "Merriweather", Georgia, serif';
  ctx.fillText(author, W / 2, H * 0.74);
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.22;
  ctx.font = "20px serif";
  ctx.fillText("\u25C6", W / 2, H - 48);
  ctx.globalAlpha = 1;
  addGrain(ctx, W, H, 10);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function createSpineTexture(title: string, bg: string, text: string): CanvasTexture {
  const W = 80, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = darken(bg, 18);
  ctx.fillRect(0, 0, W, H);
  const eg = ctx.createLinearGradient(0, 0, W, 0);
  eg.addColorStop(0, "rgba(0,0,0,0.2)");
  eg.addColorStop(0.15, "rgba(0,0,0,0)");
  eg.addColorStop(0.85, "rgba(0,0,0,0)");
  eg.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  for (const y of [24, 28, H - 24, H - 28]) {
    ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = text;
  ctx.font = 'bold 15px "Merriweather", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tr = title.length > 22 ? title.substring(0, 22) + "\u2026" : title;
  ctx.fillText(tr, 0, 0);
  ctx.restore();
  addGrain(ctx, W, H, 8);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function createPageEdgeTexture(): CanvasTexture {
  const W = 128, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F0E8D8";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(180,170,150,0.22)";
  ctx.lineWidth = 0.5;
  for (let y = 1; y < H; y += 2.5) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 0.4);
    ctx.lineTo(W, y + Math.random() * 0.4);
    ctx.stroke();
  }
  addGrain(ctx, W, H, 5);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function createBackTexture(bg: string, text: string): CanvasTexture {
  const W = 512, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.globalAlpha = 1;
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.12;
  ctx.font = 'bold 20px "Merriweather", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("WEEEEKI", W / 2, H / 2);
  ctx.globalAlpha = 1;
  addGrain(ctx, W, H, 10);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const sharedPageEdgeTex = createPageEdgeTexture();
const pageEdgeColor = new Color("#F0E8D8");

// ---------- Spine-facing Book ----------
// BoxGeometry(thickness, BOOK_H, COVER_W)
// Faces: [0]+X=cover, [1]-X=backCover, [2]+Y=topEdge, [3]-Y=bottom, [4]+Z=spine, [5]-Z=pageEdges

interface ShelfBookProps {
  book: BookEntry;
  position: [number, number, number];
  thickness: number;
  onClick: () => void;
}

function ShelfBook({ book, position, thickness, onClick }: ShelfBookProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const theme = COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;

  const { geometry, materials } = useMemo(() => {
    const coverTex = createCoverTexture(
      book.title, book.authorLabel, theme.bg, theme.text,
      book.sourceLabel ? "WIKIPEDIA" : "MESSAGE"
    );
    const spineTex = createSpineTexture(book.spineLabel || book.title, theme.bg, theme.text);
    const backTex = createBackTexture(theme.bg, theme.text);

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
  }, [book, theme, thickness]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pullOut = hovered ? COVER_W * 0.55 : 0;
    const tiltY = hovered ? -0.22 : 0;
    const liftY = hovered ? 0.04 : 0;
    easing.damp(meshRef.current.position, "z", position[2] + pullOut, 0.12, delta);
    easing.damp(meshRef.current.position, "y", position[1] + liftY, 0.12, delta);
    easing.damp(meshRef.current.rotation, "y", tiltY, 0.12, delta);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {materials.map((mat, i) => (
        <primitive key={i} attach={`material-${i}`} object={mat} />
      ))}
    </mesh>
  );
}

// ---------- Shelf backdrop ----------

function Bookshelf() {
  const shelfColor = "#8B7355";
  const backColor = "#6B5A42";
  const shelfW = 2.8;
  const shelfDepth = COVER_W + 0.15;
  const shelfThick = 0.025;

  return (
    <group>
      {/* Bottom shelf */}
      <mesh position={[0, -BOOK_H / 2 - shelfThick / 2, -shelfDepth / 2 + COVER_W / 2]} receiveShadow castShadow>
        <boxGeometry args={[shelfW, shelfThick, shelfDepth]} />
        <meshStandardMaterial color={shelfColor} roughness={0.75} />
      </mesh>
      {/* Top shelf */}
      <mesh position={[0, BOOK_H / 2 + shelfThick / 2 + 0.03, -shelfDepth / 2 + COVER_W / 2]}>
        <boxGeometry args={[shelfW, shelfThick, shelfDepth]} />
        <meshStandardMaterial color={shelfColor} roughness={0.75} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 0.01, -shelfDepth + COVER_W / 2]}>
        <boxGeometry args={[shelfW, BOOK_H + 0.12, 0.02]} />
        <meshStandardMaterial color={backColor} roughness={0.85} />
      </mesh>
      {/* Left side */}
      <mesh position={[-shelfW / 2, 0.01, -shelfDepth / 2 + COVER_W / 2]}>
        <boxGeometry args={[0.02, BOOK_H + 0.12, shelfDepth]} />
        <meshStandardMaterial color={shelfColor} roughness={0.75} />
      </mesh>
      {/* Right side */}
      <mesh position={[shelfW / 2, 0.01, -shelfDepth / 2 + COVER_W / 2]}>
        <boxGeometry args={[0.02, BOOK_H + 0.12, shelfDepth]} />
        <meshStandardMaterial color={shelfColor} roughness={0.75} />
      </mesh>
    </group>
  );
}

// ---------- Scene ----------

interface Library3DInnerProps {
  books: BookEntry[];
  onSelectBook: (index: number) => void;
}

function Library3DInner({ books, onSelectBook }: Library3DInnerProps) {
  const bookPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const thicknesses = books.map((_, i) => THICKNESSES[i % THICKNESSES.length]);
    const totalW = thicknesses.reduce((s, t) => s + t, 0) + Math.max(0, books.length - 1) * BOOK_GAP;
    let x = -totalW / 2;
    for (let i = 0; i < books.length; i++) {
      const t = thicknesses[i];
      positions.push([x + t / 2, 0, 0]);
      x += t + BOOK_GAP;
    }
    return positions;
  }, [books]);

  return (
    <>
      <ambientLight intensity={0.4} color="#FFF5E8" />
      <directionalLight position={[3, 5, 5]} intensity={0.65} color="#FFF0E0" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2, 4]} intensity={0.3} color="#F5EEE5" />
      <pointLight position={[0, -1, 3]} intensity={0.1} color="#E8DCC8" />

      <Bookshelf />

      {books.map((book, i) => (
        <ShelfBook
          key={book.id}
          book={book}
          position={bookPositions[i] || [0, 0, 0]}
          thickness={THICKNESSES[i % THICKNESSES.length]}
          onClick={() => onSelectBook(i)}
        />
      ))}

      <ContactShadows position={[0, -BOOK_H / 2 - 0.02, 0.1]} opacity={0.35} scale={5} blur={2.5} far={2} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 6}
        maxAzimuthAngle={Math.PI / 6}
      />
      <Environment preset="apartment" environmentIntensity={0.2} />
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
      camera={{ position: [0, 0.05, 2.2], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      className="!fixed inset-0"
      style={{ background: "linear-gradient(180deg, #F5F0E8 0%, #E8DFD0 50%, #D8CFC0 100%)" }}
    >
      <Suspense fallback={null}>
        <Library3DInner books={books} onSelectBook={handleSelect} />
      </Suspense>
    </Canvas>
  );
}
