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
