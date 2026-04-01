import { useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";

export function HoloLightbox() {
  const imageUrl = useAppStore((s) => s.activeLightboxImage);
  const close = useAppStore((s) => s.setActiveLightboxImage);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => close(null), [close]);

  useEffect(() => {
    if (!imageUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [imageUrl, handleClose]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg)`;
    card.style.setProperty("--holo-x", `${(x + 0.5) * 100}%`);
    card.style.setProperty("--holo-y", `${(y + 0.5) * 100}%`);
  }, []);

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  }, []);

  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Holographic card */}
          <motion.div
            ref={cardRef}
            className="holo-card relative z-10 overflow-hidden rounded-2xl shadow-2xl"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{ willChange: "transform" }}
          >
            {/* Image */}
            <img
              src={imageUrl}
              alt=""
              className="block max-h-[75vh] max-w-[85vw] object-contain"
            />

            {/* Holographic sheen overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at var(--holo-x, 50%) var(--holo-y, 50%), 
                  rgba(255,255,255,0.15) 0%, 
                  transparent 50%),
                  linear-gradient(
                    135deg, 
                    rgba(255,0,128,0.06) 0%, 
                    rgba(0,128,255,0.06) 25%, 
                    rgba(0,255,128,0.06) 50%, 
                    rgba(255,128,0,0.06) 75%, 
                    rgba(128,0,255,0.06) 100%
                  )`,
                mixBlendMode: "overlay",
              }}
            />

            {/* Border glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                boxShadow:
                  "inset 0 0 30px rgba(255,255,255,0.08), 0 0 40px rgba(139,115,85,0.15)",
              }}
            />
          </motion.div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
