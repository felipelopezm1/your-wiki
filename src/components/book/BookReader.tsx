import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PretextBlock } from "./PretextBlock";
import { useAppStore } from "@/store/useAppStore";
import { COVER_THEMES, type CoverTheme, type BookEntry } from "@/types";

interface BookReaderProps {
  book: BookEntry;
  onClose: () => void;
}

function splitIntoPages(text: string, wordsPerPage = 80): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const pages: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(" "));
  }
  if (pages.length === 0) pages.push("");
  return pages;
}

export function BookReader({ book, onClose }: BookReaderProps) {
  const [spread, setSpread] = useState(0);
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const effectsEnabled = useAppStore((s) => s.effectsEnabled);
  const setEffectsEnabled = useAppStore((s) => s.setEffectsEnabled);

  const theme = COVER_THEMES[book.coverTheme as CoverTheme] ?? COVER_THEMES.burgundy;

  const pages = useMemo(() => {
    const contentPages = splitIntoPages(book.body);
    return [
      { type: "title" as const },
      ...contentPages.map((text) => ({ type: "content" as const, text })),
      { type: "end" as const },
    ];
  }, [book.body]);

  const totalSpreads = Math.ceil(pages.length / 2);

  const leftPage = pages[spread * 2] ?? null;
  const rightPage = pages[spread * 2 + 1] ?? null;

  const nextSpread = useCallback(() => {
    if (spread < totalSpreads - 1) {
      setFlipDir(1);
      setSpread((s) => s + 1);
    }
  }, [spread, totalSpreads]);

  const prevSpread = useCallback(() => {
    if (spread > 0) {
      setFlipDir(-1);
      setSpread((s) => s - 1);
    }
  }, [spread]);

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(180deg, #E8DFD0 0%, #D4C9B8 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg bg-white/70 px-4 py-2 text-sm font-medium text-ink backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to Shelf
        </button>

        <div className="text-center">
          <h2 className="font-serif text-lg font-bold text-ink/80">{book.title}</h2>
          <p className="text-xs text-ink-light/60">{book.authorLabel}</p>
        </div>

        {/* Effects toggle */}
        <button
          onClick={() => setEffectsEnabled(!effectsEnabled)}
          className={`rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all ${
            effectsEnabled
              ? "bg-ink text-paper shadow-md"
              : "bg-white/70 text-ink hover:bg-white"
          }`}
        >
          {effectsEnabled ? "\u2728 Effects ON" : "Effects OFF"}
        </button>
      </div>

      {/* Open book */}
      <div className="relative flex max-w-[960px] w-full mx-4">
        {/* Click zones for page turning */}
        <button
          onClick={prevSpread}
          disabled={spread === 0}
          className="absolute left-0 top-0 bottom-0 w-1/2 z-20 cursor-w-resize disabled:cursor-default"
          aria-label="Previous page"
        />
        <button
          onClick={nextSpread}
          disabled={spread >= totalSpreads - 1}
          className="absolute right-0 top-0 bottom-0 w-1/2 z-20 cursor-e-resize disabled:cursor-default"
          aria-label="Next page"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={spread}
            className="flex w-full rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden"
            initial={{ x: flipDir * 40, opacity: 0, rotateY: flipDir * 8 }}
            animate={{ x: 0, opacity: 1, rotateY: 0 }}
            exit={{ x: flipDir * -40, opacity: 0, rotateY: flipDir * -8 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{ perspective: 1200 }}
          >
            {/* Left page */}
            <div
              className="w-1/2 min-h-[520px] relative overflow-hidden"
              style={{
                background: "#FDFBF7",
                boxShadow: "inset -12px 0 25px -8px rgba(0,0,0,0.06)",
              }}
            >
              <div className="p-8 h-full flex flex-col">
                {leftPage?.type === "title" ? (
                  <TitlePage book={book} theme={theme} />
                ) : leftPage?.type === "content" ? (
                  <ContentPage
                    text={leftPage.text}
                    reactionStyle={book.reactionStyle}
                    effectsEnabled={effectsEnabled}
                    pageNum={spread * 2}
                  />
                ) : leftPage?.type === "end" ? (
                  <EndPage book={book} theme={theme} />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              {/* Center fold shadow */}
              <div
                className="absolute top-0 right-0 w-[3px] h-full"
                style={{
                  background: "linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
                }}
              />
            </div>

            {/* Center fold */}
            <div
              className="w-[2px] shrink-0"
              style={{
                background: "linear-gradient(180deg, #C8BFA8 0%, #A89880 30%, #A89880 70%, #C8BFA8 100%)",
              }}
            />

            {/* Right page */}
            <div
              className="w-1/2 min-h-[520px] relative overflow-hidden"
              style={{
                background: "#FDFBF7",
                boxShadow: "inset 12px 0 25px -8px rgba(0,0,0,0.06)",
              }}
            >
              <div className="p-8 h-full flex flex-col">
                {rightPage?.type === "title" ? (
                  <TitlePage book={book} theme={theme} />
                ) : rightPage?.type === "content" ? (
                  <ContentPage
                    text={rightPage.text}
                    reactionStyle={book.reactionStyle}
                    effectsEnabled={effectsEnabled}
                    pageNum={spread * 2 + 1}
                  />
                ) : rightPage?.type === "end" ? (
                  <EndPage book={book} theme={theme} />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              {/* Center fold shadow */}
              <div
                className="absolute top-0 left-0 w-[3px] h-full"
                style={{
                  background: "linear-gradient(270deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={prevSpread}
          disabled={spread === 0}
          className="rounded-full bg-white/70 p-2.5 text-ink backdrop-blur-sm transition-all hover:bg-white hover:shadow-md disabled:opacity-30"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4L6 9l5 5" />
          </svg>
        </button>
        <span className="text-sm text-ink/60 font-medium min-w-[80px] text-center">
          {spread * 2 + 1}\u2013{Math.min(spread * 2 + 2, pages.length)} of {pages.length}
        </span>
        <button
          onClick={nextSpread}
          disabled={spread >= totalSpreads - 1}
          className="rounded-full bg-white/70 p-2.5 text-ink backdrop-blur-sm transition-all hover:bg-white hover:shadow-md disabled:opacity-30"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 4l5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* Effect style hint */}
      {effectsEnabled && (
        <motion.p
          className="mt-3 text-xs text-ink/40 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Hover over the text to see the {book.reactionStyle.replace("-", " ")} effect
        </motion.p>
      )}
    </motion.div>
  );
}

function TitlePage({
  book,
  theme,
}: {
  book: BookEntry;
  theme: { bg: string; text: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mb-6">
        {book.type === "wiki" ? "Wikipedia" : "A message for Ceci"}
      </p>
      <div
        className="w-16 h-[1px] mb-8"
        style={{ backgroundColor: theme.bg }}
      />
      <h1 className="font-serif text-3xl font-bold text-ink leading-tight mb-4">
        {book.title}
      </h1>
      <div
        className="w-8 h-8 rotate-45 mb-6"
        style={{ backgroundColor: theme.bg, opacity: 0.3 }}
      />
      <p className="text-sm text-ink-light italic">{book.authorLabel}</p>
      {book.sourceUrl && (
        <a
          href={book.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-xs text-accent underline hover:text-accent-warm"
        >
          {book.sourceLabel ?? "Source"}
        </a>
      )}
    </div>
  );
}

function ContentPage({
  text,
  reactionStyle,
  effectsEnabled,
  pageNum,
}: {
  text: string;
  reactionStyle: BookEntry["reactionStyle"];
  effectsEnabled: boolean;
  pageNum: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 font-serif text-ink/85">
        <PretextBlock
          text={text}
          reactionStyle={reactionStyle}
          effectsEnabled={effectsEnabled}
        />
      </div>
      <p className="text-center text-[10px] text-ink-faint mt-4">{pageNum}</p>
    </div>
  );
}

function EndPage({
  book,
  theme,
}: {
  book: BookEntry;
  theme: { bg: string; text: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div
        className="w-10 h-10 rotate-45 mb-8"
        style={{ backgroundColor: theme.bg, opacity: 0.2 }}
      />
      <p className="font-serif text-lg text-ink/60 italic mb-4">Fin</p>
      <div className="w-12 h-[1px] bg-ink/10 mb-6" />
      <p className="text-xs text-ink-faint">
        Effect: <span className="capitalize">{book.reactionStyle.replace("-", " ")}</span>
      </p>
      {book.sourceUrl && (
        <a
          href={book.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-accent underline hover:text-accent-warm"
        >
          Read full article on Wikipedia
        </a>
      )}
    </div>
  );
}
