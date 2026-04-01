import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import type { ReactionStyleName } from "@/types";

export interface PreparedMessage {
  title: string;
  body: string;
  authorLabel: string;
  sourceLabel?: string;
  reactionStyle: ReactionStyleName;
  prepared: ReturnType<typeof prepareWithSegments>;
}

export interface LayoutResult {
  lines: Array<{ text: string; width: number }>;
  height: number;
  lineCount: number;
}

const FONT = '16px "Merriweather", Georgia, serif';
const LINE_HEIGHT = 28;

export function prepareMessage(
  body: string,
  font: string = FONT,
): ReturnType<typeof prepareWithSegments> {
  return prepareWithSegments(body, font);
}

export function layoutMessage(
  prepared: ReturnType<typeof prepareWithSegments>,
  maxWidth: number,
  lineHeight: number = LINE_HEIGHT,
): LayoutResult {
  const result = layoutWithLines(prepared, maxWidth, lineHeight);
  return {
    lines: result.lines.map((l) => ({ text: l.text, width: l.width })),
    height: result.height,
    lineCount: result.lineCount,
  };
}
