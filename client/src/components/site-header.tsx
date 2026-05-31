import Link from "next/link";
import { Orbit } from "lucide-react";

import { AuthNav } from "@/components/auth-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 tracking-tight"
        >
          <span className="relative inline-flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/20">
            <Orbit className="size-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-xl uppercase tracking-wide">
            Orbit
          </span>
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
