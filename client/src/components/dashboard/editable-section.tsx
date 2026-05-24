"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EditableSectionProps = {
  title: string;
  description?: string;
  className?: string;
  view: React.ReactNode;
  form: (props: { onCancel: () => void }) => React.ReactNode;
};

export function EditableSection({
  title,
  description,
  className,
  view,
  form,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {editing
          ? form({ onCancel: () => setEditing(false) })
          : view}
      </CardContent>
    </Card>
  );
}

export function FormActions({
  onCancel,
  saving,
  submitLabel = "Save",
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  );
}
