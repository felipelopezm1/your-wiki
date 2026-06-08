import { BrowserRouter, Routes, Route } from "react-router";
import { useEffect } from "react";
import { HoloLightbox } from "@/components/media/HoloLightbox";
import { HomePage } from "./routes/HomePage";
import { SubmitPage } from "./routes/SubmitPage";
import { BookPage } from "./routes/BookPage";
import { useAppStore } from "@/store/useAppStore";
import type { BookEntry } from "@/types";

async function fetchBooks(): Promise<BookEntry[]> {
  try {
    const res = await fetch("/api/books");
    if (!res.ok) throw new Error("API not available");
    const data = await res.json();
    if (Array.isArray(data.books)) {
      return data.books.map((b: unknown) =>
        typeof b === "string" ? JSON.parse(b) : b,
      );
    }
  } catch {
    // API not available
  }
  return [];
}

export function App() {
  const setBooks = useAppStore((s) => s.setBooks);
  const setLoading = useAppStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Try API first
      const apiBooks = await fetchBooks();
      if (cancelled) return;

      setBooks(apiBooks);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [setBooks, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/submit"
          element={
            <div className="min-h-screen bg-paper paper-texture">
              <SubmitPage />
            </div>
          }
        />
        <Route
          path="/book/:id"
          element={
            <div className="min-h-screen bg-paper paper-texture">
              <BookPage />
            </div>
          }
        />
      </Routes>
      <HoloLightbox />
    </BrowserRouter>
  );
}
