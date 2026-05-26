"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SiteHeader } from "@/components/site-header";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 text-center text-muted-foreground text-sm">
          Loading…
        </main>
      </div>
    );
  }

  if (registrationOpen === false) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 text-center text-muted-foreground text-sm">
          Registration is closed on this Orbit instance. Redirecting…
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>
              Create your Orbit account to connect WhatsApp and your data sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
