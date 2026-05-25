"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  Code2,
  ExternalLink,
  Loader2,
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
import {
  connectIntegration,
  disconnectIntegration,
  listIntegrations,
  syncIntegration,
} from "@/lib/integrations-api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/types/integration";

type ProviderMeta = {
  id: IntegrationProvider;
  name: string;
  description: string;
  available: boolean;
  helpUrl?: string;
  helpLabel?: string;
  icon: typeof Plug;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: "wakatime",
    name: "WakaTime",
    description:
      "Daily coding time and language breakdowns feed Orbit's prompt as fresh activity.",
    available: true,
    helpUrl: "https://wakatime.com/api-key",
    helpLabel: "Get your API key",
    icon: Plug,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Commits, PRs, and coding streaks — coming soon.",
    available: false,
    icon: Code2,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description:
      "Today's events and free blocks for smarter nudges — coming soon.",
    available: false,
    icon: Calendar,
  },
];

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

export function IntegrationsTab({ token }: { token: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        {PROVIDERS.map((provider) => {
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
        ) : (
          <form onSubmit={handleConnect} className="space-y-2">
            <div className="space-y-1.5">
              <Label
                htmlFor={`${provider.id}-key`}
                className="text-xs font-medium"
              >
                API key
              </Label>
              <Input
                id={`${provider.id}-key`}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="waka_…"
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
