"use client";

import { FormEvent, useState } from "react";
import {
  Activity,
  Brain,
  ChevronDown,
  Clock,
  Hash,
  MessageSquare,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { inspectContext } from "@/lib/context-api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ContextInspection,
  InspectedMemory,
  InspectedSignal,
} from "@/types/context";

const SUGGESTIONS = [
  "What should I focus on today?",
  "How's my coding going?",
  "Help me plan my evening",
  "Any emails I should reply to?",
];

const SIGNAL_LABELS: Record<string, string> = {
  wakatime: "WakaTime",
  github: "GitHub",
  google_calendar: "Google Calendar",
  gmail: "Gmail",
  cron_sync: "Synced data",
};

function prettySource(source: string): string {
  return SIGNAL_LABELS[source] ?? source.replace(/_/g, " ");
}

function similarityTone(memory: InspectedMemory): {
  label: string;
  className: string;
} {
  if (!memory.embedded || memory.similarity === null) {
    return {
      label: "no embedding",
      className: "border-white/15 bg-white/5 text-white/50",
    };
  }
  const pct = Math.round(memory.similarity * 100);
  if (memory.similarity >= 0.5) {
    return {
      label: `${pct}% match`,
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (memory.similarity >= 0.35) {
    return {
      label: `${pct}% match`,
      className: "border-primary/40 bg-primary/10 text-primary",
    };
  }
  return {
    label: `${pct}% match`,
    className: "border-white/15 bg-white/5 text-white/55",
  };
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Hash;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card-voxa flex flex-col gap-1 rounded-xl p-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-xl font-semibold text-white">{value}</span>
      {hint ? <span className="text-[11px] text-white/35">{hint}</span> : null}
    </div>
  );
}

function SectionBars({ data }: { data: ContextInspection }) {
  const maxTokens = Math.max(...data.sections.map((s) => s.tokens), 1);
  return (
    <div className="space-y-2.5">
      {data.sections.map((section) => (
        <div key={section.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">{section.name}</span>
            <span className="text-white/40">
              ≈ {section.tokens} tok · {section.chars} chars
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="bg-primary/70 h-full rounded-full"
              style={{ width: `${(section.tokens / maxTokens) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoryRow({ memory }: { memory: InspectedMemory }) {
  const tone = similarityTone(memory);
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium text-white">
          {memory.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/40">
          <span className="rounded bg-white/8 px-1.5 py-0.5">
            {memory.context_type}
          </span>
          <span>{prettySource(memory.source)}</span>
          <span>· importance {memory.importance}</span>
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 font-mono text-[11px]", tone.className)}
      >
        {tone.label}
      </Badge>
    </div>
  );
}

function SignalRow({ signal }: { signal: InspectedSignal }) {
  return (
    <div className="space-y-1 rounded-lg border border-white/8 bg-white/3 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-primary text-sm font-medium">
          {prettySource(signal.source)}
        </span>
        <span className="text-[11px] text-white/35">
          updated {formatDateTime(signal.updated_at)}
        </span>
      </div>
      <p className="text-xs text-white/55">
        {signal.summary || signal.title}
      </p>
    </div>
  );
}

function Collapsible({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-white/3 px-3 py-2 text-left text-xs font-medium text-white/70 hover:text-white"
      >
        {label}
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words bg-black/40 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-white/70">
          {children}
        </pre>
      ) : null}
    </div>
  );
}

export function ContextInspectorTab({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [data, setData] = useState<ContextInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await inspectContext(token, { message: trimmed });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inspect context");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(message);
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanSearch className="size-5 text-primary" />
            Context inspector
          </CardTitle>
          <CardDescription>
            Type a message and see exactly what Orbit&apos;s agent receives — the
            memories it retrieves (with similarity scores), live activity, and
            the full assembled prompt. No model call is made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. What should I focus on today?"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !message.trim()}>
                {loading ? "Inspecting…" : "Inspect"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMessage(s);
                    void run(s);
                  }}
                  className="rounded-full border border-white/12 bg-white/3 px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:border-primary/40 hover:text-white disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={Hash}
              label="Tokens"
              value={`≈ ${data.token_estimate}`}
              hint="chars ÷ 4"
            />
            <StatTile
              icon={MessageSquare}
              label="Prompt"
              value={data.prompt_chars.toLocaleString()}
              hint="characters"
            />
            <StatTile
              icon={Sparkles}
              label="Memories"
              value={data.memories.length}
              hint="retrieved"
            />
            <StatTile
              icon={Clock}
              label="History"
              value={data.history_count}
              hint="recent turns"
            />
          </div>

          {data.notes.length ? (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="space-y-1 py-3 text-xs text-amber-200/90">
                {data.notes.map((note, i) => (
                  <p key={i}>• {note}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="size-4 text-primary" />
                Where the context comes from
              </CardTitle>
              <CardDescription>
                Token budget by prompt section for this query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectionBars data={data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4 text-primary" />
                Retrieved memories
                <span className="text-xs font-normal text-white/40">
                  ranked by relevance to your message
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.memories.length ? (
                <div className="space-y-2">
                  {data.memories.map((m) => (
                    <MemoryRow key={m.id} memory={m} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/45">
                  No long-term memories yet. Chat with Orbit or add facts on the
                  Memory tab — they&apos;ll show up here, ranked by relevance.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" />
                Live activity
                <span className="text-xs font-normal text-white/40">
                  from connected tools
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.live_signals.length ? (
                <div className="space-y-2">
                  {data.live_signals.map((s) => (
                    <SignalRow key={`${s.source}-${s.source_ref}`} signal={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/45">
                  No synced signals. Connect WakaTime, Calendar, GitHub, or Gmail
                  on the Integrations tab.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Raw prompt</CardTitle>
              <CardDescription>
                The exact text sent to Gemini, verbatim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Collapsible label="System instruction">
                {data.system_instruction}
              </Collapsible>
              <Collapsible label="Assembled prompt">{data.prompt}</Collapsible>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-white/12 bg-transparent">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ScanSearch className="size-6 text-white/30" />
            <p className="text-sm text-white/50">
              Run a message above to see Orbit&apos;s assembled context.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
