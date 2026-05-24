"use client";

import { Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INTEGRATION_PROVIDERS = [
  {
    id: "github",
    name: "GitHub",
    description: "Commits, PRs, and coding activity feed into Orbit's context.",
  },
  {
    id: "wakatime",
    name: "WakaTime",
    description: "Daily coding time and language breakdowns.",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Today's events and free blocks for smarter nudges.",
  },
] as const;

export function IntegrationsTab() {
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
            Synced data appears under Memory → Synced data after cron jobs run.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_PROVIDERS.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription>{provider.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant="outline">Not connected</Badge>
              <Button variant="outline" disabled>
                Connect
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
