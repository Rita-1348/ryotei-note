import { daysBetween, formatDay, isValidDate, isValidTime } from './dates';

export interface TripEvent {
  id: string;
  date: string;
  title: string;
  time?: string;
  place?: string;
  memo?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  events: TripEvent[];
}

export const MAX_TRIP_DAYS = 90;

export function makeId(): string {
  // http のLAN接続では crypto.randomUUID が使えないため自前で生成する
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  const events: TripEvent[] = [];
  for (let i = 0; i < r.events.length; i++) {
    const e = r.events[i] as Record<string, unknown> | null;
    const n = i + 1;
    if (!e || typeof e !== 'object') return { error: `${n}件目の予定の形式が正しくありません。` };
    if (typeof e.title !== 'string' || !e.title.trim()) return { error: `${n}件目の予定に予定名がありません。` };
    if (!isValidDate(e.date)) return { error: `${n}件目の予定の日付が正しくありません。` };
    if (e.date < start || e.date > end) return { error: `${n}件目の予定「${e.title}」が旅行期間外です。` };
    if (e.time != null && e.time !== '' && !isValidTime(e.time)) return { error: `${n}件目の予定の時刻が正しくありません。` };
    for (const k of ['place', 'memo'] as const) {
      if (e[k] != null && typeof e[k] !== 'string') {
        return { error: `${n}件目の予定の「${k === 'place' ? '場所' : 'メモ'}」が正しくありません。` };
      }
    }
    events.push({
      id: keepIds && typeof e.id === 'string' && e.id ? e.id : makeId(),
      date: e.date,
      title: e.title.trim(),
      ...(e.time ? { time: e.time as string } : {}),
      ...(e.place ? { place: (e.place as string).trim() } : {}),
      ...(e.memo ? { memo: e.memo as string } : {}),
    });
  }
  const id = keepIds && typeof r.id === 'string' && r.id ? r.id : makeId();
  return { trip: { id, name: r.name.trim(), startDate: start, endDate: end, events } };
}

export function mapsUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
