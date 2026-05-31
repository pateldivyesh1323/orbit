"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bot, Check, Copy, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMarkdown } from "@/components/dashboard/chat-markdown";
import { OrbitMark } from "@/components/orbit-mark";
import { sendChatMessage } from "@/lib/chat-api";
import { listConversationMessages } from "@/lib/conversation-api";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types/conversation";

type ChatTabProps = {
  token: string;
  displayName: string;
};

const SUGGESTIONS = [
  "What should I focus on today?",
  "How is my week going so far?",
  "Help me plan tomorrow morning",
  "What habits should I prioritize?",
];

const SCROLL_THRESHOLD = 120;

export function ChatTab({ token, displayName }: ChatTabProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  const loadHistory = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoadingHistory(true);
      try {
        const history = await listConversationMessages(token, {
          channel: "dashboard",
          limit: 100,
        });
        setMessages(history);
      } catch {
        if (showSpinner) setMessages([]);
      } finally {
        if (showSpinner) setLoadingHistory(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < SCROLL_THRESHOLD;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!loadingHistory) {
      const el = scrollRef.current;
      el?.scrollTo({ top: el.scrollHeight });
    }
  }, [loadingHistory]);

  const handleCopy = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // ignore — clipboard may be unavailable
    }
  }, []);

  const submit = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;

      const tempUserId = `tmp-user-${Date.now()}`;
      const tempAssistantId = `tmp-assistant-${Date.now()}`;
      const optimisticUser: ConversationMessage = {
        id: tempUserId,
        role: "user",
        content: text,
        channel: "dashboard",
        external_id: null,
        created_at: new Date().toISOString(),
      };

      stickToBottomRef.current = true;
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
            id: tempAssistantId,
            role: "assistant",
            content: response.reply,
            channel: "dashboard",
            external_id: null,
            created_at: new Date().toISOString(),
          },
        ]);
        void loadHistory(false);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setSending(false);
      }
    },
    [sending, token, loadHistory],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(input);
  }

  const isEmpty = !messages.length && !sending;

  return (
    <div className="dark bg-background text-foreground relative flex h-full min-h-0 flex-1 flex-col">
      {/* ambient top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(90,162,250,0.10),transparent)]" />

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
          {loadingHistory ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-white/50">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Loading conversation…</p>
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
              <OrbitMark className="size-16 drop-shadow-[0_8px_24px_rgba(90,162,250,0.25)]" />
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Hi, {displayName}
                </h2>
                <p className="mx-auto max-w-md text-sm text-white/55">
                  Ask about your goals, habits, or what to focus on today. Same
                  AI as WhatsApp — powered by your profile and memory.
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submit(suggestion)}
                    className="group flex items-start gap-2 rounded-xl border border-white/10 bg-white/3 px-3.5 py-3 text-left text-sm text-white/80 transition-colors hover:border-primary/40 hover:bg-white/6"
                  >
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-4">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm shadow-primary/20">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="group flex gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Bot className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-white/85">
                      <ChatMarkdown content={message.content} />
                      <div className="mt-1 flex h-6 items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-[11px] text-white/40 hover:text-white"
                          onClick={() => handleCopy(message.id, message.content)}
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="size-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              )}
              {sending ? (
                <div className="flex gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
                    <Bot className="size-4" />
                  </span>
                  <div className="flex items-center gap-1.5 pt-2.5 text-sm text-white/50">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-white/10 bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl space-y-2"
        >
          {error ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-destructive/70 hover:text-destructive"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          <div
            className={cn(
              "flex items-end gap-2 rounded-2xl border border-white/15 bg-white/4 p-2",
              "ring-1 ring-transparent transition-colors focus-within:border-primary/50 focus-within:ring-primary/25",
            )}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Orbit…"
              rows={1}
              disabled={sending}
              className="max-h-40 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-white shadow-none placeholder:text-white/30 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              className="size-9 shrink-0 rounded-xl"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-[11px] text-white/40">
            Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
