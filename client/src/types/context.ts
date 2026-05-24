export type ContextType =
  | "fact"
  | "preference"
  | "habit"
  | "health"
  | "work"
  | "relationship"
  | "goal_progress"
  | "conversation_summary"
  | "insight"
  | "other";

export type LongTermContextItem = {
  id: string;
  context_type: ContextType;
  title: string;
  content: string;
  summary: string | null;
  importance: number;
  confidence: number | null;
  source: string;
  source_ref: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  expires_at: string | null;
  is_archived: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
};
