"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { serverConfig } = useAuth();
  const registrationOpen = serverConfig?.allow_registration;

  useEffect(() => {
    if (registrationOpen === false) {
      router.replace("/login");
    }
  }, [registrationOpen, router]);

  if (registrationOpen === undefined) {
    return (
      <AuthShell title="Create your account">
        <p className="text-sm text-white/45">Loading…</p>
      </AuthShell>
    );
  }

  if (registrationOpen === false) {
    return (
      <AuthShell title="Registration closed">
        <p className="text-sm text-white/45">
          Registration is closed on this Orbit instance. Redirecting…
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Connect WhatsApp and your data sources to get started."
    >
      <RegisterForm />
    </AuthShell>
  );
}
