const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  if (absDiff < MINUTE) return "just now";

  const formatUnit = (value: number, unit: string) => {
    const rounded = Math.floor(value);
    const plural = rounded !== 1 ? "s" : "";
    return isFuture
      ? `in ${rounded} ${unit}${plural}`
      : `${rounded} ${unit}${plural} ago`;
  };

  if (absDiff < HOUR) return formatUnit(absDiff / MINUTE, "minute");
  if (absDiff < DAY) return formatUnit(absDiff / HOUR, "hour");
  if (absDiff < WEEK) return formatUnit(absDiff / DAY, "day");
  if (absDiff < 30 * DAY) return formatUnit(absDiff / WEEK, "week");
  if (absDiff < 365 * DAY) return formatUnit(absDiff / (30 * DAY), "month");
  return formatUnit(absDiff / (365 * DAY), "year");
}

export function formatDuration(ms: number): string {
  if (ms < SECOND) return `${ms}ms`;
  if (ms < MINUTE) return `${(ms / SECOND).toFixed(1)}s`;
  if (ms < HOUR) {
    const mins = Math.floor(ms / MINUTE);
    const secs = Math.floor((ms % MINUTE) / SECOND);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (ms < DAY) {
    const hrs = Math.floor(ms / HOUR);
    const mins = Math.floor((ms % HOUR) / MINUTE);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  const days = Math.floor(ms / DAY);
  const hrs = Math.floor((ms % DAY) / HOUR);
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}

export function isOverdue(dueDate: Date | string | number): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

export function getDeadlineUrgency(
  dueDate: Date | string | number
): "overdue" | "critical" | "soon" | "normal" | "distant" {
  const diff = new Date(dueDate).getTime() - Date.now();

  if (diff < 0) return "overdue";
  if (diff < 2 * HOUR) return "critical";
  if (diff < DAY) return "soon";
  if (diff < 3 * DAY) return "normal";
  return "distant";
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function formatCompactDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();

  if (isSameDay(d, now)) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function generateDateRange(
  start: Date,
  end: Date,
  stepMs: number = DAY
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setTime(current.getTime() + stepMs);
  }

  return dates;
}
