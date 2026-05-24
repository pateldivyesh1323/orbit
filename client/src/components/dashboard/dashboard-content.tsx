"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatTab } from "@/components/dashboard/chat-tab";
import { IntegrationsTab } from "@/components/dashboard/integrations-tab";
import { MemoryTab } from "@/components/dashboard/memory-tab";
import { MessagingSettingsTab } from "@/components/dashboard/messaging-settings-tab";
import { ProfileTab } from "@/components/dashboard/profile-tab";
import { useAuth, useRequireAuth } from "@/contexts/auth-context";
import { listContext } from "@/lib/context-api";
import { formatDateTime } from "@/lib/format";
import { getUserProfile } from "@/lib/users";
import type { LongTermContextItem } from "@/types/context";
import type { UserProfile } from "@/types/user";

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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Chat with Orbit, review what it knows, and configure how it reaches
            you.
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
            <CardTitle className="text-destructive">
              Could not load dashboard
            </CardTitle>
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
              hint={
                profile.contact.whatsapp_number ??
                "Configure in Messaging & automation"
              }
            />
            <StatCard label="Timezone" value={profile.location.timezone} />
            <StatCard label="Memory entries" value={String(memory.length)} />
            <StatCard
              label="Check-ins"
              value={profile.orbit_preferences.check_in_frequency}
            />
          </div>

          <Tabs defaultValue="chat">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="memory">Memory ({memory.length})</TabsTrigger>
              <TabsTrigger value="messaging">Messaging & automation</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <ChatTab token={token} displayName={displayName} />
            </TabsContent>

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
                onItemCreated={(item) => setMemory((prev) => [item, ...prev])}
              />
            </TabsContent>

            <TabsContent value="messaging" className="mt-4">
              <MessagingSettingsTab
                profile={profile}
                token={token}
                onProfileUpdated={setProfile}
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
