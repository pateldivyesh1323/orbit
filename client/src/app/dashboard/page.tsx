import { SiteHeader } from "@/components/site-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <DashboardContent />
    </div>
  );
}
