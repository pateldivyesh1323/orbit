import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12">
        <section className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            Your personal AI copilot
          </h1>
          <p className="max-w-2xl text-muted-foreground text-lg">
            Orbit monitors your habits, productivity, and health—then guides you
            over WhatsApp. Use this dashboard to manage your profile, memory, and
            integrations.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Goals, health, work, and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">
                Coming soon
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Memory</CardTitle>
              <CardDescription>Long-term context for Orbit</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">
                Coming soon
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>GitHub, WakaTime, Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-muted-foreground text-sm">
          Backend API:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
          </code>
          {" · "}
          <Link href="/register" className="underline underline-offset-4">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href="/login" className="underline underline-offset-4">
            sign in
          </Link>{" "}
          to get started.
        </p>
      </main>
    </div>
  );
}
