type InfoRowProps = {
  label: string;
  value: string | null | undefined;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}
