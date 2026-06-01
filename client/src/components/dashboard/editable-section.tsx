"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionIcon = React.ComponentType<{ className?: string }>;

type EditableSectionProps = {
  title: string;
  description?: string;
  icon?: SectionIcon;
  className?: string;
  view: React.ReactNode;
  form: (props: { onCancel: () => void }) => React.ReactNode;
};

export function EditableSection({
  title,
  description,
  icon: Icon,
  className,
  view,
  form,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs leading-relaxed">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {editing ? form({ onCancel: () => setEditing(false) }) : view}
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
