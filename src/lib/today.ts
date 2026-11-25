import { toMinutes } from './dates';
import type { TripEvent } from './trips';

export type NextInfo =
  | { state: 'none' }
  | { state: 'now'; event: TripEvent; untilMin?: number }
  | { state: 'next'; event: TripEvent; inMin: number }
  | { state: 'untimed'; event: TripEvent }
  | { state: 'done' };

/** 今日の予定(sortEvents済み)と現在時刻(分)から、いま・次の予定を決める */
export function nextEvent(dayEvents: TripEvent[], nowMin: number): NextInfo {
  if (dayEvents.length === 0) return { state: 'none' };
  const timed = dayEvents.filter((e) => e.time);

  // 進行中: 開始済みで、終了時刻がまだ来ていない予定
  for (const e of [...timed].reverse()) {
    const start = toMinutes(e.time!);
    if (start > nowMin || !e.endTime) continue;
    let end = toMinutes(e.endTime);
    if (end < start) end += 24 * 60; // 翌日に終わる
    if (nowMin < end) return { state: 'now', event: e, untilMin: end - nowMin };
  }

  const upcoming = timed.find((e) => toMinutes(e.time!) > nowMin);
  if (upcoming) return { state: 'next', event: upcoming, inMin: toMinutes(upcoming.time!) - nowMin };

  const untimed = dayEvents.find((e) => !e.time);
  if (untimed) return { state: 'untimed', event: untimed };
  return { state: 'done' };
}
