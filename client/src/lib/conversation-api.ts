import { apiFetch } from "@/lib/api";
import type { ConversationChannel, ConversationMessage } from "@/types/conversation";

export function listConversationMessages(
  token: string,
  options?: { channel?: ConversationChannel | "all"; limit?: number },
): Promise<ConversationMessage[]> {
  const params = new URLSearchParams();
  if (options?.channel) params.set("channel", options.channel);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return apiFetch<ConversationMessage[]>(
    `/api/conversations/messages${query ? `?${query}` : ""}`,
    { token },
  );
}
