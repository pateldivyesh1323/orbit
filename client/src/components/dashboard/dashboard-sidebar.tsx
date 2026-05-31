"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  LogOut,
  MessageCircle,
  Plug,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export type DashboardSection =
  | "chat"
  | "profile"
  | "memory"
  | "messaging"
  | "integrations";

type NavItem = {
  id: DashboardSection;
  label: string;
  description: string;
  icon: typeof Bot;
  badge?: string | null;
};

type DashboardSidebarProps = {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  memoryCount: number;
  displayName: string;
  onRefresh: () => void;
  refreshing: boolean;
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardSidebar({
  active,
  onChange,
  memoryCount,
  displayName,
  onRefresh,
  refreshing,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
    router.refresh();
  }

  const navItems: NavItem[] = [
    {
      id: "chat",
      label: "Chat",
      description: "Talk to Orbit",
      icon: Bot,
    },
    {
      id: "profile",
      label: "Profile",
      description: "Your details & goals",
      icon: User,
    },
    {
      id: "memory",
      label: "Memory",
      description: "What Orbit remembers",
      icon: Sparkles,
      badge: memoryCount > 0 ? String(memoryCount) : null,
    },
    {
      id: "messaging",
      label: "Messaging",
      description: "WhatsApp & automation",
      icon: MessageCircle,
    },
    {
      id: "integrations",
      label: "Integrations",
      description: "GitHub, WakaTime, Calendar",
      icon: Plug,
    },
  ];

  const initials = getInitials(displayName);

  return (
    <aside className="flex w-full shrink-0 flex-col border-border/60 bg-background lg:h-full lg:min-h-0 lg:w-64 lg:shrink-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 lg:py-4">
        <Link href="/" className="tracking-tight">
          <span className="font-display text-lg uppercase tracking-wide">
            Orbit
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
            />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive lg:hidden"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60 p-2 lg:flex-col lg:overflow-x-visible lg:border-b-0 lg:p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "group/nav flex min-w-30 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive
                    ? "text-primary"
                    : "opacity-70 group-hover/nav:opacity-100",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.label}
                  {item.badge ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-xs lg:block",
                    isActive ? "text-primary/70" : "opacity-70",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-border/60 p-3 lg:block">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/80 to-primary/60 text-xs font-semibold text-primary-foreground shadow-sm">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {displayName}
            </p>
            {user?.email ? (
              <p className="text-muted-foreground truncate text-[11px] leading-tight">
                {user.email}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
