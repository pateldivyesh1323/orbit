import { apiFetch } from "@/lib/api";
import type {
  ContextInspection,
  ContextType,
  LongTermContextItem,
} from "@/types/context";

export function listContext(
  token: string,
  limit = 20,
): Promise<LongTermContextItem[]> {
  return apiFetch<LongTermContextItem[]>(`/api/context?limit=${limit}`, {
    token,
  });
}

export type ContextCreatePayload = {
  context_type?: ContextType;
  title: string;
  content: string;
  summary?: string;
  importance?: number;
  tags?: string[];
};

export function createContext(
  token: string,
  payload: ContextCreatePayload,
): Promise<LongTermContextItem> {
  return apiFetch<LongTermContextItem>("/api/context", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export type InspectContextPayload = {
  message: string;
  mode?: "reactive" | "proactive";
  channel?: "dashboard" | "whatsapp" | "dev";
};

export function inspectContext(
  token: string,
  payload: InspectContextPayload,
): Promise<ContextInspection> {
  return apiFetch<ContextInspection>("/api/context/inspect", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
