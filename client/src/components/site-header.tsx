import Link from "next/link";

import { AuthNav } from "@/components/auth-nav";
import { OrbitMark } from "@/components/orbit-mark";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 tracking-tight">
          <OrbitMark className="size-7" />
          <span className="font-display text-xl uppercase tracking-wide">
            Orbit
          </span>
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
