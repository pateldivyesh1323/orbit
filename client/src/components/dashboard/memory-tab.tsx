"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    return <p className="text-muted-foreground text-sm">Loading chat history…</p>;
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
    (item) =>
      item.source !== "cron_sync" &&
      item.source !== "github" &&
      item.source !== "wakatime" &&
      item.source !== "google_calendar",
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">What Orbit remembers</CardTitle>
          <CardDescription>
            Chat transcripts, long-term facts, and synced integration data —
            everything Orbit uses as context in every reply.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="chats">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="long-term">
            Long-term ({longTermItems.length})
          </TabsTrigger>
          <TabsTrigger value="sync">Synced data</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-4 space-y-4">
          <Tabs defaultValue="whatsapp">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
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
          <LongTermMemoryList items={longTermItems} />
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <SyncDataPanel items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
