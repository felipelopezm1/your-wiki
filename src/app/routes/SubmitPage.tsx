import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { useAppStore } from "@/store/useAppStore";
import { getEditToken, saveEditToken } from "@/lib/ownership";

export function SubmitPage() {
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const urlToken = params.get("token");

  const books = useAppStore((s) => s.books);
  const loading = useAppStore((s) => s.loading);

  useEffect(() => {
    if (editId && urlToken) saveEditToken(editId, urlToken);
  }, [editId, urlToken]);

  const editBook = editId ? books.find((b) => b.id === editId) : undefined;
  const editToken = editId
    ? urlToken ?? getEditToken(editId) ?? undefined
    : undefined;

  const isEditMode = Boolean(editId);
  const canEdit = Boolean(editBook && editToken);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-ink-light hover:text-ink transition-colors"
      >
        &larr; Back to Library
      </Link>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-serif text-3xl font-bold text-ink">
          {isEditMode ? "Edit your entry" : "Leave a Message"}
        </h1>
        <p className="mt-2 text-ink-light">
          {isEditMode
            ? "Update your words or swap out the pictures."
            : "Write a message for Ceci. No account needed."}
        </p>

        <div className="mt-8 paper-card p-6 sm:p-8">
          {isEditMode && loading && !editBook ? (
            <p className="text-sm text-ink-light">Loading your entry...</p>
          ) : isEditMode && !editBook ? (
            <div className="text-center">
              <p className="font-serif text-lg text-ink-light italic">
                We couldn&apos;t find that entry.
              </p>
              <Link
                to="/"
                className="mt-4 inline-block text-sm text-accent underline hover:text-accent-warm"
              >
                Back to the library
              </Link>
            </div>
          ) : isEditMode && !canEdit ? (
            <div className="text-center">
              <p className="font-serif text-lg text-ink-light italic">
                This entry can only be edited from the device it was created on.
              </p>
              <Link
                to="/"
                className="mt-4 inline-block text-sm text-accent underline hover:text-accent-warm"
              >
                Back to the library
              </Link>
            </div>
          ) : (
            <SubmissionForm editBook={editBook} editToken={editToken} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
