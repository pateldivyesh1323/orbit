import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>
              Authentication UI will connect to FastAPI{" "}
              <code className="text-xs">/api/auth/login</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            <Link href="/register" className="underline underline-offset-4">
              Create an account
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
