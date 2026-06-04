import { apiFetch } from "@/lib/api";
import type {
  Integration,
  IntegrationProvider,
  IntegrationSyncResult,
} from "@/types/integration";

export function listIntegrations(token: string): Promise<Integration[]> {
  return apiFetch<Integration[]>("/api/integrations", { token });
}

export function connectIntegration(
  token: string,
  provider: IntegrationProvider,
  credentials: Record<string, string>,
): Promise<Integration> {
  return apiFetch<Integration>("/api/integrations", {
    method: "POST",
    token,
    body: JSON.stringify({ provider, credentials }),
  });
}

export async function disconnectIntegration(
  token: string,
  integrationId: string,
): Promise<void> {
  await apiFetch<void>(`/api/integrations/${integrationId}`, {
    method: "DELETE",
    token,
  });
}

export function syncIntegration(
  token: string,
  integrationId: string,
): Promise<IntegrationSyncResult> {
  return apiFetch<IntegrationSyncResult>(
    `/api/integrations/${integrationId}/sync`,
    {
      method: "POST",
      token,
    },
  );
}

const OAUTH_START_PATHS: Partial<Record<IntegrationProvider, string>> = {
  google_calendar: "/api/integrations/oauth/google_calendar/start",
  gmail: "/api/integrations/oauth/gmail/start",
};

export function startOAuth(
  token: string,
  provider: IntegrationProvider,
): Promise<{ authorization_url: string }> {
  const path = OAUTH_START_PATHS[provider];
  if (!path) {
    throw new Error(`No OAuth start endpoint for provider '${provider}'`);
  }
  return apiFetch<{ authorization_url: string }>(path, {
    method: "POST",
    token,
  });
}
