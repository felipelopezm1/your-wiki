import { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { BookShelf3D } from "./BookShelf3D";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router";

export function HeroBookScene() {
  const books = useAppStore((s) => s.books);
  const navigate = useNavigate();

  const handleSelectBook = useCallback(
    (id: string) => {
      navigate(`/book/${id}`);
    },
    [navigate],
  );

  if (books.length === 0) return null;

  return (
    <div className="h-[420px] w-full sm:h-[500px]">
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-3, 3, 2]} intensity={0.3} color="#F5EEE5" />

          <BookShelf3D books={books} onSelectBook={handleSelectBook} />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2.2}
            minAzimuthAngle={-Math.PI / 6}
            maxAzimuthAngle={Math.PI / 6}
          />
          <Environment preset="studio" environmentIntensity={0.3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
