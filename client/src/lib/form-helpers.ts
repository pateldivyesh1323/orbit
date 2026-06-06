import type { GoalItem } from "@/types/user";

export function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join("\n");
}

export function linesToGoals(value: string, existing: GoalItem[]): GoalItem[] {
  const titles = linesToList(value);
  return titles.map((title) => {
    const match = existing.find((goal) => goal.title === title);
    return (
      match ?? {
        title,
        description: null,
        area: null,
        target_date: null,
        completed: false,
      }
    );
  });
}

export const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:scheme-dark";

// Applied to <option> elements so the native popup list renders dark instead of
// white-on-white (Chrome/Windows ignores color-scheme for the option list).
export const optionClassName = "bg-[#0b0d12] text-white";

export function timeInputValue(value: string | null): string {
  if (!value) return "";
  const parts = value.split(":");
  if (parts.length < 2) return "";
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

export function timeToApiValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}
