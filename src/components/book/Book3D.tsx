import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { easing } from "maath";
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  CanvasTexture,
  SRGBColorSpace,
  type Group,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { COVER_THEMES, type CoverTheme } from "@/types";

const EASING_FACTOR = 0.5;
const EASING_FACTOR_FOLD = 0.3;
const INSIDE_CURVE = 0.18;
const OUTSIDE_CURVE = 0.05;
const TURNING_CURVE = 0.09;

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes: number[] = [];
const skinWeights: number[] = [];

for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: "#111" }),
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: whiteColor }),
];

function createCoverTexture(
  title: string,
  author: string,
  themeBg: string,
  themeText: string,
  label: string
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 684;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = themeBg;
  ctx.fillRect(0, 0, 512, 684);

  // Subtle border
  ctx.strokeStyle = themeText;
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 464, 636);
  ctx.globalAlpha = 1;

  // Top label
  ctx.fillStyle = themeText;
  ctx.globalAlpha = 0.5;
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), 256, 60);
  ctx.globalAlpha = 1;

  // Title
  ctx.fillStyle = themeText;
  ctx.font = "bold 32px Merriweather, Georgia, serif";
  ctx.textAlign = "center";

  const words = title.split(" ");
  let lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(test).width > 400) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = 280 - (lines.length * 42) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, 256, startY + i * 42);
  });

  // Author
  ctx.globalAlpha = 0.6;
  ctx.font = "400 18px Inter, system-ui, sans-serif";
  ctx.fillText(author, 256, 580);
  ctx.globalAlpha = 1;

  // Decorative line
  ctx.strokeStyle = themeText;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, 620);
  ctx.lineTo(332, 620);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createPageTexture(
  text: string,
  pageNum: number,
  sourceLabel?: string
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 684;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FDFBF7";
  ctx.fillRect(0, 0, 512, 684);

  // Page content
  ctx.fillStyle = "#1A1A1A";
  ctx.font = "400 16px Merriweather, Georgia, serif";
  ctx.textAlign = "left";

  const maxWidth = 440;
  const lineHeight = 24;
  const marginX = 36;
  let y = 50;

  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, marginX, y);
      line = word;
      y += lineHeight;
      if (y > 640) break;
    } else {
      line = test;
    }
  }
  if (line && y <= 640) ctx.fillText(line, marginX, y);

  // Page number
  ctx.fillStyle = "#A8A29E";
  ctx.font = "400 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(pageNum), 256, 670);

  // Source label
  if (sourceLabel) {
    ctx.fillStyle = "#A8A29E";
    ctx.font = "italic 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Source: ${sourceLabel}`, 476, 670);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createBackCoverTexture(themeBg: string, themeText: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 684;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = themeBg;
  ctx.fillRect(0, 0, 512, 684);

  ctx.fillStyle = themeText;
  ctx.globalAlpha = 0.3;
  ctx.font = "bold 18px Merriweather, Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("WEEEEKI", 256, 350);
  ctx.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface BookPageData {
  front: string;
  back: string;
}

export interface Book3DProps {
  title: string;
  authorLabel: string;
  coverTheme: string;
  body: string;
  sourceLabel?: string;
  pageIndex: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  opened: boolean;
  bookClosed: boolean;
}

function PageMesh({
  number,
  totalPages,
  frontTexture,
  backTexture,
  opened,
  bookClosed,
  onPageChange,
}: {
  number: number;
  totalPages: number;
  frontTexture: CanvasTexture;
  backTexture: CanvasTexture;
  opened: boolean;
  bookClosed: boolean;
  onPageChange: (page: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const skinnedMeshRef = useRef<SkinnedMesh>(null);
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  const manualSkinnedMesh = useMemo(() => {
    const bones: Bone[] = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      const bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone);
      }
    }
    const skeleton = new Skeleton(bones);

    const isCover = number === 0;
    const isBackCover = number === totalPages - 1;

    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: whiteColor,
        map: frontTexture,
        roughness: isCover ? 0.5 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: backTexture,
        roughness: isBackCover ? 0.5 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];

    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [frontTexture, backTexture, number, totalPages]);

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;

    const emissiveIntensity = highlighted ? 0.22 : 0;
    const mat4 = skinnedMeshRef.current.material as MeshStandardMaterial[];
    mat4[4].emissiveIntensity = mat4[5].emissiveIntensity = MathUtils.lerp(
      mat4[4].emissiveIntensity,
      emissiveIntensity,
      0.1
    );

    if (lastOpened.current !== opened) {
      turnedAt.current = Date.now();
      lastOpened.current = opened;
    }

    let turningTime = Math.min(400, Date.now() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? groupRef.current! : bones[i];
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;

      let rotationAngle =
        INSIDE_CURVE * insideCurveIntensity * targetRotation -
        OUTSIDE_CURVE * outsideCurveIntensity * targetRotation +
        TURNING_CURVE * turningIntensity * targetRotation;

      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);

      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }

      easing.dampAngle(target.rotation, "y", rotationAngle, EASING_FACTOR, delta);

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        EASING_FACTOR_FOLD,
        delta
      );
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPageChange(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive ref={skinnedMeshRef} object={manualSkinnedMesh} />
    </group>
  );
}

export function Book3D({
  title,
  authorLabel,
  coverTheme,
  body,
  sourceLabel,
  currentPage,
  onPageChange,
}: Omit<Book3DProps, "pageIndex" | "opened" | "bookClosed">) {
  const theme = COVER_THEMES[coverTheme as CoverTheme] ?? COVER_THEMES.cream;
  const [delayedPage, setDelayedPage] = useState(currentPage);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const goToPage = () => {
      setDelayedPage((prev) => {
        if (currentPage === prev) return prev;
        timeout = setTimeout(
          goToPage,
          Math.abs(currentPage - prev) > 2 ? 50 : 150
        );
        return currentPage > prev ? prev + 1 : prev - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [currentPage]);

  const pages = useMemo(() => {
    const coverFront = createCoverTexture(
      title,
      authorLabel,
      theme.bg,
      theme.text,
      sourceLabel ? "WIKIPEDIA" : "MESSAGE"
    );

    // Split body into page-sized chunks
    const words = body.split(" ");
    const chunks: string[] = [];
    const WORDS_PER_PAGE = 100;
    for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
      chunks.push(words.slice(i, i + WORDS_PER_PAGE).join(" "));
    }
    if (chunks.length === 0) chunks.push(body);
    // Ensure even number of content sides
    if (chunks.length % 2 !== 0) chunks.push("");

    const pageTextures: Array<{ front: CanvasTexture; back: CanvasTexture }> = [];

    // Cover page: front = cover art, back = first content chunk
    pageTextures.push({
      front: coverFront,
      back: chunks.length > 0
        ? createPageTexture(chunks[0], 1, sourceLabel)
        : createPageTexture("", 1),
    });

    // Interior pages
    for (let i = 1; i < chunks.length; i += 2) {
      pageTextures.push({
        front: createPageTexture(chunks[i], i + 1, sourceLabel),
        back: i + 1 < chunks.length
          ? createPageTexture(chunks[i + 1], i + 2, sourceLabel)
          : createPageTexture("", i + 2),
      });
    }

    // Back cover
    const backCover = createBackCoverTexture(theme.bg, theme.text);
    if (pageTextures.length > 0) {
      pageTextures.push({
        front: createPageTexture("", pageTextures.length * 2 + 1),
        back: backCover,
      });
    }

    return pageTextures;
  }, [title, authorLabel, theme.bg, theme.text, body, sourceLabel]);

  const totalPages = pages.length;

  return (
    <group>
      {pages.map((page, index) => (
        <PageMesh
          key={index}
          number={index}
          totalPages={totalPages}
          frontTexture={page.front}
          backTexture={page.back}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === totalPages}
          onPageChange={onPageChange}
        />
      ))}
    </group>
  );
}
