import { useEffect, useState, useRef } from "react";
import { imageToAscii, loadImageForAscii } from "@/lib/ascii/imageToAscii";
import { cn } from "@/lib/utils/cn";

interface AsciiImageProps {
  src: string;
  alt?: string;
  width?: number;
  className?: string;
  onClick?: () => void;
}

export function AsciiImage({
  src,
  alt = "",
  width = 60,
  className,
  onClick,
}: AsciiImageProps) {
  const [ascii, setAscii] = useState<string | null>(null);
  const [showReal, setShowReal] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadImageForAscii(src)
      .then((img) => {
        if (cancelled) return;
        const result = imageToAscii(img, width);
        setAscii(result.text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, width]);

  if (error) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-lg object-cover", className)}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={cn("relative cursor-pointer group", className)}
      onMouseEnter={() => setShowReal(true)}
      onMouseLeave={() => setShowReal(false)}
      onClick={onClick}
    >
      {/* ASCII layer */}
      {ascii && (
        <pre
          className={cn(
            "text-[4px] leading-[5px] font-mono text-ink/70 select-none transition-opacity duration-300 overflow-hidden",
            showReal ? "opacity-0" : "opacity-100",
          )}
          aria-hidden="true"
        >
          {ascii}
        </pre>
      )}

      {/* Real image (shown on hover) */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full object-cover rounded transition-opacity duration-300",
          showReal ? "opacity-100" : "opacity-0",
        )}
      />

      {!ascii && !error && (
        <div className="flex h-20 items-center justify-center text-xs text-ink-faint">
          Loading...
        </div>
      )}
    </div>
  );
}
