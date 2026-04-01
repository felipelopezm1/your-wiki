import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils/cn";

interface ImageUploaderProps {
  label: string;
  onImageSelected: (file: File | null, preview: string | null) => void;
  className?: string;
}

export function ImageUploader({
  label,
  onImageSelected,
  className,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageSelected(file, url);
    },
    [onImageSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onImageSelected(null, null);
  };

  return (
    <div className={className}>
      <p className="text-sm font-medium text-ink-light mb-1.5">{label}</p>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="h-24 w-24 rounded-lg object-cover border border-border"
          />
          <button
            type="button"
            onClick={clear}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white text-xs"
          >
            &times;
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors",
            isDragActive ? "border-accent bg-accent/5" : "hover:border-ink-faint",
          )}
        >
          <input {...getInputProps()} />
          <p className="text-xs text-ink-faint px-4 text-center">
            {isDragActive ? "Drop here" : "Click or drag an image"}
          </p>
        </div>
      )}
    </div>
  );
}
