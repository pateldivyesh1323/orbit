"use client";

import { Bot, MessageCircle, Monitor, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
        <Bot className="size-8 opacity-40" />
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="max-w-sm text-xs">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", compact ? "gap-2" : "gap-3")}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {message.role === "user" ? (
              <User className="size-4" />
            ) : (
              <Bot className="size-4" />
            )}
          </span>
          <div
            className={cn(
              "flex max-w-[85%] flex-col gap-1",
              message.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[11px]">
                {formatDateTime(message.created_at)}
              </span>
              {showChannel ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <ChannelIcon channel={message.channel} />
                  {channelLabel(message.channel)}
                </Badge>
              ) : null}
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-2 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
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
