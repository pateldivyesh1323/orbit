"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/lib/chat-api";
import { listConversationMessages } from "@/lib/conversation-api";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types/conversation";

type ChatTabProps = {
  token: string;
  displayName: string;
};

export function ChatTab({ token, displayName }: ChatTabProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const history = await listConversationMessages(token, {
        channel: "dashboard",
        limit: 100,
      });
      setMessages(history);
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!loadingHistory && messages.length) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
      });
    }
  }, [loadingHistory, messages.length]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const tempUserId = crypto.randomUUID();
    const optimisticUser: ConversationMessage = {
      id: tempUserId,
      role: "user",
      content: text,
      channel: "dashboard",
      external_id: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(token, text);
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        channel: "dashboard",
        external_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="size-5 text-primary" />
            Talk to Orbit
          </CardTitle>
          <CardDescription>
            Same AI as WhatsApp — uses your profile, memory, and recent
            conversation history. View WhatsApp messages under Memory → Chats.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="flex min-h-[420px] flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 p-0">
          <div
            ref={scrollRef}
            className="flex max-h-[480px] min-h-[320px] flex-1 flex-col gap-4 overflow-y-auto p-4"
          >
            {loadingHistory ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading conversation…
              </div>
            ) : !messages.length ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Bot className="size-10 opacity-40" />
                <p className="text-sm">
                  Hi {displayName}. Ask about your goals, habits, or what to
                  focus on today.
                </p>
              </div>
            ) : (
              messages.map((message) => (
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
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {sending ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Orbit is thinking…
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 border-t p-4"
          >
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Orbit…"
                rows={2}
                disabled={sending}
                className="min-h-[72px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={sending || !input.trim()}
                className="shrink-0 self-end"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
