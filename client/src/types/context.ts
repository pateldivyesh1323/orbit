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

export type InspectedMemory = {
  id: string;
  title: string;
  context_type: ContextType;
  source: string;
  importance: number;
  similarity: number | null;
  embedded: boolean;
  score: number;
};

export type InspectedSignal = {
  title: string;
  source: string;
  source_ref: string | null;
  updated_at: string;
  summary: string | null;
};

export type ContextSection = {
  name: string;
  chars: number;
  tokens: number;
};

export type ContextInspection = {
  mode: string;
  channel: string;
  query: string;
  system_instruction: string;
  prompt: string;
  prompt_chars: number;
  token_estimate: number;
  sections: ContextSection[];
  memories: InspectedMemory[];
  live_signals: InspectedSignal[];
  history_count: number;
  notes: string[];
};

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
