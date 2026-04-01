import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { COVER_THEMES, type CoverTheme } from "@/types";

const BOOK_W = 1.4;
const BOOK_H = 2.0;
const BOOK_D = 0.2;
const PAGE_INSET = 0.02;

interface BookModelProps {
  title: string;
  authorLabel: string;
  coverTheme: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function BookModel({
  title,
  authorLabel,
  coverTheme,
  index,
  isSelected,
  onClick,
}: BookModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const theme = COVER_THEMES[coverTheme as CoverTheme] ?? COVER_THEMES.cream;
  const coverColor = useMemo(() => new THREE.Color(theme.bg), [theme.bg]);
  const textColor = theme.text;
  const spineColor = useMemo(
    () => new THREE.Color(theme.bg).multiplyScalar(0.85),
    [theme.bg],
  );
  const pageColor = useMemo(() => new THREE.Color("#F5F0E8"), []);

  const targetY = hovered ? 0.15 : 0;
  const targetRotX = hovered ? -0.05 : 0;
  const targetRotY = isSelected ? 0.3 : 0;
  const targetScale = isSelected ? 1.15 : 1;

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = Math.min(delta * 6, 1);
    g.position.y = THREE.MathUtils.lerp(g.position.y, targetY, t);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetRotX, t);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetRotY, t);
    const s = THREE.MathUtils.lerp(g.scale.x, targetScale, t);
    g.scale.set(s, s, s);
  });

  const spacing = BOOK_W + 0.5;

  return (
    <group
      ref={groupRef}
      position={[index * spacing, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Front cover */}
      <mesh position={[0, 0, BOOK_D / 2]}>
        <boxGeometry args={[BOOK_W, BOOK_H, 0.02]} />
        <meshStandardMaterial color={coverColor} roughness={0.7} />
      </mesh>

      {/* Back cover */}
      <mesh position={[0, 0, -BOOK_D / 2]}>
        <boxGeometry args={[BOOK_W, BOOK_H, 0.02]} />
        <meshStandardMaterial color={coverColor} roughness={0.7} />
      </mesh>

      {/* Spine (left edge) */}
      <mesh position={[-BOOK_W / 2, 0, 0]}>
        <boxGeometry args={[0.02, BOOK_H, BOOK_D]} />
        <meshStandardMaterial color={spineColor} roughness={0.6} />
      </mesh>

      {/* Page block */}
      <mesh position={[PAGE_INSET / 2, 0, 0]}>
        <boxGeometry
          args={[
            BOOK_W - PAGE_INSET * 2,
            BOOK_H - PAGE_INSET * 4,
            BOOK_D - 0.04,
          ]}
        />
        <meshStandardMaterial color={pageColor} roughness={0.9} />
      </mesh>

      {/* Title text */}
      <Text
        position={[0, 0.3, BOOK_D / 2 + 0.015]}
        fontSize={0.12}
        maxWidth={BOOK_W - 0.3}
        textAlign="center"
        color={textColor}
        font="/fonts/Merriweather-Bold.ttf"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>

      {/* Author text */}
      <Text
        position={[0, -0.6, BOOK_D / 2 + 0.015]}
        fontSize={0.07}
        maxWidth={BOOK_W - 0.3}
        textAlign="center"
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {authorLabel}
      </Text>

      {/* Type badge */}
      <Text
        position={[0, 0.75, BOOK_D / 2 + 0.015]}
        fontSize={0.05}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
      >
        {"WEEEEKI"}
      </Text>
    </group>
  );
}
