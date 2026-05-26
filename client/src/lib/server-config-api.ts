import { apiFetch } from "@/lib/api";

export type ServerConfig = {
  allow_registration: boolean;
};

export function getServerConfig(): Promise<ServerConfig> {
  return apiFetch<ServerConfig>("/api/config");
}
