import { Suspense } from "react";

import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Loading…
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
