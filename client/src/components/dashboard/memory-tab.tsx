"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryAddForm } from "@/components/dashboard/memory-add-form";
import { formatDateTime } from "@/lib/format";
import type { LongTermContextItem } from "@/types/context";

type MemoryTabProps = {
  items: LongTermContextItem[];
  token: string;
  onItemCreated: (item: LongTermContextItem) => void;
};

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function LongTermMemoryList({ items }: { items: LongTermContextItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        title="No long-term memory yet"
        description="Facts, preferences, and insights Orbit remembers across conversations will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  {formatDateTime(item.created_at)}
                  {item.source ? ` · ${item.source}` : null}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{item.context_type}</Badge>
                <Badge variant="outline">Importance {item.importance}/10</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{item.summary ?? item.content}</p>
            {item.tags.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SyncDataPanel({ items }: { items: LongTermContextItem[] }) {
  const syncItems = items.filter(
    (item) =>
      item.source === "cron_sync" ||
      item.source === "github" ||
      item.source === "wakatime" ||
      item.source === "google_calendar",
  );

  if (!syncItems.length) {
    return (
      <EmptyState
        title="No synced data yet"
        description="When cron jobs and integrations run, snapshots from GitHub, WakaTime, and Calendar will be stored here for Orbit to use."
      />
    );
  }

  return <LongTermMemoryList items={syncItems} />;
}

function ChatHistoryPanel({ items }: { items: LongTermContextItem[] }) {
  const chatItems = items.filter(
    (item) =>
      item.context_type === "conversation_summary" ||
      item.source === "whatsapp" ||
      item.source === "dashboard_chat",
  );

  if (!chatItems.length) {
    return (
      <EmptyState
        title="No chat history stored yet"
        description="WhatsApp and dashboard conversations will be saved here once conversation memory is enabled."
      />
    );
  }

  return <LongTermMemoryList items={chatItems} />;
}

export function MemoryTab({ items, token, onItemCreated }: MemoryTabProps) {
  const longTermItems = items.filter(
    (item) =>
      item.context_type !== "conversation_summary" &&
      item.source !== "cron_sync" &&
      item.source !== "github" &&
      item.source !== "wakatime" &&
      item.source !== "google_calendar" &&
      item.source !== "whatsapp" &&
      item.source !== "dashboard_chat",
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">What Orbit remembers</CardTitle>
          <CardDescription>
            Everything stored about you — chat summaries, long-term facts, and
            data pulled from integrations. Orbit uses this as context in every
            reply.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="long-term">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="long-term">
            Long-term ({longTermItems.length})
          </TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="sync">Synced data</TabsTrigger>
        </TabsList>

        <TabsContent value="long-term" className="mt-4 space-y-4">
          <MemoryAddForm token={token} onCreated={onItemCreated} />
          <LongTermMemoryList items={longTermItems} />
        </TabsContent>

        <TabsContent value="chats" className="mt-4">
          <ChatHistoryPanel items={items} />
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <SyncDataPanel items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
