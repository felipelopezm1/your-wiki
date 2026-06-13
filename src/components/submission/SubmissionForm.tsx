import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploader } from "./ImageUploader";
import { useAppStore } from "@/store/useAppStore";
import type { BookEntry, CoverTheme, GalleryImage } from "@/types";
import { COVER_THEMES } from "@/types";
import { saveEditToken } from "@/lib/ownership";
import {
  assertPayloadFits,
  prepareAvatarUrl,
  prepareGalleryImage,
  readApiError,
} from "@/lib/imageUpload";
import { cn } from "@/lib/utils/cn";

function galleryThumb(image: string | GalleryImage): string {
  return typeof image === "string" ? image : image.thumbnailUrl ?? image.url;
}

interface SubmissionFormProps {
  editBook?: BookEntry;
  editToken?: string;
  onSaved?: (book: BookEntry) => void;
}

export function SubmissionForm({ editBook, editToken, onSaved }: SubmissionFormProps) {
  const isEdit = Boolean(editBook);
  const addBook = useAppStore((s) => s.addBook);
  const setBooks = useAppStore((s) => s.setBooks);

  const [name, setName] = useState(editBook?.senderName ?? editBook?.authorLabel ?? "");
  const [title, setTitle] = useState(editBook?.title ?? "");
  const [message, setMessage] = useState(
    editBook?.senderMessage ?? (editBook?.type === "friend" ? editBook?.body ?? "" : ""),
  );
  const [wikiUrl, setWikiUrl] = useState(
    editBook?.type === "wiki" ? editBook?.sourceUrl ?? "" : "",
  );
  const [coverTheme, setCoverTheme] = useState<CoverTheme>(
    (editBook?.coverTheme as CoverTheme) ?? "cream",
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | undefined>(editBook?.avatarUrl);
  const [existingGallery, setExistingGallery] = useState<Array<string | GalleryImage>>(
    editBook?.galleryImages ?? [],
  );
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitPhase, setSubmitPhase] = useState<"idle" | "photos" | "sending">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedBookId, setSavedBookId] = useState<string | null>(null);

  const errors = {
    name: status === "error" && !name ? "Name is required" : undefined,
    title: status === "error" && !title ? "Title is required" : undefined,
    message: status === "error" && !message ? "Message is required" : undefined,
  };

  const remainingGallerySlots = Math.max(0, 8 - existingGallery.length);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !title || !message) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setSubmitPhase("photos");
    setErrorMsg("");

    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await prepareAvatarUrl(avatarFile);
      } else if (isEdit) {
        avatarUrl = existingAvatar ?? "";
      }

      const newGalleryImages = await Promise.all(
        galleryFiles.slice(0, remainingGallerySlots).map((file) => prepareGalleryImage(file)),
      );

      const galleryImages = [...existingGallery, ...newGalleryImages].slice(0, 8);
      const payload = {
        contributorName: name,
        title,
        messageBody: message,
        wikiUrl: wikiUrl.trim() || undefined,
        coverTheme,
        avatarUrl,
        galleryImages,
      };

      assertPayloadFits(payload);
      setSubmitPhase("sending");

      if (isEdit && editBook) {
        const res = await fetch(`/api/books?id=${encodeURIComponent(editBook.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editToken, ...payload }),
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not save changes"));
        }

        const { book } = (await res.json()) as { book: BookEntry };
        setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
        setSavedBookId(book.id);
        setStatus("success");
        onSaved?.(book);
        return;
      }

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Submission failed"));
      }

      const { book } = (await res.json()) as { book: BookEntry };
      if (book.editToken) saveEditToken(book.id, book.editToken);
      addBook(book);
      setSavedBookId(book.id);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    } finally {
      setSubmitPhase("idle");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        className="paper-card p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="font-serif text-xl font-bold text-ink">
          {isEdit ? "Changes saved!" : "Message received!"}
        </h3>
        <p className="mt-2 text-sm text-ink-light">
          {isEdit
            ? "Your entry has been updated."
            : "Your book has been added to the library."}
        </p>

        {!isEdit && savedBookId && (
          <p className="mt-4 text-xs text-ink-faint">
            Want to change it later? You can{" "}
            <Link
              to={`/submit?edit=${savedBookId}`}
              className="text-accent underline hover:text-accent-warm"
            >
              edit this entry
            </Link>{" "}
            from this browser anytime.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/">
            <Button variant="secondary">Back to Library</Button>
          </Link>
          {!isEdit && (
            <Button
              onClick={() => {
                setStatus("idle");
                setName("");
                setTitle("");
                setMessage("");
                setWikiUrl("");
                setGalleryFiles([]);
                setExistingGallery([]);
                setAvatarFile(null);
                setExistingAvatar(undefined);
                setSavedBookId(null);
              }}
            >
              Write another
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="name"
        label="Your name"
        placeholder="Luna"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />

      <Input
        id="title"
        label="Title for your message"
        placeholder="To Ceci, With Stars"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-ink-light">
          Your message
        </label>
        <textarea
          id="message"
          rows={8}
          placeholder="Write something heartfelt..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={cn(
            "min-h-48 rounded-lg border border-border bg-white px-4 py-3 font-serif text-base leading-7 text-ink placeholder:text-ink-faint transition-colors duration-200 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-y",
            errors.message && "border-red-400",
          )}
        />
        {errors.message && (
          <p className="text-xs text-red-500">{errors.message}</p>
        )}
      </div>

      <Input
        id="wikiUrl"
        label="Wikipedia article link (optional)"
        placeholder="https://en.wikipedia.org/wiki/Friendship"
        value={wikiUrl}
        onChange={(e) => setWikiUrl(e.target.value)}
      />

      {/* Profile picture */}
      {existingAvatar && !avatarFile ? (
        <div>
          <p className="text-sm font-medium text-ink-light mb-1.5">Profile picture</p>
          <div className="relative inline-block">
            <img
              src={existingAvatar}
              alt="Current profile"
              className="h-24 w-24 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => setExistingAvatar(undefined)}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white text-xs"
              aria-label="Remove profile picture"
            >
              &times;
            </button>
          </div>
        </div>
      ) : (
        <ImageUploader
          label={isEdit ? "Replace profile picture (optional)" : "Profile picture (optional)"}
          onImageSelected={(file) => setAvatarFile(file)}
        />
      )}

      {/* Existing gallery images (edit mode) */}
      {existingGallery.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-light mb-1.5">
            Current images in the book
          </p>
          <div className="grid grid-cols-4 gap-2">
            {existingGallery.map((image, index) => (
              <div key={`${galleryThumb(image)}-${index}`} className="relative">
                <img
                  src={galleryThumb(image)}
                  alt={`Current image ${index + 1}`}
                  className="h-20 w-full rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setExistingGallery(existingGallery.filter((_, i) => i !== index))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
                  aria-label={`Remove current image ${index + 1}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {remainingGallerySlots > 0 && (
        <GalleryUploader
          label={
            isEdit
              ? `Add more images (${remainingGallerySlots} slot${remainingGallerySlots === 1 ? "" : "s"} left)`
              : "Images to place inside the book (up to 8)"
          }
          files={galleryFiles}
          onChange={setGalleryFiles}
          maxFiles={remainingGallerySlots}
        />
      )}

      {/* Cover theme selector */}
      <div>
        <p className="text-sm font-medium text-ink-light mb-2">
          Cover theme
        </p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(COVER_THEMES) as CoverTheme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setCoverTheme(theme)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all",
                coverTheme === theme
                  ? "border-ink scale-110"
                  : "border-transparent hover:border-ink-faint",
              )}
              style={{ backgroundColor: COVER_THEMES[theme].bg }}
              aria-label={theme}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.p
            className="text-sm text-red-500"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={status === "submitting"}
      >
        {status === "submitting"
          ? submitPhase === "photos"
            ? "Preparing photos..."
            : "Sending..."
          : isEdit
            ? "Save changes"
            : "Leave your message"}
      </Button>
    </form>
  );
}

function GalleryUploader({
  label,
  files,
  onChange,
  maxFiles = 8,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return (
    <div>
      <p className="text-sm font-medium text-ink-light mb-1.5">{label}</p>
      <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-4 py-4 text-center transition-colors hover:border-ink-faint">
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const next = Array.from(e.target.files ?? []).slice(0, maxFiles);
            onChange(next);
            e.currentTarget.value = "";
          }}
        />
        <span className="text-xs text-ink-faint">
          Click to choose up to {maxFiles} image{maxFiles === 1 ? "" : "s"}
        </span>
      </label>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {previews.map((preview, index) => (
            <div key={preview} className="relative">
              <img
                src={preview}
                alt={`Book insert preview ${index + 1}`}
                className="h-20 w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
                aria-label={`Remove image ${index + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
