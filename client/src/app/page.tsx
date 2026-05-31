"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Marquee } from "@/components/ui/marquee";
import { Particles } from "@/components/ui/particles";
import { useAuth } from "@/contexts/auth-context";

const WHITE_PILL =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#040404] transition-transform hover:-translate-y-0.5 hover:bg-white/90";
const OUTLINE_PILL =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10";

const PROMPTS = [
  "What should I focus on today?",
  "How's my coding streak this week?",
  "Plan my afternoon around my calendar",
  "Don't disturb me for the next 2 hours",
];

const INTEGRATIONS = [
  { icon: Calendar, label: "Google Calendar" },
  { icon: Code2, label: "GitHub" },
  { icon: Clock, label: "WakaTime" },
  { icon: MessageCircle, label: "WhatsApp" },
];

const STEPS = [
  {
    n: "01",
    title: "Link your number",
    body: "Connect WhatsApp at signup so Orbit knows where to reach you.",
  },
  {
    n: "02",
    title: "Connect your tools",
    body: "GitHub, WakaTime, and Calendar feed Orbit live signals about your day.",
  },
  {
    n: "03",
    title: "Let it orbit you",
    body: "Chat anytime, and get proactive nudges grounded in your real context.",
  },
];

function ChatMockup() {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f17]/90 shadow-2xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <div className="ml-2 flex items-center gap-2">
          <span className="inline-flex size-5 items-center justify-center rounded-md bg-primary/20 text-primary">
            <Bot className="size-3" />
          </span>
          <span className="text-xs font-medium text-white/70">Orbit</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            online
          </span>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            What should I focus on today?
          </div>
        </div>

        <div className="flex gap-2.5">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-primary">
            <Bot className="size-3.5" />
          </span>
          <div className="space-y-2 text-sm leading-relaxed text-white/80">
            <p>
              Morning, Divyesh. Your calendar&apos;s clear until the{" "}
              <span className="font-medium text-white">2 PM standup</span> —
              that&apos;s your deep-work block.
            </p>
            <p>
              WakaTime shows{" "}
              <span className="font-medium text-white">3h 4m</span> yesterday;
              one more focused session hits your weekly target. Want me to mute
              nudges till 2?
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="flex-1 text-xs text-white/30">Message Orbit…</span>
          <span className="inline-flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Send className="size-3" />
          </span>
        </div>
      </div>

      <BorderBeam
        size={90}
        duration={7}
        colorFrom="#5aa2fa"
        colorTo="#0147a3"
      />
    </div>
  );
}

export default function Home() {
  const { serverConfig } = useAuth();
  const registrationOpen = serverConfig?.allow_registration ?? true;
  const primaryHref = registrationOpen ? "/register" : "/login";

  return (
    <div className="dark flex min-h-full flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="px-4 pt-6 sm:px-6">
          <div className="bg-voxa-radial relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10">
            <div className="bg-grid mask-fade pointer-events-none absolute inset-0" />
            <Particles
              className="absolute inset-0"
              quantity={70}
              color="#5aa2fa"
              ease={70}
              size={0.5}
            />
            <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 size-80 rounded-full bg-[#0147a3]/30 blur-3xl" />

            <div className="relative grid items-center gap-10 px-6 py-14 sm:px-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
              {/* left */}
              <BlurFade>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  <AnimatedShinyText className="text-white/70">
                    Personal AI copilot · powered by WhatsApp
                  </AnimatedShinyText>
                </div>

                <h1 className="font-display mt-6 text-6xl uppercase leading-[0.82] tracking-tight sm:text-7xl lg:text-8xl">
                  <span className="text-gradient-blue">Orbit</span>
                </h1>

                <p className="mt-6 max-w-md text-lg text-white/70">
                  Your smart help for any request. Orbit knows your goals,
                  schedule, and habits — then guides you over WhatsApp before
                  you even ask.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href={primaryHref} className={WHITE_PILL}>
                    {registrationOpen ? "Try Orbit for free" : "Sign in"}
                    <ArrowUpRight className="size-4" />
                  </Link>
                  {registrationOpen ? (
                    <Link href="/login" className={OUTLINE_PILL}>
                      Sign in
                    </Link>
                  ) : null}
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    No app to install
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Self-hosted &amp; private
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Memory you control
                  </span>
                </div>
              </BlurFade>

              {/* right */}
              <BlurFade
                direction="left"
                delay={0.15}
                className="flex justify-center lg:justify-end"
              >
                <ChatMockup />
              </BlurFade>
            </div>
          </div>
        </section>

        {/* ===== Grounded-in strip ===== */}
        <section className="mx-auto w-full max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-white/40">
            Grounded in the tools you already use
          </p>
          <div className="relative mt-5">
            <Marquee pauseOnHover className="[--duration:28s]">
              {INTEGRATIONS.map((it) => (
                <div
                  key={it.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70"
                >
                  <it.icon className="size-4 text-primary" />
                  {it.label}
                </div>
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-background" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-background" />
          </div>
        </section>

        {/* ===== Bento capabilities ===== */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <BlurFade inView className="mb-10 max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
              What&apos;s inside
            </span>
            <h2 className="font-display mt-3 text-3xl uppercase leading-[0.9] tracking-wide text-white sm:text-4xl">
              One copilot,
              <br />
              every surface of your life
            </h2>
          </BlurFade>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Advanced chat — wide */}
            <BlurFade inView delay={0.05} className="lg:col-span-2">
              <div className="card-voxa flex h-full flex-col rounded-3xl p-6">
                <div className="mb-1 inline-flex w-fit items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Advanced chat
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Ask anything. It already has the context.
                </h3>
                <p className="mt-2 max-w-lg text-sm text-white/60">
                  Same brain on WhatsApp and the dashboard — powered by your
                  profile, memory, and live signals.
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {PROMPTS.map((p) => (
                    <div
                      key={p}
                      className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/75"
                    >
                      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>

            {/* Memory — tall */}
            <BlurFade inView delay={0.1}>
              <div className="card-voxa flex h-full flex-col rounded-3xl p-6">
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Brain className="size-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Memory that compounds
                </h3>
                <p className="mt-2 text-sm text-white/60">
                  Durable facts are auto-extracted from every chat and recalled
                  by meaning, not keywords.
                </p>
                <div className="mt-auto space-y-2 pt-5">
                  {[
                    "Stopping Valorant to focus on research",
                    "Hits the gym 5×/week",
                    "Researching VLMs",
                  ].map((m) => (
                    <div
                      key={m}
                      className="truncate rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/60"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>

            {/* Proactive nudge — wide with WhatsApp bubble */}
            <BlurFade inView delay={0.15} className="lg:col-span-2">
              <div className="card-voxa flex h-full flex-col justify-between gap-5 rounded-3xl p-6 lg:flex-row lg:items-center">
                <div className="max-w-sm">
                  <div className="mb-1 inline-flex items-center gap-2 text-primary">
                    <MessageCircle className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Proactive nudges
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    It reaches out first
                  </h3>
                  <p className="mt-2 text-sm text-white/60">
                    Timezone-aware check-ins that respect your quiet hours — and
                    go quiet when you say so.
                  </p>
                </div>
                <div className="w-full max-w-xs rounded-2xl rounded-bl-sm border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm text-white/85">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80">
                    <MessageCircle className="size-3" />
                    WhatsApp · 8:02 AM
                  </div>
                  You coded 2h yesterday vs your 4h goal. Want to block 9–11 for
                  a focus sprint? 🎯
                </div>
              </div>
            </BlurFade>

            {/* Integrations */}
            <BlurFade inView delay={0.2}>
              <div className="card-voxa flex h-full flex-col rounded-3xl p-6">
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Calendar className="size-5" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Live signals
                </h3>
                <p className="mt-2 text-sm text-white/60">
                  Calendar events, commits, and coding time sync in the
                  background and land in every answer.
                </p>
              </div>
            </BlurFade>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <BlurFade inView className="mb-10 max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
              How it works
            </span>
            <h2 className="font-display mt-3 text-3xl uppercase leading-[0.9] tracking-wide text-white sm:text-4xl">
              Set up in
              <br />
              under a minute
            </h2>
          </BlurFade>

          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <BlurFade key={s.n} inView delay={0.05 * i}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <span className="font-display text-3xl text-primary">
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-semibold tracking-tight text-white">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-white/60">{s.body}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </section>

        {/* ===== Final CTA with watermark ===== */}
        <section className="px-4 pb-16 sm:px-6">
          <BlurFade inView>
            <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(120deg,rgba(1,71,163,0.4),rgba(4,4,4,0.3))] px-6 py-16 sm:px-10 sm:py-20">
              <span className="font-display pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none text-[24vw] leading-none text-white/[0.04] sm:text-[18vw]">
                ORBIT
              </span>
              <div className="relative flex flex-col items-center text-center">
                <h2 className="font-display text-3xl uppercase leading-[0.9] tracking-wide text-white sm:text-5xl">
                  Ready when you are
                </h2>
                <p className="mt-4 max-w-md text-white/60">
                  Create an account, link WhatsApp, and start chatting with a
                  copilot that actually knows you.
                </p>
                <Link href={primaryHref} className={`${WHITE_PILL} mt-8`}>
                  {registrationOpen ? "Get started — it's free" : "Sign in"}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </BlurFade>
        </section>

        {/* ===== Footer ===== */}
        <footer className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="font-display uppercase tracking-wide text-white/60">
              Orbit
            </span>
            <p className="flex items-center gap-3">
              <Link
                href="/login"
                className="underline-offset-4 hover:text-white hover:underline"
              >
                Sign in
              </Link>
              {registrationOpen ? (
                <>
                  <span aria-hidden className="text-white/20">
                    ·
                  </span>
                  <Link
                    href="/register"
                    className="underline-offset-4 hover:text-white hover:underline"
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
