import { motion, AnimatePresence } from "framer-motion";
import { BookPageSpread } from "./BookPageSpread";
import { ReactionText } from "./ReactionText";
import { COVER_THEMES, type CoverTheme, type BookEntry } from "@/types";

interface BookOpenOverlayProps {
  book: BookEntry | null;
  onClose: () => void;
}

export function BookOpenOverlay({ book, onClose }: BookOpenOverlayProps) {
  if (!book) return null;

  const theme =
    COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.cream;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative m-4 w-full max-w-4xl"
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cover banner */}
          <div
            className="rounded-t-xl px-8 py-8"
            style={{ backgroundColor: theme.bg, color: theme.text }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-50">
                  {book.type === "wiki" ? "Wikipedia" : "A message for Ceci"}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
                  {book.title}
                </h2>
                <p className="mt-1 text-sm opacity-60">
                  by {book.authorLabel}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-black/10"
                aria-label="Close book"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Interior pages */}
          <div className="rounded-b-xl bg-white shadow-2xl">
            <BookPageSpread
              left={
                <div className="font-serif">
                  <h3 className="text-lg font-bold text-ink mb-4">
                    {book.title}
                  </h3>
                  <ReactionText
                    text={book.body}
                    reactionStyle={book.reactionStyle}
                    className="text-ink/85"
                  />
                </div>
              }
              right={
                <div className="flex flex-col justify-between h-full min-h-[200px]">
                  {book.sourceUrl ? (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-ink-faint mb-3">
                        Source
                      </p>
                      <a
                        href={book.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent underline hover:text-accent-warm"
                      >
                        {book.sourceLabel ?? "Wikipedia"}
                      </a>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-ink-faint mb-3">
                        Written by
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-deep text-sm font-medium text-ink-light">
                          {book.authorLabel.charAt(0)}
                        </div>
                        <span className="font-medium text-ink">
                          {book.authorLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-8">
                    <p className="text-xs text-ink-faint">
                      Reaction style:{" "}
                      <span className="capitalize">
                        {book.reactionStyle.replace("-", " ")}
                      </span>
                    </p>
                    <p className="text-xs text-ink-faint mt-1">
                      {new Date(book.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              }
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
