"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function lock() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-lg active:opacity-70"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            HR
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            HR Assistant
          </span>
        </Link>
        <button
          type="button"
          onClick={lock}
          className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition-colors active:bg-stone-100 active:text-stone-700"
        >
          Lock
        </button>
      </div>
    </header>
  );
}
