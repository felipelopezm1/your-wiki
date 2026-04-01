import type { ReactNode } from "react";
import { TopBar } from "./TopBar";

interface ShellProps {
  children: ReactNode;
}

// TODO: Figma alignment point -- Shell wrapper may gain sidebar, footer, or different background per route
export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-paper paper-texture">
      <TopBar />
      <main>{children}</main>
    </div>
  );
}
