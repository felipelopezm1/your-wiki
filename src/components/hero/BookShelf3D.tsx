import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BookModel } from "./BookModel";
import type { BookEntry } from "@/types";

const BOOK_SPACING = 1.9;

interface BookShelf3DProps {
  books: BookEntry[];
  onSelectBook: (id: string) => void;
}

export function BookShelf3D({ books, onSelectBook }: BookShelf3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { size } = useThree();

  const totalWidth = (books.length - 1) * BOOK_SPACING;
  const maxScroll = Math.max(0, totalWidth / 2 - size.width / size.height);

  const handleWheel = useCallback(
    (e: THREE.Event & { deltaY?: number }) => {
      const delta = (e as unknown as { deltaY: number }).deltaY ?? 0;
      setScrollOffset((prev) =>
        THREE.MathUtils.clamp(prev + delta * 0.003, -maxScroll, maxScroll),
      );
    },
    [maxScroll],
  );

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = Math.min(delta * 5, 1);
    g.position.x = THREE.MathUtils.lerp(g.position.x, -scrollOffset, t);
  });

  const handleClick = (index: number, id: string) => {
    if (selectedIndex === index) {
      onSelectBook(id);
    } else {
      setSelectedIndex(index);
      setScrollOffset(index * BOOK_SPACING - totalWidth / 2 + BOOK_SPACING / 2);
    }
  };

  return (
    <group ref={groupRef} onWheel={handleWheel}>
      {/* Shelf surface */}
      <mesh position={[totalWidth / 2 - BOOK_SPACING / 2, -1.15, -0.1]} receiveShadow>
        <boxGeometry args={[totalWidth + 3, 0.08, 1.2]} />
        <meshStandardMaterial
          color="#E8E4DF"
          roughness={0.85}
        />
      </mesh>

      {books.map((book, i) => (
        <BookModel
          key={book.id}
          title={book.title}
          authorLabel={book.authorLabel}
          coverTheme={book.coverTheme}
          index={i}
          isSelected={selectedIndex === i}
          onClick={() => handleClick(i, book.id)}
        />
      ))}
    </group>
  );
}
