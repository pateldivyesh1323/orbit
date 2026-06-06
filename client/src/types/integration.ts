export type IntegrationProvider =
  | "github"
  | "wakatime"
  | "google_calendar"
  | "gmail"
  | "todoist";
export type IntegrationStatus = "active" | "inactive" | "error";

export type Integration = {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  last_synced_at: string | null;
  last_sync_summary: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationSyncResult = {
  integration: Integration;
  context_summary: string | null;
  context_metadata: Record<string, unknown> | null;
};
