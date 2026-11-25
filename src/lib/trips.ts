import { addDays, daysBetween, formatDay, isValidDate, isValidTime } from './dates';

export const KINDS = ['移動', '食事', '宿泊', '観光', 'その他'] as const;
export type Kind = (typeof KINDS)[number];

export interface TripEvent {
  id: string;
  date: string;
  title: string;
  time?: string;
  /** 終了時刻。開始より早ければ翌日に終わる予定(夜行バスなど) */
  endTime?: string;
  kind?: Kind;
  place?: string;
  memo?: string;
  bookingNo?: string;
  bookingUrl?: string;
  /** 費用(円) */
  cost?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  events: TripEvent[];
  /** 天気取得用の目的地名(任意) */
  destination?: string;
  checklist: ChecklistItem[];
  /** 最終更新(ISO)。バックアップ要否の判定に使う */
  updatedAt?: string;
}

export const MAX_TRIP_DAYS = 90;
export const MAX_COST = 100_000_000;

export function makeId(): string {
  // http のLAN接続では crypto.randomUUID が使えないため自前で生成する
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 時刻のある予定を早い順に、時間未定は末尾へ。同時刻・時間未定は登録順を保つ(安定ソート)。 */
export function sortEvents(events: TripEvent[]): TripEvent[] {
  const timed = events
    .filter((e) => e.time)
    .sort((a, b) => (a.time! < b.time! ? -1 : a.time! > b.time! ? 1 : 0));
  const untimed = events.filter((e) => !e.time);
  return [...timed, ...untimed];
}

export function eventsOnDay(trip: Trip, date: string): TripEvent[] {
  return trip.events.filter((e) => e.date === date);
}

/** 同じ時刻(または時間未定どうし)の隣の予定と順番を入れ替えられるか */
export function canMove(events: TripEvent[], date: string, id: string, dir: -1 | 1): boolean {
  const day = sortEvents(events.filter((e) => e.date === date));
  const i = day.findIndex((e) => e.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= day.length) return false;
  return (day[i].time ?? '') === (day[j].time ?? '');
}

/** 隣の予定と登録順を入れ替える。入れ替えられないときは同じ配列を返す。 */
export function moveEvent(events: TripEvent[], date: string, id: string, dir: -1 | 1): TripEvent[] {
  if (!canMove(events, date, id, dir)) return events;
  const day = sortEvents(events.filter((e) => e.date === date));
  const i = day.findIndex((e) => e.id === id);
  const a = events.findIndex((e) => e.id === day[i].id);
  const b = events.findIndex((e) => e.id === day[i + dir].id);
  const next = [...events];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export function findOutOfRange(events: TripEvent[], start: string, end: string): TripEvent[] {
  return events.filter((e) => e.date < start || e.date > end);
}

/** 旅行名・期間の入力検証。問題なければ null、あれば日本語のエラー文。 */
export function validateTripInput(
  name: string,
  start: string,
  end: string,
  events: TripEvent[] = [],
): string | null {
  if (!name.trim()) return '旅行名を入力してください。';
  if (!start) return '開始日を入力してください。';
  if (!end) return '終了日を入力してください。';
  if (!isValidDate(start)) return '開始日が正しい日付ではありません。';
  if (!isValidDate(end)) return '終了日が正しい日付ではありません。';
  if (end < start) return '終了日は開始日以降の日付にしてください。';
  if (daysBetween(start, end) + 1 > MAX_TRIP_DAYS) return `旅行期間は${MAX_TRIP_DAYS}日以内にしてください。`;
  const out = findOutOfRange(events, start, end);
  if (out.length > 0) {
    const list = out.map((e) => `${formatDay(e.date)}「${e.title}」`).join('、');
    return `この期間では、次の予定が期間外になるため変更できません: ${list}。先にその予定を期間内へ移すか削除してください。`;
  }
  return null;
}

/** 予定フォームの入力検証(日付が期間内かは呼び出し側で確認) */
export function validateEventFields(v: {
  title: string;
  time?: string;
  endTime?: string;
  bookingUrl?: string;
  cost?: string;
}): string | null {
  if (!v.title.trim()) return '予定名を入力してください。';
  if (v.endTime && !v.time) return '終了時刻を入れるときは、開始時刻も入れてください。';
  if (v.bookingUrl && !isHttpUrl(v.bookingUrl.trim())) return '予約ページのURLは http:// または https:// から始まる形で入力してください。';
  if (v.cost && v.cost.trim()) {
    const n = Number(v.cost.replace(/[,，円\s]/g, ''));
    if (!Number.isInteger(n) || n < 0 || n > MAX_COST) return '費用は0以上の整数(円)で入力してください。';
  }
  return null;
}

export function parseCost(s: string): number | undefined {
  const t = s.replace(/[,，円\s]/g, '');
  return t === '' ? undefined : Number(t);
}

function optString(e: Record<string, unknown>, k: string, label: string, n: number): string | { error: string } | undefined {
  const v = e[k];
  if (v == null || v === '') return undefined;
  if (typeof v !== 'string') return { error: `${n}件目の予定の「${label}」が正しくありません。` };
  return v;
}

/** 保存データ・読み込みファイル共通の旅行データ検証。keepIds=false なら新しいIDを振る。 */
export function normalizeTrip(raw: unknown, keepIds: boolean): { trip: Trip } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: '旅行データの形式が正しくありません。' };
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim()) return { error: '旅行名がありません。' };
  if (!isValidDate(r.startDate)) return { error: '開始日が正しくありません。' };
  if (!isValidDate(r.endDate)) return { error: '終了日が正しくありません。' };
  const start = r.startDate;
  const end = r.endDate;
  if (end < start) return { error: '終了日が開始日より前になっています。' };
  if (daysBetween(start, end) + 1 > MAX_TRIP_DAYS) return { error: `旅行期間が${MAX_TRIP_DAYS}日を超えています。` };
  if (!Array.isArray(r.events)) return { error: '予定の一覧がありません。' };
  if (r.destination != null && typeof r.destination !== 'string') return { error: '目的地が正しくありません。' };

  const events: TripEvent[] = [];
  for (let i = 0; i < r.events.length; i++) {
    const e = r.events[i] as Record<string, unknown> | null;
    const n = i + 1;
    if (!e || typeof e !== 'object') return { error: `${n}件目の予定の形式が正しくありません。` };
    if (typeof e.title !== 'string' || !e.title.trim()) return { error: `${n}件目の予定に予定名がありません。` };
    if (!isValidDate(e.date)) return { error: `${n}件目の予定の日付が正しくありません。` };
    if (e.date < start || e.date > end) return { error: `${n}件目の予定「${e.title}」が旅行期間外です。` };
    if (e.time != null && e.time !== '' && !isValidTime(e.time)) return { error: `${n}件目の予定の時刻が正しくありません。` };
    if (e.endTime != null && e.endTime !== '') {
      if (!isValidTime(e.endTime)) return { error: `${n}件目の予定の終了時刻が正しくありません。` };
      if (!e.time) return { error: `${n}件目の予定に終了時刻だけがあります。` };
    }
    if (e.kind != null && e.kind !== '' && !(KINDS as readonly string[]).includes(e.kind as string)) {
      return { error: `${n}件目の予定の種類が正しくありません。` };
    }
    const place = optString(e, 'place', '場所', n);
    const memo = optString(e, 'memo', 'メモ', n);
    const bookingNo = optString(e, 'bookingNo', '予約番号', n);
    const bookingUrl = optString(e, 'bookingUrl', '予約ページ', n);
    for (const v of [place, memo, bookingNo, bookingUrl]) if (typeof v === 'object') return v;
    if (typeof bookingUrl === 'string' && !isHttpUrl(bookingUrl)) return { error: `${n}件目の予定の予約ページのURLが正しくありません。` };
    if (e.cost != null && e.cost !== '') {
      if (typeof e.cost !== 'number' || !Number.isInteger(e.cost) || e.cost < 0 || e.cost > MAX_COST) {
        return { error: `${n}件目の予定の費用が正しくありません。` };
      }
    }
    events.push({
      id: keepIds && typeof e.id === 'string' && e.id ? e.id : makeId(),
      date: e.date,
      title: e.title.trim(),
      ...(e.time ? { time: e.time as string } : {}),
      ...(e.endTime ? { endTime: e.endTime as string } : {}),
      ...(e.kind ? { kind: e.kind as Kind } : {}),
      ...(typeof place === 'string' ? { place: place.trim() } : {}),
      ...(typeof memo === 'string' ? { memo } : {}),
      ...(typeof bookingNo === 'string' ? { bookingNo: bookingNo.trim() } : {}),
      ...(typeof bookingUrl === 'string' ? { bookingUrl: bookingUrl.trim() } : {}),
      ...(typeof e.cost === 'number' ? { cost: e.cost } : {}),
    });
  }

  const checklist: ChecklistItem[] = [];
  if (r.checklist != null) {
    if (!Array.isArray(r.checklist)) return { error: '持ち物リストの形式が正しくありません。' };
    for (let i = 0; i < r.checklist.length; i++) {
      const c = r.checklist[i] as Record<string, unknown> | null;
      if (!c || typeof c !== 'object' || typeof c.text !== 'string' || !c.text.trim()) {
        return { error: `${i + 1}件目の持ち物が正しくありません。` };
      }
      checklist.push({
        id: keepIds && typeof c.id === 'string' && c.id ? c.id : makeId(),
        text: c.text.trim(),
        done: c.done === true,
      });
    }
  }

  const id = keepIds && typeof r.id === 'string' && r.id ? r.id : makeId();
  const updatedAt = typeof r.updatedAt === 'string' && !Number.isNaN(Date.parse(r.updatedAt)) ? r.updatedAt : undefined;
  return {
    trip: {
      id,
      name: r.name.trim(),
      startDate: start,
      endDate: end,
      events,
      checklist,
      ...(typeof r.destination === 'string' && r.destination.trim() ? { destination: r.destination.trim() } : {}),
      ...(keepIds && updatedAt ? { updatedAt } : {}),
    },
  };
}

/** 旅行の複製。日付は新しい開始日に合わせてずらし、持ち物のチェックは外す。 */
export function duplicateTrip(trip: Trip, name: string, newStart: string): Trip {
  const delta = daysBetween(trip.startDate, newStart);
  return {
    id: makeId(),
    name: name.trim(),
    startDate: newStart,
    endDate: addDays(trip.endDate, delta),
    destination: trip.destination,
    events: trip.events.map((e) => ({ ...e, id: makeId(), date: addDays(e.date, delta) })),
    checklist: trip.checklist.map((c) => ({ id: makeId(), text: c.text, done: false })),
  };
}

export function mapsUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}

export interface CostSummary {
  total: number;
  byDay: { date: string; total: number }[];
  byKind: { kind: string; total: number }[];
  missing: number;
}

export function summarizeCosts(trip: Trip): CostSummary {
  const day = new Map<string, number>();
  const kind = new Map<string, number>();
  let total = 0;
  let missing = 0;
  for (const e of trip.events) {
    if (e.cost == null) {
      missing++;
      continue;
    }
    total += e.cost;
    day.set(e.date, (day.get(e.date) ?? 0) + e.cost);
    const k = e.kind ?? '未分類';
    kind.set(k, (kind.get(k) ?? 0) + e.cost);
  }
  return {
    total,
    missing,
    byDay: [...day.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, t]) => ({ date, total: t })),
    byKind: [...kind.entries()].sort(([, a], [, b]) => b - a).map(([k, t]) => ({ kind: k, total: t })),
  };
}
