"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  Code2,
  ExternalLink,
  Loader2,
  Mail,
  Plug,
  RefreshCw,
  Trash2,
  X,
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  connectIntegration,
  disconnectIntegration,
  listIntegrations,
  startOAuth,
  syncIntegration,
} from "@/lib/integrations-api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/types/integration";

type ConnectStrategy = "api_key" | "oauth";

type ProviderMeta = {
  id: IntegrationProvider;
  name: string;
  description: string;
  available: boolean;
  strategy: ConnectStrategy;
  helpUrl?: string;
  helpLabel?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  setupSteps?: string[];
  icon: typeof Plug;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description:
      "Today's events, tomorrow's schedule, and free blocks so Orbit can suggest when to focus.",
    available: true,
    strategy: "oauth",
    setupSteps: [
      "One-time admin setup: configure a Google Cloud OAuth client (see docs/google_calendar_setup.md in the repo) and set GOOGLE_OAUTH_* env vars on the backend.",
      "Click Connect with Google below.",
      "Sign in and tick the box granting calendar.readonly access on the consent screen.",
      "You'll bounce back here with a green banner; click Sync now to pull today's events.",
    ],
    icon: Calendar,
  },
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Unread inbox and recent senders so Orbit can flag what needs a reply and follow-ups you owe.",
    available: true,
    strategy: "oauth",
    setupSteps: [
      "One-time admin setup: enable the Gmail API in your Google Cloud project (same project as Calendar).",
      "Click Connect with Google below.",
      "Sign in and grant read-only Gmail access on the consent screen.",
      "You'll bounce back here with a green banner; click Sync now to pull your inbox.",
    ],
    icon: Mail,
  },
  {
    id: "wakatime",
    name: "WakaTime",
    description:
      "Daily coding time and language breakdowns feed Orbit's prompt as fresh activity.",
    available: true,
    strategy: "api_key",
    helpUrl: "https://wakatime.com/api-key",
    helpLabel: "Get your API key",
    inputLabel: "API key",
    inputPlaceholder: "waka_…",
    setupSteps: [
      "Open wakatime.com/api-key (link below) — sign in if needed.",
      "Copy the 'Secret API Key' value.",
      "Paste it into the field below and click Connect.",
    ],
    icon: Plug,
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Commits, open PRs, contribution streak — Orbit can nudge you about review queues and momentum.",
    available: true,
    strategy: "api_key",
    helpUrl: "https://github.com/settings/tokens/new?description=Orbit&scopes=read:user",
    helpLabel: "Generate a personal access token (read:user)",
    inputLabel: "Personal access token",
    inputPlaceholder: "ghp_… or github_pat_…",
    setupSteps: [
      "Click the help link below — it opens GitHub's new-token page pre-filled with the right scope.",
      "Keep 'read:user' selected, set an expiration (90 days is fine), and click Generate token.",
      "Copy the token immediately (GitHub only shows it once).",
      "Paste it here and click Connect.",
    ],
    icon: Code2,
  },
];

function SetupSteps({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        Setup
      </p>
      <ol className="text-foreground list-decimal space-y-1 pl-4 text-xs leading-relaxed">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function IntegrationCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </CardContent>
    </Card>
  );
}

function statusBadge(status: IntegrationStatus | "disconnected") {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <Check className="size-3" />
          Connected
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="border-destructive/40 bg-destructive/10 text-destructive"
        >
          <AlertCircle className="size-3" />
          Error
        </Badge>
      );
    case "inactive":
      return <Badge variant="outline">Inactive</Badge>;
    default:
      return <Badge variant="outline">Not connected</Badge>;
  }
}

type CallbackStatus = {
  provider: IntegrationProvider;
  kind: "success" | "error";
  detail?: string;
};

function readCallbackStatus(): CallbackStatus | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("integration");
  const status = params.get("status");
  if (!provider || !status) return null;
  const detail = params.get("detail") ?? undefined;
  return {
    provider: provider as IntegrationProvider,
    kind: status === "connected" ? "success" : "error",
    detail,
  };
}

function clearCallbackQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("integration");
  url.searchParams.delete("status");
  url.searchParams.delete("detail");
  // Preserve `tab=integrations` so we don't pop back to the default tab.
  window.history.replaceState({}, "", url.toString());
}

export function IntegrationsTab({ token }: { token: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [callback, setCallback] = useState<CallbackStatus | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await listIntegrations(token);
      setIntegrations(items);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load integrations",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const status = readCallbackStatus();
    if (status) {
      setCallback(status);
      clearCallbackQuery();
    }
    void refresh();
  }, [refresh]);

  const upsertIntegration = useCallback((next: Integration) => {
    setIntegrations((prev) => {
      const without = prev.filter((i) => i.id !== next.id);
      return [...without, next];
    });
  }, []);

  const removeIntegration = useCallback((id: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="size-5 text-primary" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect external tools so Orbit knows what you&apos;re working on.
            Synced data appears in the prompt as live activity and under Memory.
          </CardDescription>
        </CardHeader>
      </Card>

      {callback ? (
        <Card
          className={cn(
            callback.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-destructive/40 bg-destructive/5",
          )}
        >
          <CardContent className="flex items-center justify-between gap-3 py-3 text-sm">
            <span>
              {callback.kind === "success" ? (
                <>
                  <Check className="mr-1 inline size-3.5" />
                  Google Calendar connected. Hit <strong>Sync now</strong> to
                  pull today&apos;s events.
                </>
              ) : (
                <>
                  <AlertCircle className="mr-1 inline size-3.5 text-destructive" />
                  Could not connect Google Calendar
                  {callback.detail ? `: ${callback.detail}` : ""}.
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setCallback(null)}
              className="opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
            <span className="text-destructive">{loadError}</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading && integrations.length === 0
          ? PROVIDERS.map((provider) => (
              <IntegrationCardSkeleton key={provider.id} />
            ))
          : PROVIDERS.map((provider) => {
              const integration =
                integrations.find((i) => i.provider === provider.id) ?? null;
              return (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  integration={integration}
                  token={token}
                  disabled={loading && !integration}
                  onUpserted={upsertIntegration}
                  onRemoved={removeIntegration}
                />
              );
            })}
      </div>
    </div>
  );
}

type ProviderCardProps = {
  provider: ProviderMeta;
  integration: Integration | null;
  token: string;
  disabled: boolean;
  onUpserted: (integration: Integration) => void;
  onRemoved: (id: string) => void;
};

function ProviderCard({
  provider,
  integration,
  token,
  disabled,
  onUpserted,
  onRemoved,
}: ProviderCardProps) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const Icon = provider.icon;

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!provider.available || !apiKey.trim()) return;
    setBusy("connect");
    setError(null);
    try {
      const next = await connectIntegration(token, provider.id, {
        api_key: apiKey.trim(),
      });
      onUpserted(next);
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setBusy(null);
    }
  }

  async function handleOAuthConnect() {
    setBusy("connect");
    setError(null);
    try {
      const { authorization_url } = await startOAuth(token, provider.id);
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
      setBusy(null);
    }
  }

  async function handleSync() {
    if (!integration) return;
    setBusy("sync");
    setError(null);
    try {
      const result = await syncIntegration(token, integration.id);
      onUpserted(result.integration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!integration) return;
    if (
      !confirm(
        `Disconnect ${provider.name}? Synced data stays in Memory but won't refresh.`,
      )
    )
      return;
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectIntegration(token, integration.id);
      onRemoved(integration.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card
      className={cn(
        "transition-shadow",
        integration?.status === "active" && "border-primary/30",
        integration?.status === "error" && "border-destructive/40",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-primary" />
            {provider.name}
          </CardTitle>
          {statusBadge(integration?.status ?? "disconnected")}
        </div>
        <CardDescription>{provider.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!provider.available ? (
          <p className="text-muted-foreground text-xs">
            This connector isn&apos;t available yet.
          </p>
        ) : integration ? (
          <>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sync</span>
                <span className="font-medium">
                  {integration.last_synced_at
                    ? formatDateTime(integration.last_synced_at)
                    : "Never"}
                </span>
              </div>
              {integration.last_sync_summary ? (
                <p className="text-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-2 leading-relaxed">
                  {integration.last_sync_summary}
                </p>
              ) : null}
              {integration.last_sync_error ? (
                <p className="text-destructive rounded-md bg-destructive/10 p-2 leading-relaxed">
                  {integration.last_sync_error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSync}
                disabled={busy !== null}
                className="gap-1.5"
              >
                {busy === "sync" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Sync now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={busy !== null}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {busy === "disconnect" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Disconnect
              </Button>
            </div>
          </>
        ) : provider.strategy === "oauth" ? (
          <div className="space-y-3">
            {provider.setupSteps ? (
              <SetupSteps steps={provider.setupSteps} />
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={handleOAuthConnect}
              disabled={disabled || busy !== null}
              className="gap-1.5"
            >
              {busy === "connect" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon className="size-3.5" />
              )}
              Connect with Google
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3">
            {provider.setupSteps ? (
              <SetupSteps steps={provider.setupSteps} />
            ) : null}
            <div className="space-y-1.5">
              <Label
                htmlFor={`${provider.id}-key`}
                className="text-xs font-medium"
              >
                {provider.inputLabel ?? "API key"}
              </Label>
              <Input
                id={`${provider.id}-key`}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.inputPlaceholder ?? ""}
                autoComplete="off"
                disabled={disabled || busy !== null}
              />
              {provider.helpUrl ? (
                <a
                  href={provider.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground inline-flex items-center gap-1 text-[11px] hover:text-foreground"
                >
                  {provider.helpLabel ?? "Where do I find this?"}
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={disabled || busy !== null || !apiKey.trim()}
              className="gap-1.5"
            >
              {busy === "connect" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plug className="size-3.5" />
              )}
              Connect
            </Button>
          </form>
        )}

        {error ? (
          <div className="text-destructive bg-destructive/5 flex items-start justify-between gap-2 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
