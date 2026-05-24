"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/dashboard/editable-section";
import { ApiError } from "@/lib/api";
import { createContext } from "@/lib/context-api";
import { selectClassName } from "@/lib/form-helpers";
import type { ContextType, LongTermContextItem } from "@/types/context";

type MemoryAddFormProps = {
  token: string;
  onCreated: (item: LongTermContextItem) => void;
};

export function MemoryAddForm({ token, onCreated }: MemoryAddFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contextType, setContextType] = useState<ContextType>("fact");
  const [importance, setImportance] = useState("5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setContent("");
    setContextType("fact");
    setImportance("5");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const item = await createContext(token, {
        title,
        content,
        context_type: contextType,
        importance: Number(importance),
      });
      onCreated(item);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to add memory",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add memory entry
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add memory</CardTitle>
        <CardDescription>
          Store a fact or preference for Orbit to use in future conversations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memory-type">Type</Label>
            <select
              id="memory-type"
              className={selectClassName}
              value={contextType}
              onChange={(e) => setContextType(e.target.value as ContextType)}
            >
              <option value="fact">Fact</option>
              <option value="preference">Preference</option>
              <option value="habit">Habit</option>
              <option value="health">Health</option>
              <option value="work">Work</option>
              <option value="goal_progress">Goal progress</option>
              <option value="insight">Insight</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory-title">Title</Label>
            <Input
              id="memory-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory-content">Content</Label>
            <Textarea
              id="memory-content"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory-importance">Importance (1–10)</Label>
            <Input
              id="memory-importance"
              type="number"
              min={1}
              max={10}
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
            />
          </div>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save memory"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
