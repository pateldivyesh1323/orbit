"use client";

import { MessageCircle, Monitor, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OrbitMark } from "@/components/orbit-mark";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { ConversationChannel, ConversationMessage } from "@/types/conversation";

type ConversationHistoryProps = {
  messages: ConversationMessage[];
  emptyTitle?: string;
  emptyDescription?: string;
  showChannel?: boolean;
  compact?: boolean;
};

function channelLabel(channel: ConversationChannel) {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "dashboard":
      return "Dashboard";
    default:
      return "Dev";
  }
}

function ChannelIcon({ channel }: { channel: ConversationChannel }) {
  if (channel === "whatsapp") return <MessageCircle className="size-3" />;
  return <Monitor className="size-3" />;
}

export function ConversationHistory({
  messages,
  emptyTitle = "No messages yet",
  emptyDescription = "Conversation history will appear here.",
  showChannel = true,
  compact = false,
}: ConversationHistoryProps) {
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/2 py-12 text-center">
        <OrbitMark className="size-9 opacity-60" />
        <p className="text-sm font-medium text-white">{emptyTitle}</p>
        <p className="max-w-sm text-xs text-white/45">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "flex-row-reverse" : "flex-row",
          )}
        >
          {message.role === "user" ? (
            <span className="bg-primary text-primary-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full">
              <User className="size-4" />
            </span>
          ) : (
            <OrbitMark className="size-8 shrink-0" />
          )}
          <div
            className={cn(
              "flex max-w-[85%] flex-col gap-1",
              message.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-white/40">
                {formatDateTime(message.created_at)}
              </span>
              {showChannel ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-white/15 text-[10px] text-white/55"
                >
                  <ChannelIcon channel={message.channel} />
                  {channelLabel(message.channel)}
                </Badge>
              ) : null}
            </div>
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "rounded-bl-md border border-white/10 bg-white/5 text-white/85",
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
