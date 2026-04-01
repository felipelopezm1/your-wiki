import { useState, useCallback, Suspense, lazy } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { BookOpenOverlay } from "@/components/book/BookOpenOverlay";

const Library3D = lazy(() =>
  import("@/components/book/Library3D").then((m) => ({ default: m.Library3D }))
);

export function HomePage() {
  const books = useAppStore((s) => s.books);
  const loading = useAppStore((s) => s.loading);
  const [activeBookIndex, setActiveBookIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const activeBook = activeBookIndex !== null ? books[activeBookIndex] : null;

  const handleSelectBook = useCallback(
    (index: number) => {
      if (activeBookIndex === index) {
        setShowOverlay(true);
      } else {
        setActiveBookIndex(index);
        setCurrentPage(0);
      }
    },
    [activeBookIndex]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleCloseBook = useCallback(() => {
    setActiveBookIndex(null);
    setCurrentPage(0);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const handlePrevBook = useCallback(() => {
    setActiveBookIndex((prev) => {
      if (prev === null || prev === 0) return prev;
      setCurrentPage(0);
      return prev - 1;
    });
  }, []);

  const handleNextBook = useCallback(() => {
    setActiveBookIndex((prev) => {
      if (prev === null || prev >= books.length - 1) return prev;
      setCurrentPage(0);
      return prev + 1;
    });
  }, [books.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-paper">
        <LoadingState message="Opening the library..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      {/* Full-screen 3D library */}
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-paper">
            <LoadingState message="Building your library..." />
          </div>
        }
      >
        {books.length > 0 && (
          <Library3D
            books={books}
            activeBookIndex={activeBookIndex}
            onSelectBook={handleSelectBook}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
      </Suspense>

      {/* Floating UI overlay */}
      <div className="pointer-events-none fixed inset-0 z-10">
        {/* Top bar */}
        <div className="pointer-events-auto flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-serif text-xl font-bold text-ink/80 drop-shadow-sm">
              Weeeeki
            </h1>
            <p className="text-xs text-ink-light/60">
              A digital library for Ceci
            </p>
          </div>
          <Link
            to="/submit"
            className="rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
          >
            Leave a Message
          </Link>
        </div>

        {/* Book navigation when a book is active */}
        <AnimatePresence>
          {activeBook && !showOverlay && (
            <motion.div
              className="pointer-events-auto absolute bottom-0 left-0 right-0"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="mx-auto max-w-xl px-4 pb-8">
                {/* Book info card */}
                <div className="rounded-2xl bg-white/90 p-5 shadow-lg backdrop-blur-md">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-ink-faint">
                        {activeBook.type === "wiki"
                          ? "Wikipedia"
                          : "Friend's message"}
                      </p>
                      <h2 className="mt-1 truncate font-serif text-lg font-bold text-ink">
                        {activeBook.title}
                      </h2>
                      <p className="text-sm text-ink-light">
                        {activeBook.authorLabel}
                      </p>
                    </div>
                    <button
                      onClick={handleCloseBook}
                      className="ml-3 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-paper-warm hover:text-ink"
                      aria-label="Close book"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l8 8M12 4L4 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Page navigation */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="rounded-lg bg-paper-warm px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper-deep disabled:opacity-30"
                    >
                      &larr; Prev
                    </button>
                    <div className="flex-1 text-center text-xs text-ink-faint">
                      Click the book to turn pages
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="rounded-lg bg-paper-warm px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper-deep"
                    >
                      Next &rarr;
                    </button>
                  </div>

                  {/* Read full + browse controls */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setShowOverlay(true)}
                      className="flex-1 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
                    >
                      Read Full Article
                    </button>
                    <button
                      onClick={handlePrevBook}
                      disabled={activeBookIndex === 0}
                      className="rounded-lg bg-paper-warm px-3 py-2 text-ink transition-colors hover:bg-paper-deep disabled:opacity-30"
                      aria-label="Previous book"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 3L5 7l4 4" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextBook}
                      disabled={activeBookIndex !== null && activeBookIndex >= books.length - 1}
                      className="rounded-lg bg-paper-warm px-3 py-2 text-ink transition-colors hover:bg-paper-deep disabled:opacity-30"
                      aria-label="Next book"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 3l4 4-4 4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instruction hint when no book is selected */}
        <AnimatePresence>
          {!activeBook && books.length > 0 && (
            <motion.div
              className="pointer-events-none absolute bottom-8 left-0 right-0 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1 }}
            >
              <p className="text-sm text-ink-light/50 drop-shadow-sm">
                Click a book to explore it
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {books.length === 0 && !loading && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-2xl text-ink-light italic">
                The first page is waiting to be written.
              </p>
              <Link
                to="/submit"
                className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper shadow-md transition-colors hover:bg-ink/90"
              >
                Leave a Message
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Book reading overlay (Pretext-powered) */}
      <AnimatePresence>
        {showOverlay && activeBook && (
          <BookOpenOverlay book={activeBook} onClose={handleCloseOverlay} />
        )}
      </AnimatePresence>
    </div>
  );
}
