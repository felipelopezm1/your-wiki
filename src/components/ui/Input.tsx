import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-light">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors duration-200 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400/30",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  ),
);

Input.displayName = "Input";
