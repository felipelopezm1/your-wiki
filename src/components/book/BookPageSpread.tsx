import type { ReactNode } from "react";

interface BookPageSpreadProps {
  left: ReactNode;
  right: ReactNode;
}

export function BookPageSpread({ left, right }: BookPageSpreadProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-0">
      {/* Left page */}
      <div className="relative flex-1 bg-[#FDFBF7] p-8 shadow-inner lg:rounded-l-lg lg:border-r lg:border-border-light">
        <PageLines side="left" />
        <div className="relative z-10">{left}</div>
      </div>

      {/* Right page */}
      <div className="relative flex-1 bg-[#FDFBF7] p-8 shadow-inner lg:rounded-r-lg">
        <PageLines side="right" />
        <div className="relative z-10">{right}</div>
      </div>
    </div>
  );
}

function PageLines({ side }: { side: "left" | "right" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
      {/* Margin line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-400"
        style={{ [side === "left" ? "right" : "left"]: "2rem" }}
      />
      {/* Horizontal rule lines */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-px bg-blue-300"
          style={{ top: `${28 + i * 28}px` }}
        />
      ))}
    </div>
  );
}
