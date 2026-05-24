"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryAddForm } from "@/components/dashboard/memory-add-form";
import { ProfileTab } from "@/components/dashboard/profile-tab";
import { useAuth, useRequireAuth } from "@/contexts/auth-context";
import { listContext } from "@/lib/context-api";
import { formatDateTime } from "@/lib/format";
import { getUserProfile } from "@/lib/users";
import type { LongTermContextItem } from "@/types/context";
import type { UserProfile } from "@/types/user";

const INTEGRATION_PROVIDERS = [
  { id: "github", name: "GitHub", description: "Commits and activity" },
  { id: "wakatime", name: "WakaTime", description: "Coding time stats" },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Events and schedule",
  },
] as const;

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function MemoryTab({
  items,
  token,
  onItemCreated,
}: {
  items: LongTermContextItem[];
  token: string;
  onItemCreated: (item: LongTermContextItem) => void;
}) {
  return (
    <div className="space-y-4">
      <MemoryAddForm token={token} onCreated={onItemCreated} />
      {!items.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No memory entries yet</CardTitle>
            <CardDescription>
              Long-term context will appear here as Orbit learns about you.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>
                      {formatDateTime(item.created_at)}
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
      )}
    </div>
  );
}

function IntegrationsTab() {
  return (
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
  );
}

export function DashboardContent() {
  const { user, token } = useAuth();
  const { isLoading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memory, setMemory] = useState<LongTermContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, memoryData] = await Promise.all([
        getUserProfile(token),
        listContext(token),
      ]);
      setProfile(profileData);
      setMemory(memoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadDashboard();
    }
  }, [authLoading, token, loadDashboard]);

  const displayName =
    profile?.identity.display_name ?? user?.display_name ?? "there";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your Orbit command center for profile, memory, and integrations.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadDashboard}
          disabled={loading || !token}
        >
          Refresh
        </Button>
      </div>

      {authLoading || loading ? (
        <p className="text-muted-foreground text-sm">Loading dashboard…</p>
      ) : null}

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={loadDashboard}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {profile && token && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="WhatsApp"
              value={profile.contact.whatsapp_number ? "Linked" : "Not set"}
              hint={profile.contact.whatsapp_number ?? "Add number in profile"}
            />
            <StatCard label="Timezone" value={profile.location.timezone} />
            <StatCard label="Memory entries" value={String(memory.length)} />
            <StatCard
              label="Focus areas"
              value={String(profile.goals.focus_areas.length)}
            />
          </div>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="memory">Memory ({memory.length})</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
              <ProfileTab
                profile={profile}
                token={token}
                onProfileUpdated={setProfile}
              />
            </TabsContent>
            <TabsContent value="memory" className="mt-4">
              <MemoryTab
                items={memory}
                token={token}
                onItemCreated={(item) =>
                  setMemory((prev) => [item, ...prev])
                }
              />
            </TabsContent>
            <TabsContent value="integrations" className="mt-4">
              <IntegrationsTab />
            </TabsContent>
          </Tabs>

          <p className="text-muted-foreground text-xs">
            Last updated {formatDateTime(profile.updated_at)}
            {profile.last_login_at
              ? ` · Last login ${formatDateTime(profile.last_login_at)}`
              : null}
          </p>
        </>
      ) : null}
    </main>
  );
}
