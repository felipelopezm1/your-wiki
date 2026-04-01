import { BrowserRouter, Routes, Route } from "react-router";
import { useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { HoloLightbox } from "@/components/media/HoloLightbox";
import { HomePage } from "./routes/HomePage";
import { SubmitPage } from "./routes/SubmitPage";
import { BookPage } from "./routes/BookPage";
import { useAppStore } from "@/store/useAppStore";
import { MOCK_BOOKS } from "@/lib/mockData";

async function fetchBooks() {
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
    // API not available (local dev without Vercel, or no Redis yet)
  }
  return null;
}

export function App() {
  const setBooks = useAppStore((s) => s.setBooks);
  const setLoading = useAppStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBooks().then((books) => {
      if (cancelled) return;
      setBooks(books ?? MOCK_BOOKS);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [setBooks, setLoading]);

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/book/:id" element={<BookPage />} />
        </Routes>
      </Shell>
      <HoloLightbox />
    </BrowserRouter>
  );
}
