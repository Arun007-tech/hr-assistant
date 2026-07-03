"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCommandPalette } from "@/components/CommandPaletteProvider";

const NAV_LINKS = [
  { href: "/candidates", label: "Candidates" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings/email-templates", label: "Templates" },
  { href: "/usage", label: "Usage" },
];

export function AppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();

  if (pathname === "/login") return null;

  async function lock() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg active:opacity-70"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            HR
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:inline">
            HR Assistant
          </span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-accent-soft text-accent-ink"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-700 active:bg-stone-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={openPalette}
          className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 active:bg-stone-100 sm:flex"
          aria-label="Open command palette"
        >
          <span>Jump to…</span>
          <kbd className="rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 font-sans text-[10px]">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={openPalette}
          className="flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 active:bg-stone-100 sm:hidden"
          aria-label="Open command palette"
        >
          🔍
        </button>
        <button
          type="button"
          onClick={lock}
          className="min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 active:bg-stone-100"
        >
          Lock
        </button>
      </div>
    </header>
  );
}
