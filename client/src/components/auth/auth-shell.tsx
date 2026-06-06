import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { OrbitMark } from "@/components/orbit-mark";

const FEATURES = [
  "Grounded in your calendar, code, and inbox",
  "Remembers what matters — recalls it when relevant",
  "Reaches out proactively, on your schedule",
];

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="dark bg-background text-foreground flex min-h-dvh">
      {/* Brand stage (desktop only) */}
      <div className="bg-voxa-radial relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 p-10 lg:flex xl:p-14">
        <div className="bg-grid mask-fade pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-20 top-16 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 size-80 rounded-full bg-[#0147a3]/30 blur-3xl" />

        <Link
          href="/"
          className="relative flex w-fit items-center gap-2 tracking-tight"
        >
          <OrbitMark className="size-8" />
          <span className="font-display text-xl uppercase tracking-wide text-white">
            Orbit
          </span>
        </Link>

        <div className="relative space-y-6">
          <h2 className="font-display text-4xl uppercase leading-[0.9] tracking-tight text-white xl:text-5xl">
            Your life,
            <br />
            gently
            <br />
            orchestrated.
          </h2>
          <p className="max-w-sm text-white/60">
            A personal AI copilot that knows your goals, schedule, and habits —
            and reaches out over WhatsApp before you even ask.
          </p>
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-sm text-white/70"
              >
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/30">
          Self-hosted · private · yours.
        </p>
      </div>

      {/* Form column */}
      <div className="relative flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Link href="/" className="flex items-center gap-2 tracking-tight">
            <OrbitMark className="size-7" />
            <span className="font-display text-lg uppercase tracking-wide text-white">
              Orbit
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 lg:py-10">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
