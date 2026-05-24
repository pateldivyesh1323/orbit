import Link from "next/link";

import { AuthNav } from "@/components/auth-nav";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Orbit
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
