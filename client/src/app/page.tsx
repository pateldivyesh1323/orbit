"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  MessageCircle,
  Plug,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

const features = [
  {
    icon: Brain,
    title: "Profile",
    description: "Goals, health, work, and preferences in one place.",
    points: ["Edit anytime", "Used as Orbit's working memory"],
  },
  {
    icon: Sparkles,
    title: "Memory",
    description: "Long-term context Orbit can recall in every conversation.",
    points: ["Tagged & ranked by importance", "Searchable history"],
  },
  {
    icon: Plug,
    title: "Integrations",
    description: "GitHub, WakaTime, and Google Calendar feed Orbit live signals.",
    points: ["Coding activity", "Schedule awareness"],
  },
];

const steps = [
  {
    n: "01",
    title: "Link your number",
    body: "Connect WhatsApp during signup so Orbit knows where to reach you.",
  },
  {
    n: "02",
    title: "Chat naturally",
    body: "Ask Orbit anything. It remembers your goals, schedule, and preferences.",
  },
  {
    n: "03",
    title: "Stay on track",
    body: "Get nudges, reminders, and answers grounded in your real context.",
  },
];

export default function Home() {
  const { serverConfig } = useAuth();
  const registrationOpen = serverConfig?.allow_registration ?? true;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-32 h-112 bg-linear-to-b from-primary/15 via-primary/5 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -right-24 top-20 hidden size-112 rounded-full bg-primary/10 blur-3xl md:block"
          />

          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              Personal AI copilot · powered by WhatsApp
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Your life,{" "}
              <span className="bg-linear-to-br from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                gently orchestrated.
              </span>
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground">
              Orbit monitors your habits, productivity, and health—then guides
              you over WhatsApp. Use this dashboard to manage your profile,
              memory, and integrations.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {registrationOpen ? (
                <Link href="/register">
                  <Button size="lg" className="gap-1.5">
                    Create an account
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : null}
              <Link href="/login">
                <Button
                  size="lg"
                  variant={registrationOpen ? "outline" : "default"}
                  className="gap-1.5"
                >
                  Sign in
                  {!registrationOpen ? <ArrowRight className="size-4" /> : null}
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" />
                No app to install
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" />
                Works in WhatsApp you already use
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" />
                Memory you control
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 flex flex-col items-start gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              What's inside
            </span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Three surfaces, one copilot
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Manage everything Orbit knows about you from a single dashboard.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group/feature relative transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 hover:ring-primary/20"
              >
                <CardHeader>
                  <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/70" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mb-10 flex flex-col items-start gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                How it works
              </span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Set it up in under a minute
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className="relative rounded-xl border border-border/60 bg-background p-6 ring-1 ring-foreground/5"
                >
                  <span className="font-mono text-xs font-medium text-primary">
                    {s.n}
                  </span>
                  <h3 className="mt-2 font-semibold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">
                    Ready when you are
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create an account, link WhatsApp, and start chatting with
                    Orbit.
                  </p>
                </div>
              </div>
              <Link href={registrationOpen ? "/register" : "/login"}>
                <Button size="lg" className="gap-1.5">
                  {registrationOpen ? "Get started" : "Sign in"}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              Backend API:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
              </code>
            </p>
            <p className="flex items-center gap-3">
              <Link
                href="/login"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              {registrationOpen ? (
                <>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <Link
                    href="/register"
                    className="hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Create an account
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
