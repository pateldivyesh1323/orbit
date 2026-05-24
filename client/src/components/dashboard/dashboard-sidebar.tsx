"use client";

import {
  Bot,
  MessageCircle,
  Plug,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";

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
    <aside className="flex w-full flex-col border-border/60 lg:w-60 lg:shrink-0 lg:border-r">
      <div className="hidden border-b border-border/60 px-4 py-4 lg:block">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          Dashboard
        </p>
        <p className="mt-1 truncate text-sm font-semibold tracking-tight">
          {displayName}
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible lg:p-3">
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

      <div className="mt-auto hidden border-t border-border/60 p-3 lg:block">
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
      </div>
    </aside>
  );
}
