// utils/buildMonthDays.ts
export type MiniEvent = { start: string; end?: string; sub?: string; color?: 'blue'|'lime' };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7; // JS: 0=Sun..6=Sat → 0=Mon..6=Sun

export function buildMonthDays(
  year: number,
  month0: number,
  events: MiniEvent[] = [],
  includeLeadingTrailing = true
) {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const firstDow = mondayIndex(new Date(year, month0, 1).getDay());
  const cells: {
    day: number;
    ymd: string;
    label?: string;
    color?: 'blue'|'lime'|'muted';
    disabled?: boolean;
  }[] = [];

  // Leading blanks
  if (includeLeadingTrailing) {
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, ymd: '', disabled: true });
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = ymd(year, month0, d);
    let label: string | undefined;
    let color: 'blue' | 'lime' | 'muted' | undefined;

    for (const ev of events) {
      const s = ev.start;
      const e = ev.end ?? ev.start;
      if (key >= s && key <= e) {
        label = ev.sub;
        color = (ev.color as any) ?? 'blue';
        break;
      }
    }

    cells.push({ day: d, ymd: key, label, color });
  }

  // Trailing blanks to complete rows
  if (includeLeadingTrailing) {
    const rem = cells.length % 7;
    if (rem) for (let i = 0; i < 7 - rem; i++) cells.push({ day: 0, ymd: '', disabled: true });
  }

  return cells;
}
