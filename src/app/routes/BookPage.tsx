import { useParams, Link } from "react-router";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { BookPageSpread } from "@/components/book/BookPageSpread";
import { ReactionText } from "@/components/book/ReactionText";
import { AsciiImage } from "@/components/media/AsciiImage";
import { COVER_THEMES, type CoverTheme } from "@/types";
import { motion } from "framer-motion";

export function BookPage() {
  const { id } = useParams<{ id: string }>();
  const books = useAppStore((s) => s.books);
  const setLightbox = useAppStore((s) => s.setActiveLightboxImage);
  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <p className="font-serif text-xl text-ink-light italic">
          This page seems to be missing.
        </p>
        <Link to="/">
          <Button className="mt-6">Back to Library</Button>
        </Link>
      </div>
    );
  }

  const theme =
    COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.cream;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-ink-light hover:text-ink transition-colors"
      >
        &larr; Back to Library
      </Link>

      <motion.article
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Cover banner */}
        <div
          className="rounded-t-xl px-8 py-8"
          style={{ backgroundColor: theme.bg, color: theme.text }}
        >
          <p className="text-xs uppercase tracking-widest opacity-50">
            {book.type === "wiki" ? "Wikipedia" : "A message for Ceci"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold">{book.title}</h1>
          <p className="mt-1 text-sm opacity-60">by {book.authorLabel}</p>
        </div>

        {/* Book interior with page spread */}
        <div className="rounded-b-xl bg-white shadow-xl">
          <BookPageSpread
            left={
              <div className="font-serif">
                <h2 className="text-lg font-bold text-ink mb-4">
                  {book.title}
                </h2>
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

                {book.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-ink-faint mb-2">
                      Images
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {book.images.map((src, i) => (
                        <AsciiImage
                          key={i}
                          src={src}
                          alt={`${book.title} image ${i + 1}`}
                          width={40}
                          className="w-20 h-20 rounded border border-border overflow-hidden"
                          onClick={() => setLightbox(src)}
                        />
                      ))}
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
      </motion.article>
    </div>
  );
}
