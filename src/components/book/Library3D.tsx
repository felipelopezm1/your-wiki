import { Suspense, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  ContactShadows,
} from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { Book3D } from "./Book3D";
import type { BookEntry } from "@/types";

interface BookSlotProps {
  book: BookEntry;
  position: [number, number, number];
  isActive: boolean;
  onClick: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function BookSlot({
  book,
  position,
  isActive,
  onClick,
  currentPage,
  onPageChange,
}: BookSlotProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetScale = isActive ? 1 : 0.65;
    const targetY = isActive ? 0 : -0.3;
    easing.damp3(
      groupRef.current.position,
      [position[0], position[1] + targetY, position[2]],
      0.3,
      delta
    );
    easing.damp3(
      groupRef.current.scale,
      [targetScale, targetScale, targetScale],
      0.3,
      delta
    );
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {isActive ? (
        <Book3D
          title={book.title}
          authorLabel={book.authorLabel}
          coverTheme={book.coverTheme}
          body={book.body}
          sourceLabel={book.sourceLabel}
          totalPages={5}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      ) : (
        <Float
          speed={1.5}
          rotationIntensity={0.15}
          floatIntensity={0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <Book3D
            title={book.title}
            authorLabel={book.authorLabel}
            coverTheme={book.coverTheme}
            body={book.body}
            sourceLabel={book.sourceLabel}
            totalPages={5}
            currentPage={0}
            onPageChange={() => {}}
          />
        </Float>
      )}
    </group>
  );
}

interface Library3DInnerProps {
  books: BookEntry[];
  activeBookIndex: number | null;
  onSelectBook: (index: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function Library3DInner({
  books,
  activeBookIndex,
  onSelectBook,
  currentPage,
  onPageChange,
}: Library3DInnerProps) {
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0.3, 5));

  useFrame((state, delta) => {
    if (activeBookIndex !== null) {
      const spacing = 3.5;
      const x = activeBookIndex * spacing - ((books.length - 1) * spacing) / 2;
      cameraTargetRef.current.set(x, 0.2, 3.2);
    } else {
      cameraTargetRef.current.set(0, 0.3, 5);
    }
    easing.damp3(state.camera.position, cameraTargetRef.current, 0.4, delta);
    state.camera.lookAt(
      activeBookIndex !== null
        ? new THREE.Vector3(cameraTargetRef.current.x, 0, 0)
        : new THREE.Vector3(0, 0, 0)
    );
  });

  const spacing = 3.5;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-4, 4, 3]} intensity={0.2} color="#F5EEE5" />

      {books.map((book, i) => {
        const x = i * spacing - ((books.length - 1) * spacing) / 2;
        return (
          <BookSlot
            key={book.id}
            book={book}
            position={[x, 0, 0]}
            isActive={activeBookIndex === i}
            onClick={() => onSelectBook(i)}
            currentPage={activeBookIndex === i ? currentPage : 0}
            onPageChange={onPageChange}
          />
        );
      })}

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
      <Environment preset="studio" environmentIntensity={0.3} />
    </>
  );
}

interface Library3DProps {
  books: BookEntry[];
  activeBookIndex: number | null;
  onSelectBook: (index: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function Library3D({
  books,
  activeBookIndex,
  onSelectBook,
  currentPage,
  onPageChange,
}: Library3DProps) {
  const handleSelectBook = useCallback(
    (index: number) => {
      onSelectBook(index);
    },
    [onSelectBook]
  );

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.3, 5], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      className="!fixed inset-0"
      style={{ background: "linear-gradient(180deg, #FEFCF9 0%, #F0ECE4 100%)" }}
    >
      <Suspense fallback={null}>
        <Library3DInner
          books={books}
          activeBookIndex={activeBookIndex}
          onSelectBook={handleSelectBook}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </Suspense>
    </Canvas>
  );
}
