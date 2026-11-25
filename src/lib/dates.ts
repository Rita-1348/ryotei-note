// 日付は "YYYY-MM-DD"、時刻は "HH:MM" の文字列のまま扱い、タイムゾーン変換をしない。
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1970 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTime(s: unknown): s is string {
  return typeof s === 'string' && TIME_RE.test(s);
}

function toUtc(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  const dt = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function addDays(s: string, n: number): string {
  return fromUtc(toUtc(s) + n * 86400000);
}

/** "HH:MM" → 0時からの分 */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function daysBetween(start: string, end: string): number {
  return Math.round((toUtc(end) - toUtc(start)) / 86400000);
}

export function listDays(start: string, end: string): string[] {
  const n = daysBetween(start, end);
  const out: string[] = [];
  for (let i = 0; i <= n; i++) out.push(fromUtc(toUtc(start) + i * 86400000));
  return out;
}

/** 端末の現地時刻での今日 */
export function todayString(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function formatDay(s: string): string {
  const dt = new Date(toUtc(s));
  return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}（${WEEK[dt.getUTCDay()]}）`;
}

export function formatFullDay(s: string): string {
  const dt = new Date(toUtc(s));
  return `${dt.getUTCFullYear()}年${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日（${WEEK[dt.getUTCDay()]}）`;
}

export function formatRange(start: string, end: string): string {
  const n = daysBetween(start, end);
  const label = n === 0 ? '日帰り' : `${n}泊${n + 1}日`;
  return `${formatFullDay(start)} 〜 ${formatFullDay(end)}（${label}）`;
}
