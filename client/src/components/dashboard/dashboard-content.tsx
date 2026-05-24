"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChatTab } from "@/components/dashboard/chat-tab";
import {
  DashboardSidebar,
  type DashboardSection,
} from "@/components/dashboard/dashboard-sidebar";
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

const SECTION_TITLES: Record<DashboardSection, { title: string; description: string }> = {
  chat: {
    title: "Chat",
    description: "Same AI as WhatsApp — powered by your profile and memory.",
  },
  profile: {
    title: "Profile",
    description: "Goals, health, work, and how Orbit should communicate.",
  },
  memory: {
    title: "Memory",
    description: "Long-term facts, chat history, and synced integration data.",
  },
  messaging: {
    title: "Messaging & automation",
    description: "WhatsApp channel, check-ins, and background sync settings.",
  },
  integrations: {
    title: "Integrations",
    description: "Connect tools so Orbit knows what you're working on.",
  },
};

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
  const [activeSection, setActiveSection] = useState<DashboardSection>("chat");
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

  const sectionMeta = SECTION_TITLES[activeSection];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col lg:flex-row">
      <DashboardSidebar
        active={activeSection}
        onChange={setActiveSection}
        memoryCount={memory.length}
        displayName={displayName}
        onRefresh={loadDashboard}
        refreshing={loading}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {sectionMeta.title}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {sectionMeta.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 lg:hidden"
              onClick={loadDashboard}
              disabled={loading || !token}
            >
              <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              {activeSection === "chat" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="WhatsApp"
                    value={profile.contact.whatsapp_number ? "Linked" : "Not set"}
                    hint={
                      profile.contact.whatsapp_number ??
                      "Configure in Messaging"
                    }
                  />
                  <StatCard label="Timezone" value={profile.location.timezone} />
                  <StatCard label="Memory entries" value={String(memory.length)} />
                  <StatCard
                    label="Check-ins"
                    value={profile.orbit_preferences.check_in_frequency}
                  />
                </div>
              ) : null}

              {activeSection === "chat" ? (
                <ChatTab token={token} displayName={displayName} />
              ) : null}

              {activeSection === "profile" ? (
                <ProfileTab
                  profile={profile}
                  token={token}
                  onProfileUpdated={setProfile}
                />
              ) : null}

              {activeSection === "memory" ? (
                <MemoryTab
                  items={memory}
                  token={token}
                  onItemCreated={(item) => setMemory((prev) => [item, ...prev])}
                />
              ) : null}

              {activeSection === "messaging" ? (
                <MessagingSettingsTab
                  profile={profile}
                  token={token}
                  onProfileUpdated={setProfile}
                />
              ) : null}

              {activeSection === "integrations" ? (
                <IntegrationsTab />
              ) : null}

              <p className="text-muted-foreground text-xs">
                Last updated {formatDateTime(profile.updated_at)}
                {profile.last_login_at
                  ? ` · Last login ${formatDateTime(profile.last_login_at)}`
                  : null}
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
