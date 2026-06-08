import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AMOR_LOCK_PASSWORD, markBookUnlocked } from "@/lib/bookLock";
import { COVER_THEMES, type CoverTheme, type BookEntry } from "@/types";

interface BookLockGateProps {
  book: BookEntry;
  onUnlock: () => void;
  onClose: () => void;
}

function AnimatedLock({
  isOpen,
  color,
}: {
  isOpen: boolean;
  color: string;
}) {
  return (
    <div className="relative mx-auto h-16 w-16">
      <motion.svg
        viewBox="0 0 64 64"
        className="h-full w-full drop-shadow-md"
        initial={false}
        animate={isOpen ? { scale: [1, 1.08, 1], rotate: [0, -4, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Lock body */}
        <motion.rect
          x="18"
          y="30"
          width="28"
          height="24"
          rx="4"
          fill={color}
          animate={
            isOpen
              ? { fill: [color, "#C4956A", color] }
              : { fill: color }
          }
          transition={{ duration: 0.6 }}
        />
        <rect x="30" y="38" width="4" height="10" rx="2" fill="rgba(255,255,255,0.35)" />

        {/* Shackle */}
        <motion.g
          style={{ transformOrigin: "44px 30px" }}
          animate={
            isOpen
              ? { rotate: -38, y: -6, x: 2 }
              : { rotate: 0, y: 0, x: 0 }
          }
          transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <path
            d="M22 30 V22 C22 14.82 27.82 9 35 9 C42.18 9 48 14.82 48 22 V30"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </motion.g>
      </motion.svg>

      <AnimatePresence>
        {isOpen && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent-warm"
                initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: Math.cos((i / 6) * Math.PI * 2) * 36,
                  y: Math.sin((i / 6) * Math.PI * 2) * 36,
                  scale: [0, 1.2, 0.4],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BookLockGate({ book, onUnlock, onClose }: BookLockGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme =
    COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (unlocking) return;

      if (password.trim().toLowerCase() !== AMOR_LOCK_PASSWORD) {
        setError(true);
        setTimeout(() => setError(false), 600);
        return;
      }

      setUnlocking(true);
      markBookUnlocked(book.id);
      setTimeout(() => onUnlock(), 750);
    },
    [password, unlocking, book.id, onUnlock],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-xs rounded-2xl bg-paper px-6 py-7 shadow-2xl ring-1 ring-ink/5"
        initial={{ scale: 0.92, y: 16, opacity: 0 }}
        animate={
          unlocking
            ? { scale: 1.04, y: -8, opacity: 0 }
            : { scale: 1, y: 0, opacity: 1 }
        }
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: unlocking ? 0.55 : 0.4, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4L4 12" />
          </svg>
        </button>

        <AnimatedLock isOpen={unlocking} color={theme.bg} />

        <div className="mt-4 text-center">
          <p className="font-serif text-lg font-bold text-ink">{book.title}</p>
          <p className="mt-1 text-xs text-ink-faint">This book is locked</p>
        </div>

        <AnimatePresence mode="wait">
          {!unlocking && (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="mt-5"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              animate={
                error
                  ? { x: [0, -8, 8, -6, 6, 0] }
                  : { x: 0 }
              }
              transition={{ duration: error ? 0.45 : 0.2 }}
            >
              <label htmlFor="book-lock-password" className="sr-only">
                Password
              </label>
              <input
                ref={inputRef}
                id="book-lock-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Enter password"
                autoFocus
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-center text-sm text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
              />
              {error && (
                <p className="mt-2 text-center text-xs text-rose-600">
                  Wrong password — try again
                </p>
              )}
              <button
                type="submit"
                className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-paper transition-all hover:brightness-110"
                style={{ backgroundColor: theme.bg }}
              >
                Unlock
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {unlocking && (
          <motion.p
            className="mt-2 text-center font-serif text-sm italic text-accent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Opening...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
