import { useRef, useState, useEffect, useCallback } from "react";
import { prepareMessage, layoutMessage } from "@/lib/pretext/prepareMessageText";
import { getReactionStyle } from "@/lib/pretext/reactionStyles";
import type { ReactionStyleName } from "@/types";

interface PretextBlockProps {
  text: string;
  reactionStyle: ReactionStyleName;
  font?: string;
  lineHeight?: number;
  className?: string;
}

export function PretextBlock({
  text,
  reactionStyle,
  font = '16px "Merriweather", Georgia, serif',
  lineHeight = 28,
  className = "",
}: PretextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Array<{ text: string; width: number }>>([]);
  const [prepared] = useState(() => prepareMessage(text, font));
  const style = getReactionStyle(reactionStyle);

  const doLayout = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width <= 0) return;
    const result = layoutMessage(prepared, width, lineHeight);
    setLines(result.lines);
  }, [prepared, lineHeight]);

  useEffect(() => {
    doLayout();
    const observer = new ResizeObserver(() => doLayout());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [doLayout]);

  return (
    <>
      <style>{style.css}</style>
      <div
        ref={containerRef}
        className={`${style.containerClassName} ${className}`}
        style={{ lineHeight: `${lineHeight}px` }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={style.lineClassName}
            data-text={line.text}
            style={{ height: lineHeight }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </>
  );
}
