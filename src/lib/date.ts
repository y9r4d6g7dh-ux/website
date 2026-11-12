const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function minutesNow(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** 9:30 AM style. */
export function fmtTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** "09:30" for <input type="time"> and the AI wire format. */
export function toHHMM(min: number): string {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}

export function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtLongDate(key: string): string {
  return fromKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function fmtShortDate(key: string): string {
  return fromKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function relativeDay(key: string, today: string): string {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  return fmtShortDate(key);
}

export function greeting(min: number): string {
  if (min < 5 * 60) return "Good evening.";
  if (min < 12 * 60) return "Good morning.";
  if (min < 18 * 60) return "Good afternoon.";
  return "Good evening.";
}

/** Six-week grid (Monday first) covering the month of `monthKey`. */
export function monthGrid(monthKey: string): string[] {
  const first = fromKey(monthKey);
  first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(toKey(first), -offset);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function addMonths(key: string, n: number): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}
