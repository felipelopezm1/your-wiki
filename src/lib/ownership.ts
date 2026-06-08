const EDIT_TOKEN_PREFIX = "weeeeki-edit-";

export function saveEditToken(bookId: string, token: string): void {
  try {
    localStorage.setItem(`${EDIT_TOKEN_PREFIX}${bookId}`, token);
  } catch {
    // ignore storage failures
  }
}

export function getEditToken(bookId: string): string | null {
  try {
    return localStorage.getItem(`${EDIT_TOKEN_PREFIX}${bookId}`);
  } catch {
    return null;
  }
}

export function hasEditToken(bookId: string): boolean {
  return getEditToken(bookId) !== null;
}
