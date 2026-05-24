"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function AuthNav() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return <div className="h-8 w-24" aria-hidden />;
  }

  if (isAuthenticated && user) {
    return (
      <nav className="flex items-center gap-2">
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {user.display_name}
        </span>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Log out
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2">
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "ghost" }))}
      >
        Log in
      </Link>
      <Link href="/register" className={cn(buttonVariants())}>
        Sign up
      </Link>
    </nav>
  );
}
