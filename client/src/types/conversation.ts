export type ConversationChannel = "whatsapp" | "dashboard" | "dev";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  channel: ConversationChannel;
  external_id: string | null;
  created_at: string;
};
