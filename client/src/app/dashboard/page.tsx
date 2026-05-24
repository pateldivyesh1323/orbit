"use client";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth, useRequireAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isLoading } = useRequireAuth();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Connected to the Orbit server.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : user ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {user.display_name}</CardTitle>
              <CardDescription>Your session is active.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span> {user.email}
              </p>
              <p>
                <span className="text-muted-foreground">User ID:</span> {user.id}
              </p>
              <p>
                <span className="text-muted-foreground">Verified:</span>{" "}
                {user.is_verified ? "Yes" : "No"}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
