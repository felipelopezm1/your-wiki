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
  Vector3,
} from "three";
import type { BookEntry } from "@/types";
import { COVER_THEMES, type CoverTheme } from "@/types";

// ---------- Dimensions ----------
const COVER_W = 0.48;
const BOOK_H = 0.68;
const BOOK_GAP = 0.05;

// ---------- Texture helpers ----------

function addGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity = 10
) {
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

function darkenColor(hex: string, amount: number): string {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((c >> 16) & 0xff) - amount);
  const g = Math.max(0, ((c >> 8) & 0xff) - amount);
  const b = Math.max(0, (c & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function createCoverTexture(
  title: string,
  author: string,
  bg: string,
  text: string,
  label: string
): CanvasTexture {
  const W = 512,
    H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Double border
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.globalAlpha = 1;

  // Top ornament
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(W / 2, 56);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Label
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.45;
  ctx.font = '600 13px "Inter", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), W / 2, 92);
  ctx.globalAlpha = 1;

  // Rule under label
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.28, 108);
  ctx.lineTo(W * 0.72, 108);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Title
  ctx.fillStyle = text;
  ctx.font = 'bold 32px "Merriweather", Georgia, serif';
  ctx.textAlign = "center";

  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > 380) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);

  const titleY = H * 0.42 - (lines.length * 44) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleY + i * 44);
  });

  // Rule under title
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(W * 0.3, titleY + lines.length * 44 + 18);
  ctx.lineTo(W * 0.7, titleY + lines.length * 44 + 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Author
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.55;
  ctx.font = 'italic 18px "Merriweather", Georgia, serif';
  ctx.fillText(author, W / 2, H * 0.74);
  ctx.globalAlpha = 1;

  // Bottom ornament
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

function createSpineTexture(
  title: string,
  bg: string,
  text: string
): CanvasTexture {
  const W = 80,
    H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = darkenColor(bg, 18);
  ctx.fillRect(0, 0, W, H);

  // Edge ridges
  const eg = ctx.createLinearGradient(0, 0, W, 0);
  eg.addColorStop(0, "rgba(0,0,0,0.2)");
  eg.addColorStop(0.15, "rgba(0,0,0,0)");
  eg.addColorStop(0.85, "rgba(0,0,0,0)");
  eg.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, H);

  // Top/bottom lines
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  for (const y of [24, 28, H - 24, H - 28]) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(W - 10, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rotated title
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = text;
  ctx.font = 'bold 15px "Merriweather", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const truncated = title.length > 22 ? title.substring(0, 22) + "\u2026" : title;
  ctx.fillText(truncated, 0, 0);
  ctx.restore();

  addGrain(ctx, W, H, 8);

  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function createPageEdgeTexture(): CanvasTexture {
  const W = 128,
    H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
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

  const ag = ctx.createLinearGradient(0, 0, 0, H);
  ag.addColorStop(0, "rgba(180,160,120,0.12)");
  ag.addColorStop(0.08, "rgba(180,160,120,0)");
  ag.addColorStop(0.92, "rgba(180,160,120,0)");
  ag.addColorStop(1, "rgba(180,160,120,0.12)");
  ctx.fillStyle = ag;
  ctx.fillRect(0, 0, W, H);

  addGrain(ctx, W, H, 5);

  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function createBackTexture(bg: string, text: string): CanvasTexture {
  const W = 512,
    H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
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

  const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  addGrain(ctx, W, H, 10);

  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// Shared geometry and page-edge texture (created once)
const sharedPageEdgeTex = createPageEdgeTexture();
const pageEdgeColor = new Color("#F0E8D8");

// ---------- StandingBook ----------

interface StandingBookProps {
  book: BookEntry;
  position: [number, number, number];
  thickness: number;
  isSelected: boolean;
  onClick: () => void;
}

function StandingBook({
  book,
  position,
  thickness,
  isSelected,
  onClick,
}: StandingBookProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const theme = COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;

  const { geometry, materials } = useMemo(() => {
    const coverTex = createCoverTexture(
      book.title,
      book.authorLabel,
      theme.bg,
      theme.text,
      book.sourceLabel ? "WIKIPEDIA" : "MESSAGE"
    );
    const spineTex = createSpineTexture(
      book.spineLabel || book.title,
      theme.bg,
      theme.text
    );
    const backTex = createBackTexture(theme.bg, theme.text);

    // BoxGeometry(X=coverWidth, Y=bookHeight, Z=thickness)
    // Cover faces camera along +Z... but we want cover on the FRONT.
    // For books with covers facing camera: cover is on +Z face.
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
    const geo = new BoxGeometry(COVER_W, BOOK_H, thickness);

    const mats = [
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }), // +X: page edges
      new MeshStandardMaterial({ map: spineTex, roughness: 0.65 }),  // -X: spine
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }), // +Y: top edges
      new MeshStandardMaterial({ map: sharedPageEdgeTex, color: pageEdgeColor, roughness: 0.85 }), // -Y: bottom
      new MeshStandardMaterial({ map: coverTex, roughness: 0.5 }),   // +Z: COVER (faces camera)
      new MeshStandardMaterial({ map: backTex, roughness: 0.55 }),   // -Z: back cover
    ];

    return { geometry: geo, materials: mats };
  }, [book, theme, thickness]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const targetY = position[1] + (hovered && !isSelected ? 0.06 : 0) + (isSelected ? 0.04 : 0);
    const targetZ = position[2] + (isSelected ? 0.35 : 0) + (hovered && !isSelected ? 0.12 : 0);
    const targetScale = isSelected ? 1.06 : hovered ? 1.03 : 1;
    const targetRotY = isSelected ? -0.12 : hovered ? -0.08 : 0;

    easing.damp(meshRef.current.position, "y", targetY, 0.15, delta);
    easing.damp(meshRef.current.position, "z", targetZ, 0.15, delta);
    easing.damp3(
      meshRef.current.scale,
      [targetScale, targetScale, targetScale],
      0.15,
      delta
    );
    easing.damp(meshRef.current.rotation, "y", targetRotY, 0.15, delta);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {materials.map((mat, i) => (
        <primitive key={i} attach={`material-${i}`} object={mat} />
      ))}
    </mesh>
  );
}

// ---------- Scene ----------

const THICKNESSES = [0.12, 0.16, 0.09, 0.14, 0.18, 0.10, 0.15, 0.11];

interface Library3DInnerProps {
  books: BookEntry[];
  activeBookIndex: number | null;
  onSelectBook: (index: number) => void;
}

function Library3DInner({
  books,
  activeBookIndex,
  onSelectBook,
}: Library3DInnerProps) {
  const cameraTarget = useRef(new Vector3(0, 0.08, 4.2));

  const bookPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const totalW = books.length * COVER_W + (books.length - 1) * BOOK_GAP;
    let x = -totalW / 2;
    for (let i = 0; i < books.length; i++) {
      positions.push([x + COVER_W / 2, 0, 0]);
      x += COVER_W + BOOK_GAP;
    }
    return positions;
  }, [books]);

  useFrame((state, delta) => {
    if (activeBookIndex !== null && bookPositions[activeBookIndex]) {
      const bx = bookPositions[activeBookIndex][0];
      cameraTarget.current.set(bx, 0.08, 3.0);
    } else {
      cameraTarget.current.set(0, 0.08, 4.2);
    }
    easing.damp3(state.camera.position, cameraTarget.current, 0.35, delta);
    const lookTarget = activeBookIndex !== null && bookPositions[activeBookIndex]
      ? new Vector3(bookPositions[activeBookIndex][0], 0, 0)
      : new Vector3(0, 0, 0);
    state.camera.lookAt(lookTarget);
  });

  return (
    <>
      {/* Warm library lighting */}
      <ambientLight intensity={0.45} color="#FFF8F0" />
      <directionalLight
        position={[4, 6, 5]}
        intensity={0.7}
        color="#FFF5E8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 3, 3]} intensity={0.25} color="#F5EEE5" />
      <pointLight position={[0, 4, -2]} intensity={0.15} color="#E8E0D0" />

      {/* Books */}
      {books.map((book, i) => (
        <StandingBook
          key={book.id}
          book={book}
          position={bookPositions[i] || [0, 0, 0]}
          thickness={THICKNESSES[i % THICKNESSES.length]}
          isSelected={activeBookIndex === i}
          onClick={() => onSelectBook(i)}
        />
      ))}

      {/* Shelf surface */}
      <mesh position={[0, -BOOK_H / 2 - 0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color="#D4C9B8" roughness={0.9} />
      </mesh>

      <ContactShadows
        position={[0, -BOOK_H / 2 - 0.01, 0]}
        opacity={0.5}
        scale={8}
        blur={2.5}
        far={3}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.2}
        minAzimuthAngle={-Math.PI / 5}
        maxAzimuthAngle={Math.PI / 5}
      />

      <Environment preset="apartment" environmentIntensity={0.25} />
    </>
  );
}

// ---------- Export ----------

interface Library3DProps {
  books: BookEntry[];
  activeBookIndex: number | null;
  onSelectBook: (index: number) => void;
}

export function Library3D({
  books,
  activeBookIndex,
  onSelectBook,
}: Library3DProps) {
  const handleSelect = useCallback(
    (i: number) => onSelectBook(i),
    [onSelectBook]
  );

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.08, 4.2], fov: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      className="!fixed inset-0"
      style={{
        background: "linear-gradient(180deg, #FEFCF9 0%, #F0ECE4 50%, #E8E0D4 100%)",
      }}
    >
      <Suspense fallback={null}>
        <Library3DInner
          books={books}
          activeBookIndex={activeBookIndex}
          onSelectBook={handleSelect}
        />
      </Suspense>
    </Canvas>
  );
}
