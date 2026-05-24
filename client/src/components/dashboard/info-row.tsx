type InfoRowProps = {
  label: string;
  value: string | null | undefined;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground shrink-0 text-sm">{label}</dt>
      <dd className="text-sm sm:text-right">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}
