import { Suspense, lazy } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAppStore } from "@/store/useAppStore";
import { COVER_THEMES, type CoverTheme } from "@/types";

const HeroBookScene = lazy(() =>
  import("@/components/hero/HeroBookScene").then((m) => ({
    default: m.HeroBookScene,
  })),
);

export function HomePage() {
  const books = useAppStore((s) => s.books);
  const loading = useAppStore((s) => s.loading);
  const featuredBooks = books.filter((b) => b.isFeatured);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border-light">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
              CC See You Later Wall
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-light">
              A library of messages, memories, and pages for Ceci.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="#library">
                <Button variant="primary">Open the Library</Button>
              </a>
              <Link to="/submit">
                <Button variant="secondary">Leave a Message</Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Decorative floating books placeholder -- TODO: Figma alignment point */}
        <div className="absolute top-8 right-8 hidden opacity-20 lg:block">
          <div className="flex gap-3 rotate-[-8deg]">
            {["cream", "sage", "lavender"].map((theme) => (
              <div
                key={theme}
                className="h-32 w-24 rounded-sm shadow-md"
                style={{
                  backgroundColor:
                    COVER_THEMES[theme as CoverTheme].bg,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3D Book Gallery */}
      <section
        id="library"
        className="border-b border-border-light bg-paper-warm"
      >
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-ink">
            The Library
          </h2>
          <p className="mt-2 text-sm text-ink-light">
            Click a book twice to open it. Scroll to browse.
          </p>
        </div>

        {/* 3D scene -- lazy-loaded and hidden on mobile for performance */}
        <div className="hidden sm:block">
          <Suspense
            fallback={
              <div className="flex h-[420px] items-center justify-center">
                <LoadingState message="Loading 3D library..." />
              </div>
            }
          >
            <HeroBookScene />
          </Suspense>
        </div>

        {/* Fallback card grid below 3D scene */}
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book, i) => (
              <BookCard key={book.id} book={book} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Messages */}
      {featuredBooks.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-ink">
            Featured Messages
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredBooks.map((book, i) => (
              <FeaturedCard key={book.id} book={book} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Contributors Strip */}
      {books.filter((b) => b.type === "friend").length > 0 && (
        <section className="border-t border-border-light bg-paper-warm">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
              Contributors
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {books
                .filter((b) => b.type === "friend")
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-deep text-xs font-medium text-ink-light">
                      {b.authorLabel.charAt(0)}
                    </div>
                    <span className="text-sm text-ink">{b.authorLabel}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {books.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <p className="font-serif text-xl text-ink-light italic">
            The first page is waiting to be written.
          </p>
          <Link to="/submit">
            <Button variant="primary" className="mt-6">
              Leave a Message
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}

function BookCard({
  book,
  index,
}: {
  book: { id: string; title: string; authorLabel: string; coverTheme: string; type: string };
  index: number;
}) {
  const theme =
    COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.cream;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={`/book/${book.id}`} className="group block">
        <div className="relative overflow-hidden rounded-lg shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
          {/* Book cover */}
          <div
            className="flex aspect-[3/4] flex-col justify-between p-4"
            style={{ backgroundColor: theme.bg, color: theme.text }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-60">
                {book.type === "wiki" ? "Wikipedia" : "Message"}
              </p>
              <h3 className="mt-2 font-serif text-sm font-bold leading-snug">
                {book.title}
              </h3>
            </div>
            <p className="text-xs opacity-70">{book.authorLabel}</p>
          </div>
          {/* Spine */}
          <div
            className="absolute top-0 left-0 h-full w-1.5"
            style={{
              backgroundColor: theme.text,
              opacity: 0.15,
            }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

function FeaturedCard({
  book,
  index,
}: {
  book: { id: string; title: string; authorLabel: string; body: string; coverTheme: string };
  index: number;
}) {
  const theme =
    COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.cream;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/book/${book.id}`} className="group block">
        <div className="paper-card overflow-hidden transition-shadow duration-300 group-hover:shadow-lg">
          <div
            className="h-2"
            style={{ backgroundColor: theme.bg }}
          />
          <div className="p-5">
            <h3 className="font-serif text-base font-bold text-ink">
              {book.title}
            </h3>
            <p className="mt-1 text-xs text-ink-faint">{book.authorLabel}</p>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-light">
              {book.body}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
