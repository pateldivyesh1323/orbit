import { apiFetch } from "@/lib/api";

export type ChatResponse = {
  reply: string;
  user_id: string;
  display_name: string;
};

export async function sendChatMessage(
  token: string,
  message: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}
