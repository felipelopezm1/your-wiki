import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils/cn";

// TODO: Figma alignment point -- TopBar layout, logo, and nav items may change with storyboard
export function TopBar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border-light bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="font-serif text-lg font-bold tracking-tight text-ink"
        >
          Weeeeki
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" active={location.pathname === "/"}>
            Library
          </NavLink>
          <NavLink to="/submit" active={location.pathname === "/submit"}>
            Leave a Message
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition-colors duration-200",
        active
          ? "bg-paper-warm text-ink font-medium"
          : "text-ink-light hover:text-ink hover:bg-paper-warm",
      )}
    >
      {children}
    </Link>
  );
}
