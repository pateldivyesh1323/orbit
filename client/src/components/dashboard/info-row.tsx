"use client";

import { useEffect, useRef, useState } from "react";

import { Dialog } from "@/components/ui/dialog";

type InfoRowProps = {
  label: string;
  value: string | null | undefined;
};

export function InfoRow({ label, value }: InfoRowProps) {
  const hasValue = Boolean(value?.trim());
  const ddRef = useRef<HTMLElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ddRef.current;
    if (!el) {
      setOverflowing(false);
      return;
    }
    setOverflowing(el.scrollHeight - el.clientHeight > 4);
  }, [value]);

  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground/80 text-[11px] uppercase tracking-wider sm:pt-px">
        {label}
      </dt>
      <div className="min-w-0">
        {hasValue ? (
          <>
            <dd
              ref={ddRef}
              className="text-foreground line-clamp-3 text-sm whitespace-pre-wrap"
            >
              {value}
            </dd>
            {overflowing ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-primary mt-0.5 text-xs font-medium hover:underline"
              >
                Show more
              </button>
            ) : null}
            <Dialog open={open} onClose={() => setOpen(false)} title={label}>
              <p className="whitespace-pre-wrap">{value}</p>
            </Dialog>
          </>
        ) : (
          <dd className="text-muted-foreground/50 text-sm">—</dd>
        )}
      </div>
    </div>
  );
}
