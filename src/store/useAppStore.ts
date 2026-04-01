import { create } from "zustand";
import type { BookEntry } from "@/types";

export type LayoutMode = "shelf" | "open" | "modal";

interface AppState {
  books: BookEntry[];
  selectedBookId: string | null;
  bookOpen: boolean;
  activeLightboxImage: string | null;
  submissionStatus: "idle" | "submitting" | "success" | "error";
  loading: boolean;
  error: string | null;
  currentLayoutMode: LayoutMode;

  setBooks: (books: BookEntry[]) => void;
  addBook: (book: BookEntry) => void;
  selectBook: (id: string | null) => void;
  setBookOpen: (open: boolean) => void;
  setActiveLightboxImage: (url: string | null) => void;
  setSubmissionStatus: (status: AppState["submissionStatus"]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLayoutMode: (mode: LayoutMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  books: [],
  selectedBookId: null,
  bookOpen: false,
  activeLightboxImage: null,
  submissionStatus: "idle",
  loading: false,
  error: null,
  currentLayoutMode: "shelf",

  setBooks: (books) => set({ books }),
  addBook: (book) => set((s) => ({ books: [...s.books, book] })),
  selectBook: (id) =>
    set({ selectedBookId: id, currentLayoutMode: id ? "open" : "shelf" }),
  setBookOpen: (open) => set({ bookOpen: open }),
  setActiveLightboxImage: (url) =>
    set({ activeLightboxImage: url, currentLayoutMode: url ? "modal" : "shelf" }),
  setSubmissionStatus: (status) => set({ submissionStatus: status }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLayoutMode: (mode) => set({ currentLayoutMode: mode }),
}));
