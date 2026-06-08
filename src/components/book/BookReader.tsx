import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PretextBlock } from "./PretextBlock";
import { useAppStore } from "@/store/useAppStore";
import { hasEditToken } from "@/lib/ownership";
import { COVER_THEMES, type CoverTheme, type BookEntry } from "@/types";

interface BookReaderProps {
  book: BookEntry;
  onClose: () => void;
}

type ReaderPage =
  | { type: "title" }
  | { type: "content"; text: string; images?: InlineImage[] }
  | { type: "collage"; images: InlineImage[] }
  | { type: "source" }
  | { type: "end" };

interface InlineImage {
  url: string;
  thumbnailUrl: string;
  index: number;
  aspect: "portrait" | "landscape";
}

function splitIntoPages(text: string, wordsPerPage = 115): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const pages: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(" "));
  }
  if (pages.length === 0) pages.push("");
  return pages;
}

function seededValue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function getGalleryImageUrl(image: NonNullable<BookEntry["galleryImages"]>[number]): string {
  return typeof image === "string" ? image : image.url;
}

function getGalleryThumbnailUrl(image: NonNullable<BookEntry["galleryImages"]>[number]): string {
  return typeof image === "string" ? image : image.thumbnailUrl ?? image.url;
}

function getGalleryAspect(image: NonNullable<BookEntry["galleryImages"]>[number]): "portrait" | "landscape" {
  return typeof image === "string" ? "landscape" : image.aspect ?? "landscape";
}

function shuffleImages(images: InlineImage[], seed: string): InlineImage[] {
  return [...images].sort((a, b) => seededValue(`${seed}-${a}`) - seededValue(`${seed}-${b}`));
}

export function BookReader({ book, onClose }: BookReaderProps) {
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<{ dir: 1 | -1; from: number } | null>(null);
  const effectsEnabled = useAppStore((s) => s.effectsEnabled);
  const setEffectsEnabled = useAppStore((s) => s.setEffectsEnabled);
  const setActiveLightboxImage = useAppStore((s) => s.setActiveLightboxImage);

  const theme = COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;
  const canEdit = hasEditToken(book.id);

  const pages = useMemo(() => {
    const contentPages = splitIntoPages(book.body);
    const galleryImages = shuffleImages(
      (book.galleryImages?.slice(0, 8) ?? []).map((image, index) => ({
        url: getGalleryImageUrl(image),
        thumbnailUrl: getGalleryThumbnailUrl(image),
        aspect: getGalleryAspect(image),
        index,
      })),
      book.id,
    );
    const bookPages: ReaderPage[] = [
      { type: "title" as const },
    ];

    contentPages.forEach((text, pageIndex) => {
      const slot = Math.floor(((pageIndex + 1) * galleryImages.length) / contentPages.length);
      const previousSlot = Math.floor((pageIndex * galleryImages.length) / contentPages.length);
      const images = galleryImages.slice(previousSlot, slot);
      bookPages.push({ type: "content" as const, text, images });
    });

    if (bookPages.length % 2 !== 0) {
      bookPages.push({ type: "collage" as const, images: galleryImages.slice(-4) });
    }
    bookPages.push({ type: "source" as const });
    bookPages.push({ type: "end" as const });
    return bookPages;
  }, [book.body, book.galleryImages, book.id]);

  const totalSpreads = Math.ceil(pages.length / 2);

  // While a flip animates we keep the previous spread mounted and reveal the
  // incoming page underneath the turning leaf, so the static sides differ from
  // a plain `spread`-based lookup.
  let leftIdx = spread * 2;
  let rightIdx = spread * 2 + 1;
  if (flip) {
    const s = flip.from;
    if (flip.dir === 1) {
      leftIdx = s * 2;
      rightIdx = s * 2 + 3;
    } else {
      leftIdx = s * 2 - 2;
      rightIdx = s * 2 + 1;
    }
  }
  const leftPage = pages[leftIdx] ?? null;
  const rightPage = pages[rightIdx] ?? null;

  const renderPage = useCallback(
    (page: ReaderPage | null, pageNum: number) => {
      if (!page) return <div className="flex-1" />;
      switch (page.type) {
        case "title":
          return <TitlePage book={book} theme={theme} onOpenImage={setActiveLightboxImage} />;
        case "content":
          return (
            <ContentPage
              text={page.text}
              images={page.images}
              onOpenImage={setActiveLightboxImage}
              reactionStyle={book.reactionStyle}
              effectsEnabled={effectsEnabled}
              pageNum={pageNum}
            />
          );
        case "source":
          return <SourcePage book={book} theme={theme} />;
        case "end":
          return <EndPage book={book} theme={theme} onOpenImage={setActiveLightboxImage} />;
        case "collage":
          return <CollagePage images={page.images} onOpenImage={setActiveLightboxImage} />;
        default:
          return <div className="flex-1" />;
      }
    },
    [book, theme, effectsEnabled, setActiveLightboxImage],
  );

  const nextSpread = useCallback(() => {
    if (flip || spread >= totalSpreads - 1) return;
    setFlip({ dir: 1, from: spread });
  }, [flip, spread, totalSpreads]);

  const prevSpread = useCallback(() => {
    if (flip || spread <= 0) return;
    setFlip({ dir: -1, from: spread });
  }, [flip, spread]);

  const handleFlipComplete = useCallback(() => {
    setFlip((f) => {
      if (!f) return null;
      setSpread(f.from + f.dir);
      return null;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSpread();
      if (e.key === "ArrowLeft") prevSpread();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextSpread, prevSpread, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-3"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClose}
    >
      {/* Minimal header - just back + effects toggle, no title */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/submit?edit=${book.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10z" />
              </svg>
              Edit
            </Link>
          )}
          <button
            onClick={() => setEffectsEnabled(!effectsEnabled)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${
              effectsEnabled
                ? "bg-white text-ink shadow-md"
                : "bg-white/30 text-white hover:bg-white/50"
            }`}
          >
            {effectsEnabled ? "\u2728 Effects ON" : "Effects OFF"}
          </button>
        </div>
      </div>

      {/* Open book - fills nearly all viewport height */}
      <div
        className="relative flex w-full max-w-[1000px] mx-3"
        style={{ height: "calc(100vh - 76px)", perspective: "2000px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative flex w-full h-full rounded-lg overflow-hidden"
          style={{
            transformStyle: "preserve-3d",
            boxShadow: "0 25px 80px rgba(0,0,0,0.4), 0 5px 20px rgba(0,0,0,0.2)",
          }}
        >
          {/* Left page */}
          <div
            className="w-1/2 h-full relative cursor-w-resize overflow-hidden"
            style={{ background: "#FDFBF7", boxShadow: "inset -12px 0 30px -8px rgba(0,0,0,0.07)" }}
            onClick={prevSpread}
          >
            <div className="px-5 py-4 h-full min-h-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
              {renderPage(leftPage, leftIdx)}
            </div>
            <div className="absolute top-0 right-0 w-[3px] h-full" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))" }} />
          </div>

          {/* Center fold */}
          <div className="w-[2px] shrink-0" style={{ background: "linear-gradient(180deg, #C8BFA8 0%, #A89880 30%, #A89880 70%, #C8BFA8 100%)" }} />

          {/* Right page */}
          <div
            className="w-1/2 h-full relative cursor-e-resize overflow-hidden"
            style={{ background: "#FDFBF7", boxShadow: "inset 12px 0 30px -8px rgba(0,0,0,0.07)" }}
            onClick={nextSpread}
          >
            <div className="px-5 py-4 h-full min-h-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
              {renderPage(rightPage, rightIdx)}
            </div>
            <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))" }} />
          </div>

          {/* Turning leaf */}
          <AnimatePresence>
            {flip && (
              <FlipPage
                key={`${flip.dir}-${flip.from}`}
                flip={flip}
                pages={pages}
                renderPage={renderPage}
                onComplete={handleFlipComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Compact footer navigation */}
      <div className="mt-1.5 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={prevSpread} disabled={spread === 0} className="rounded-full bg-white p-2 text-ink shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:shadow-md disabled:scale-100 disabled:bg-white/50 disabled:opacity-30">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4L6 9l5 5" /></svg>
        </button>
        <span className="text-xs text-white/60 font-medium min-w-[60px] text-center">
          {spread * 2 + 1}{"\u2013"}{Math.min(spread * 2 + 2, pages.length)} of {pages.length}
        </span>
        <button onClick={nextSpread} disabled={spread >= totalSpreads - 1} className="rounded-full bg-white p-2 text-ink shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:shadow-md disabled:scale-100 disabled:bg-white/50 disabled:opacity-30">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 4l5 5-5 5" /></svg>
        </button>
      </div>
    </motion.div>
  );
}

function FlipPage({
  flip,
  pages,
  renderPage,
  onComplete,
}: {
  flip: { dir: 1 | -1; from: number };
  pages: ReaderPage[];
  renderPage: (page: ReaderPage | null, pageNum: number) => ReactNode;
  onComplete: () => void;
}) {
  const s = flip.from;
  const isNext = flip.dir === 1;

  // The leaf that physically turns: its front is the page currently facing the
  // reader, its back is the page that will be revealed on the opposite side.
  const frontIdx = isNext ? s * 2 + 1 : s * 2;
  const backIdx = isNext ? s * 2 + 2 : s * 2 - 1;
  const frontPage = pages[frontIdx] ?? null;
  const backPage = pages[backIdx] ?? null;

  return (
    <motion.div
      className="absolute top-0 h-full"
      style={{
        width: "calc(50% - 1px)",
        [isNext ? "right" : "left"]: 0,
        transformStyle: "preserve-3d",
        transformOrigin: isNext ? "left center" : "right center",
        zIndex: 30,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isNext ? -180 : 180 }}
      transition={{ duration: 0.72, ease: [0.42, 0, 0.2, 1] }}
      onAnimationComplete={onComplete}
    >
      {/* Front face (page lifting up) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ backfaceVisibility: "hidden", background: "#FDFBF7" }}
      >
        <div className="px-5 py-4 h-full min-h-0 flex flex-col">
          {renderPage(frontPage, frontIdx)}
        </div>
        {/* Shadow that deepens as the leaf rises */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isNext
              ? "linear-gradient(to left, rgba(0,0,0,0.45), rgba(0,0,0,0))"
              : "linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0.2] }}
          transition={{ duration: 0.72, ease: "easeInOut" }}
        />
      </div>

      {/* Back face (underside of the leaf, settling into place) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "#FDFBF7",
        }}
      >
        <div className="px-5 py-4 h-full min-h-0 flex flex-col">
          {renderPage(backPage, backIdx)}
        </div>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isNext
              ? "linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0))"
              : "linear-gradient(to left, rgba(0,0,0,0.4), rgba(0,0,0,0))",
          }}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: [0.55, 0.25, 0] }}
          transition={{ duration: 0.72, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

function TitlePage({
  book,
  theme,
  onOpenImage,
}: {
  book: BookEntry;
  theme: { bg: string; text: string };
  onOpenImage: (url: string | null) => void;
}) {
  const sender = book.senderName || (book.type === "friend" ? book.authorLabel : undefined);
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-2">
      {sender && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mb-2">
          Sent by {sender}
        </p>
      )}
      {!sender && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mb-2">
          A message for Ceci
        </p>
      )}
      <div className="w-16 h-[1px] mb-4" style={{ backgroundColor: theme.bg }} />
      <h1 className="font-serif text-3xl font-bold text-ink leading-tight mb-3">{book.title}</h1>
      <div className="w-8 h-8 rotate-45 mb-3" style={{ backgroundColor: theme.bg, opacity: 0.3 }} />

      {book.images && book.images.length > 0 && (
        <button
          type="button"
          onClick={() => onOpenImage(book.images[0])}
          className="mt-1 w-full max-w-[280px] overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-[1.01]"
          aria-label={`Open ${book.title} image`}
        >
          <img src={book.images[0]} alt={book.title} className="w-full h-auto object-cover" />
        </button>
      )}

      {sender && (
        <p className="mt-3 text-sm text-ink-light italic">from {sender}</p>
      )}
    </div>
  );
}

function ContentPage({
  text,
  images = [],
  onOpenImage,
  reactionStyle,
  effectsEnabled,
  pageNum,
}: {
  text: string;
  images?: InlineImage[];
  onOpenImage: (url: string | null) => void;
  reactionStyle: BookEntry["reactionStyle"];
  effectsEnabled: boolean;
  pageNum: number;
}) {
  const portraitImage = images.find((image) => image.aspect === "portrait");
  const landscapeImages = images.filter((image) => image !== portraitImage);

  if (portraitImage) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mx-auto flex-1 min-h-0 w-full max-w-[390px] overflow-y-auto pr-2 [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => onOpenImage(portraitImage.url)}
            className="float-right mb-3 ml-4 w-[42%] overflow-hidden rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-ink/5 transition-transform hover:scale-[1.01]"
            aria-label={`Open memory ${portraitImage.index + 1}`}
          >
            <img
              src={portraitImage.thumbnailUrl}
              alt={`Memory ${portraitImage.index + 1}`}
              className="h-64 w-full rounded-lg object-cover"
            />
          </button>
          <p className="whitespace-pre-line text-left font-serif text-[14px] leading-[24px] text-ink/85">
            {text}
          </p>
        </div>

        {landscapeImages.length > 0 && (
          <InlineImageGrid images={landscapeImages} onOpenImage={onOpenImage} />
        )}
        <p className="text-center text-[9px] text-ink-faint mt-1 shrink-0">{pageNum}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mx-auto flex-1 min-h-0 w-full max-w-[380px] overflow-y-auto pr-2 font-serif text-[14px] text-ink/85 leading-[24px] [scrollbar-width:thin]">
        <PretextBlock
          text={text}
          reactionStyle={reactionStyle}
          effectsEnabled={effectsEnabled}
          font='14px "Merriweather", Georgia, serif'
          lineHeight={24}
        />
      </div>
      {images.length > 0 && (
        <InlineImageGrid images={images} onOpenImage={onOpenImage} />
      )}
      <p className="text-center text-[9px] text-ink-faint mt-1 shrink-0">{pageNum}</p>
    </div>
  );
}

function InlineImageGrid({
  images,
  onOpenImage,
}: {
  images: InlineImage[];
  onOpenImage: (url: string | null) => void;
}) {
  return (
    <div className={`mx-auto mt-3 grid w-full max-w-[360px] shrink-0 gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {images.map((image) => (
        <button
          key={`${image.index}-${image.url}`}
          type="button"
          onClick={() => onOpenImage(image.url)}
          className="overflow-hidden rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-ink/5 transition-transform hover:scale-[1.01]"
          aria-label={`Open memory ${image.index + 1}`}
        >
          <img
            src={image.thumbnailUrl}
            alt={`Memory ${image.index + 1}`}
            className="h-36 w-full rounded-lg object-cover"
          />
        </button>
      ))}
    </div>
  );
}

function CollagePage({
  images,
  onOpenImage,
}: {
  images: InlineImage[];
  onOpenImage: (url: string | null) => void;
}) {
  if (images.length === 0) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-3 text-center">
      <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Memories
      </p>
      <div className="grid w-full max-w-[360px] grid-cols-2 gap-3">
        {images.map((image) => (
          <button
            key={`${image.index}-${image.url}`}
            type="button"
            onClick={() => onOpenImage(image.url)}
            className="overflow-hidden rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-ink/5 transition-transform hover:scale-[1.01]"
            aria-label={`Open memory ${image.index + 1}`}
          >
            <img
              src={image.thumbnailUrl}
              alt={`Memory ${image.index + 1}`}
              className="h-40 w-full rounded-lg object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcePage({ book, theme }: { book: BookEntry; theme: { bg: string; text: string } }) {
  const sender = book.senderName || (book.type === "friend" ? book.authorLabel : undefined);

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
      <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Book details
      </p>
      <div className="mb-5 h-[1px] w-16" style={{ backgroundColor: theme.bg, opacity: 0.22 }} />
      <h2 className="mb-3 font-serif text-2xl font-bold leading-tight text-ink">
        {book.title}
      </h2>
      {sender && (
        <p className="mb-5 max-w-[280px] text-sm text-ink-light">
          Added by {sender}
        </p>
      )}
      {book.sourceUrl && (
        <a
          href={book.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[260px] text-sm font-medium leading-relaxed text-accent underline decoration-accent/30 underline-offset-4 hover:text-accent-warm"
        >
          Read the full Wikipedia article &rarr;
        </a>
      )}
    </div>
  );
}

function EndPage({
  book,
  theme,
  onOpenImage,
}: {
  book: BookEntry;
  theme: { bg: string; text: string };
  onOpenImage: (url: string | null) => void;
}) {
  const sender = book.senderName || (book.type === "friend" ? book.authorLabel : undefined);
  const portraitUrl = book.avatarUrl || book.images?.[0];
  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-y-auto px-4 py-5 text-center [scrollbar-width:thin]">
      {portraitUrl && (
        <button
          type="button"
          onClick={() => onOpenImage(portraitUrl)}
          className="mb-4 h-40 w-40 shrink-0 overflow-hidden rounded-full shadow-xl ring-4 ring-white transition-transform hover:scale-[1.02]"
          aria-label="Open sender photo"
        >
          <img src={portraitUrl} alt={sender || "Sender"} className="h-full w-full object-cover" />
        </button>
      )}

      {sender && (
        <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          {book.senderMessage ? `A note from ${sender}` : `Sent by ${sender}`}
        </p>
      )}

      {book.senderMessage && (
        <p className="mb-4 max-w-[340px] whitespace-pre-line font-serif text-[14px] leading-[23px] text-ink/75 italic">
          &ldquo;{book.senderMessage}&rdquo;
        </p>
      )}

      <div className="my-2 h-[1px] w-12" style={{ backgroundColor: theme.bg, opacity: 0.18 }} />
      <p className="mb-3 font-serif text-base text-ink/50 italic">Fin</p>

      {book.sourceUrl && (
        <div className="mt-1 mb-2">
          <a
            href={book.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline hover:text-accent-warm leading-snug"
          >
            Read the full article on Wikipedia &rarr;
          </a>
        </div>
      )}

      {sender && (
        <p className="mt-3 text-[10px] text-ink-faint">
          Added to Ceci&apos;s library by {sender}
        </p>
      )}
    </div>
  );
}
