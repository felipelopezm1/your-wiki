import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploader } from "./ImageUploader";
import { useAppStore } from "@/store/useAppStore";
import type { BookEntry, CoverTheme } from "@/types";
import { COVER_THEMES } from "@/types";
import { cn } from "@/lib/utils/cn";

async function uploadImage(file: File): Promise<string> {
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

export function SubmissionForm() {
  const addBook = useAppStore((s) => s.addBook);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [coverTheme, setCoverTheme] = useState<CoverTheme>("cream");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const errors = {
    name: status === "error" && !name ? "Name is required" : undefined,
    title: status === "error" && !title ? "Title is required" : undefined,
    message: status === "error" && !message ? "Message is required" : undefined,
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !title || !message) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
      }

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributorName: name,
          title,
          messageBody: message,
          coverTheme,
          avatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      const { book } = (await res.json()) as { book: BookEntry };
      addBook(book);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
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
          Message received!
        </h3>
        <p className="mt-2 text-sm text-ink-light">
          Your book has been added to the library.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setStatus("idle");
            setName("");
            setTitle("");
            setMessage("");
          }}
        >
          Write another
        </Button>
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
          rows={5}
          placeholder="Write something heartfelt..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={cn(
            "rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors duration-200 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-y font-serif",
            errors.message && "border-red-400",
          )}
        />
        {errors.message && (
          <p className="text-xs text-red-500">{errors.message}</p>
        )}
      </div>

      <ImageUploader
        label="Profile picture (optional)"
        onImageSelected={(file) => setAvatarFile(file)}
      />

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
        {status === "submitting" ? "Sending..." : "Leave your message"}
      </Button>
    </form>
  );
}
