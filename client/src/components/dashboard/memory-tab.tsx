"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Plug, Sparkles } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationHistory } from "@/components/dashboard/conversation-history";
import { MemoryAddForm } from "@/components/dashboard/memory-add-form";
import { listConversationMessages } from "@/lib/conversation-api";
import { formatDateTime } from "@/lib/format";
import type { ConversationChannel, ConversationMessage } from "@/types/conversation";
import type { LongTermContextItem } from "@/types/context";

type MemoryTabProps = {
  items: LongTermContextItem[];
  token: string;
  onItemCreated: (item: LongTermContextItem) => void;
};

const SYNC_SOURCES = [
  "cron_sync",
  "github",
  "wakatime",
  "google_calendar",
  "gmail",
  "todoist",
];

const SOURCE_LABELS: Record<string, string> = {
  ai_inferred: "AI-inferred",
  manual: "Added by you",
  wakatime: "WakaTime",
  github: "GitHub",
  google_calendar: "Google Calendar",
  gmail: "Gmail",
  todoist: "Todoist",
  cron_sync: "Synced",
  whatsapp: "WhatsApp",
  dashboard: "Dashboard",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/12 bg-white/2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="max-w-sm text-xs text-white/45">{description}</p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 p-4">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-white">{value}</p>
        <p className="mt-1 text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

function MemoryCard({ item }: { item: LongTermContextItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-4 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-white">{item.title}</h4>
          <p className="mt-0.5 text-[11px] text-white/40">
            {formatDateTime(item.created_at)} · {sourceLabel(item.source)}
          </p>
        </div>
        <span className="text-primary bg-primary/15 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
          {item.context_type.replace(/_/g, " ")}
        </span>
      </div>

      <p className="mt-2.5 line-clamp-4 whitespace-pre-wrap text-sm text-white/70">
        {item.summary ?? item.content}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/55"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] text-white/35">importance</span>
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.min(item.importance, 10) * 10}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoryCardList({ items }: { items: LongTermContextItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MemoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ChatHistoryPanel({
  token,
  filter,
}: {
  token: string;
  filter: ConversationChannel | "all";
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConversationMessages(token, {
        channel: filter,
        limit: 200,
      });
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-white/45">Loading chat history…</p>;
  }

  const emptyCopy =
    filter === "whatsapp"
      ? {
          title: "No WhatsApp messages yet",
          description:
            "Message Orbit on WhatsApp and your conversation will appear here.",
        }
      : filter === "dashboard"
        ? {
            title: "No dashboard chat yet",
            description: "Use the Chat tab to talk to Orbit from the browser.",
          }
        : {
            title: "No conversations yet",
            description:
              "WhatsApp and dashboard messages will be stored here automatically.",
          };

  return (
    <ConversationHistory
      messages={messages}
      emptyTitle={emptyCopy.title}
      emptyDescription={emptyCopy.description}
      showChannel={filter === "all"}
    />
  );
}

export function MemoryTab({ items, token, onItemCreated }: MemoryTabProps) {
  const longTermItems = items.filter(
    (item) => !SYNC_SOURCES.includes(item.source),
  );
  const syncItems = items.filter((item) => SYNC_SOURCES.includes(item.source));
  const aiInferredCount = longTermItems.filter(
    (item) => item.source === "ai_inferred",
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={Brain} label="Long-term facts" value={longTermItems.length} />
        <StatTile icon={Sparkles} label="AI-inferred" value={aiInferredCount} />
        <StatTile icon={Plug} label="Synced signals" value={syncItems.length} />
      </div>

      <Tabs defaultValue="chats">
        <TabsList>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="long-term">
            Long-term ({longTermItems.length})
          </TabsTrigger>
          <TabsTrigger value="sync">Synced data</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-4 space-y-4">
          <Tabs defaultValue="whatsapp">
            <TabsList variant="line">
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp" className="mt-4">
              <ChatHistoryPanel token={token} filter="whatsapp" />
            </TabsContent>
            <TabsContent value="dashboard" className="mt-4">
              <ChatHistoryPanel token={token} filter="dashboard" />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <ChatHistoryPanel token={token} filter="all" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="long-term" className="mt-4 space-y-4">
          <MemoryAddForm token={token} onCreated={onItemCreated} />
          {longTermItems.length ? (
            <MemoryCardList items={longTermItems} />
          ) : (
            <EmptyState
              title="No long-term memory yet"
              description="Facts, preferences, and insights Orbit remembers across conversations will show up here — most are auto-extracted as you chat."
            />
          )}
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          {syncItems.length ? (
            <MemoryCardList items={syncItems} />
          ) : (
            <EmptyState
              title="No synced data yet"
              description="Once your integrations sync, snapshots from GitHub, WakaTime, and Calendar are stored here for Orbit to use."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
