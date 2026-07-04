"use client";

import { ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useCommandPalette } from "@/components/CommandPaletteProvider";

const NAV_LINKS = [
  { href: "/", label: "Roles" },
  { href: "/candidates", label: "Candidates" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings/email-templates", label: "Templates" },
  { href: "/usage", label: "Usage" },
];

// Desktop nav keeps only these inline; the rest live behind "More" so the
// bar never has to scroll at in-between (tablet) widths.
const PRIMARY_LINKS = NAV_LINKS.slice(0, 3);
const MORE_LINKS = NAV_LINKS.slice(3);

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/jobs");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const { resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen && !moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, moreOpen]);

  if (pathname === "/login") return null;

  async function lock() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-subtle sm:hidden"
        >
          {menuOpen ? (
            <X className="size-6" aria-hidden />
          ) : (
            <Menu className="size-6" aria-hidden />
          )}
        </button>

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

        <nav className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive(pathname, link.href)
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:bg-subtle hover:text-foreground active:bg-subtle"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More navigation links"
              aria-expanded={moreOpen}
              className={`flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                MORE_LINKS.some((link) => isActive(pathname, link.href))
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:bg-subtle hover:text-foreground active:bg-subtle"
              }`}
            >
              More
              <ChevronDown
                className={`size-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {moreOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMoreOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="anim-panel absolute top-11 left-0 z-20 min-w-40 origin-top-left rounded-xl border border-border bg-surface p-1.5 card-shadow">
                  {MORE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-9 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive(pathname, link.href)
                          ? "bg-accent-soft text-accent-ink"
                          : "text-foreground/80 hover:bg-subtle active:bg-subtle"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex-1 sm:hidden" />

        <button
          type="button"
          onClick={openPalette}
          className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted transition-colors hover:bg-subtle hover:text-foreground active:bg-subtle md:flex"
          aria-label="Open command palette"
        >
          <span>Jump to…</span>
          <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 font-sans text-[10px]">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={openPalette}
          className="flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 text-muted transition-colors hover:bg-subtle hover:text-foreground active:bg-subtle md:hidden"
          aria-label="Open command palette"
        >
          <Search className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-foreground active:bg-subtle"
          aria-label="Toggle theme"
        >
          <Sun className="hidden size-[18px] dark:block" aria-hidden />
          <Moon className="size-[18px] dark:hidden" aria-hidden />
        </button>
        <button
          type="button"
          onClick={lock}
          className="min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-foreground active:bg-subtle"
        >
          Lock
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-14 z-10 bg-foreground/20 sm:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <nav className="anim-menu absolute inset-x-0 top-14 z-20 border-b border-border bg-surface shadow-lg sm:hidden">
            <div className="flex flex-col p-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition-colors ${
                    isActive(pathname, link.href)
                      ? "bg-accent-soft text-accent-ink"
                      : "text-foreground/80 active:bg-subtle"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
