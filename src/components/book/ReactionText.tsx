import { PretextBlock } from "./PretextBlock";
import type { ReactionStyleName } from "@/types";

interface ReactionTextProps {
  text: string;
  reactionStyle: ReactionStyleName;
  className?: string;
}

export function ReactionText({
  text,
  reactionStyle,
  className,
}: ReactionTextProps) {
  return (
    <PretextBlock
      text={text}
      reactionStyle={reactionStyle}
      className={className}
    />
  );
}
