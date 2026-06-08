import type { BookEntry } from "@/types";

export const AMOR_LOCK_PASSWORD = "caracolito";

const UNLOCK_KEY_PREFIX = "weeeeki-unlock-";

export function isBookLocked(book: BookEntry): boolean {
  return book.title.trim().toLowerCase() === "amor";
}

export function isBookUnlocked(bookId: string): boolean {
  try {
    return sessionStorage.getItem(`${UNLOCK_KEY_PREFIX}${bookId}`) === "1";
  } catch {
    return false;
  }
}

export function markBookUnlocked(bookId: string): void {
  try {
    sessionStorage.setItem(`${UNLOCK_KEY_PREFIX}${bookId}`, "1");
  } catch {
    // ignore storage failures
  }
}
