"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!loadingHistory) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
      });
    }
  }, [loadingHistory, messages.length, sending]);

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
    textareaRef.current?.focus();

    try {
      const response = await sendChatMessage(token, text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          channel: "dashboard",
          external_id: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
          {loadingHistory ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Loading conversation…</p>
            </div>
          ) : !messages.length ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
                <Bot className="size-7" strokeWidth={2} />
              </span>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Hi, {displayName}
                </h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  Ask about your goals, habits, or what to focus on today. Same
                  AI as WhatsApp — powered by your profile and memory.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8 pb-4">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Bot className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ),
              )}
              {sending ? (
                <div className="flex gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="size-4" />
                  </span>
                  <div className="flex items-center gap-2 pt-1 text-muted-foreground text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Orbit is thinking…
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-background/90 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl space-y-2"
        >
          {error ? (
            <p className="text-destructive text-center text-sm">{error}</p>
          ) : null}
          <div
            className={cn(
              "flex items-end gap-2 rounded-2xl border border-border/80 bg-background p-2 shadow-sm",
              "ring-1 ring-transparent focus-within:border-primary/40 focus-within:ring-primary/20",
            )}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Orbit…"
              rows={1}
              disabled={sending}
              className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              className="size-9 shrink-0 rounded-xl"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-center text-[11px]">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
