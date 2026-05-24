export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parts = value.split(":");
  if (parts.length < 2) return value;
  const hour = Number(parts[0]);
  const minute = parts[1];
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

export function formatList(items: string[], empty = "None yet"): string {
  if (!items.length) return empty;
  return items.join(", ");
}
