import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink/90 shadow-sm",
  secondary:
    "bg-white text-ink border border-border hover:border-ink-faint hover:shadow-sm",
  ghost:
    "text-ink-light hover:text-ink hover:bg-paper-warm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
