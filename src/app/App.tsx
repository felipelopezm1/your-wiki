import { BrowserRouter, Routes, Route } from "react-router";
import { useEffect } from "react";
import { HoloLightbox } from "@/components/media/HoloLightbox";
import { HomePage } from "./routes/HomePage";
import { SubmitPage } from "./routes/SubmitPage";
import { BookPage } from "./routes/BookPage";
import { useAppStore } from "@/store/useAppStore";
import { MOCK_BOOKS } from "@/lib/mockData";
import type { BookEntry } from "@/types";

async function fetchBooks(): Promise<BookEntry[] | null> {
  try {
    const res = await fetch("/api/books");
    if (!res.ok) throw new Error("API not available");
    const data = await res.json();
    if (data.books && data.books.length > 0) {
      return data.books.map((b: unknown) =>
        typeof b === "string" ? JSON.parse(b) : b,
      );
    }
  } catch {
    // API not available
  }
  return null;
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

      if (apiBooks && apiBooks.length > 0) {
        setBooks(apiBooks);
        setLoading(false);
        return;
      }

      // Fallback: use mock data
      setBooks(MOCK_BOOKS);
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
