import { useState, useCallback, useEffect, Suspense, lazy } from "react";
import { Link } from "react-router";
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { BookReader } from "@/components/book/BookReader";
import { BookLockGate } from "@/components/book/BookLockGate";
import { isBookLocked, isBookUnlocked } from "@/lib/bookLock";

const Library3D = lazy(() =>
  import("@/components/book/Library3D").then((m) => ({ default: m.Library3D }))
);

export function HomePage() {
  const books = useAppStore((s) => s.books);
  const loading = useAppStore((s) => s.loading);
  const [readingBookIndex, setReadingBookIndex] = useState<number | null>(null);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  const readingBook = readingBookIndex !== null ? books[readingBookIndex] : null;
  const needsLock =
    readingBook &&
    isBookLocked(readingBook) &&
    !isBookUnlocked(readingBook.id) &&
    !sessionUnlocked;

  useEffect(() => {
    setSessionUnlocked(false);
  }, [readingBookIndex]);

  const handleSelectBook = useCallback((index: number) => {
    setReadingBookIndex(index);
  }, []);

  const handleCloseBook = useCallback(() => {
    setReadingBookIndex(null);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-paper">
        <LoadingState message="Opening the library..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      {/* 3D Bookshelf */}
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-paper">
            <LoadingState message="Building your library..." />
          </div>
        }
      >
        {books.length > 0 && (
          <Library3D books={books} onSelectBook={handleSelectBook} />
        )}
      </Suspense>

      {/* Floating UI (only visible when NOT reading a book) */}
      {!readingBook && (
        <div className="pointer-events-none fixed inset-0 z-10">
          <div className="pointer-events-auto flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="font-serif text-xl font-bold text-ink/80 drop-shadow-sm">
                Ceci&apos;s Library
              </h1>
              <p className="text-xs text-ink-light/60">
                Con todo el amor y cariño para ti
              </p>
            </div>
            <Link
              to="/submit"
              className="rounded-lg bg-white/80 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
            >
              Leave a Message
            </Link>
          </div>

          {books.length > 0 && (
            <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center">
              <p className="text-sm text-ink-light/50 drop-shadow-sm">
                Hover to pull out a book &middot; Click to read
              </p>
            </div>
          )}

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
      )}

      {/* Password gate + full-screen Book Reader */}
      <AnimatePresence>
        {readingBook && needsLock && (
          <BookLockGate
            key={`lock-${readingBook.id}`}
            book={readingBook}
            onUnlock={() => setSessionUnlocked(true)}
            onClose={handleCloseBook}
          />
        )}
        {readingBook && !needsLock && (
          <BookReader key={`reader-${readingBook.id}`} book={readingBook} onClose={handleCloseBook} />
        )}
      </AnimatePresence>
    </div>
  );
}
