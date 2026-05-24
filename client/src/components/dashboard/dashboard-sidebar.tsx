"use client";

import Link from "next/link";
import {
  Bot,
  MessageCircle,
  Orbit,
  Plug,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";

import { AuthNav } from "@/components/auth-nav";
import { Button } from "@/components/ui/button";
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
  badge?: string;
};

type DashboardSidebarProps = {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  memoryCount: number;
  displayName: string;
  onRefresh: () => void;
  refreshing: boolean;
};

export function DashboardSidebar({
  active,
  onChange,
  memoryCount,
  displayName,
  onRefresh,
  refreshing,
}: DashboardSidebarProps) {
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
      badge: String(memoryCount),
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

  return (
    <aside className="flex w-full shrink-0 flex-col border-border/60 bg-background lg:h-full lg:min-h-0 lg:w-64 lg:shrink-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-4 lg:py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="relative inline-flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/20">
            <Orbit className="size-4" strokeWidth={2.25} />
          </span>
          <span>Orbit</span>
        </Link>
        <div className="hidden lg:block">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="text-muted-foreground text-xs">Dashboard</p>
        </div>
        <div className="lg:hidden">
          <AuthNav variant="dashboard" />
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
                "flex min-w-30 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "opacity-70",
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.label}
                  {item.badge ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="hidden truncate text-xs opacity-80 lg:block">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-2 border-t border-border/60 p-3 lg:flex">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh data
        </Button>
        <AuthNav variant="dashboard" />
      </div>
    </aside>
  );
}
