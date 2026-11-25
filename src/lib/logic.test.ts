import { describe, expect, it } from 'vitest';
import { listDays, isValidDate, todayString, formatDay } from './dates';
import { sortEvents, validateTripInput, type Trip, type TripEvent } from './trips';
import { exportTrip, parseImport } from './exchange';

const ev = (id: string, date: string, title: string, time?: string): TripEvent => ({
  id,
  date,
  title,
  ...(time ? { time } : {}),
});
const trip: Trip = {
  id: 'a',
  name: '京都',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  events: [
    ev('1', '2026-12-01', '昼食', '12:00'),
    ev('2', '2026-12-01', '駅に到着', '09:30'),
    ev('3', '2026-12-01', 'お土産を見る'),
    ev('4', '2026-12-01', '集合', '12:00'),
  ],
};
const wrap = (t: object) => JSON.stringify({ format: 'ryotei-note', version: 1, trip: t });

describe('dates', () => {
  it('2泊3日は3日分', () =>
    expect(listDays('2026-12-01', '2026-12-03')).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']));
  it('月またぎ・うるう年', () => expect(listDays('2028-02-28', '2028-03-01')).toHaveLength(3));
  it('不正な日付', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-1-1')).toBe(false);
  });
  it('今日は現地日付', () => expect(todayString(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01'));
  it('曜日', () => expect(formatDay('2026-12-01')).toBe('12/1（火）'));
});

describe('sortEvents', () => {
  it('時刻順・未定は末尾・同時刻は登録順', () => {
    expect(sortEvents(trip.events).map((e) => e.title)).toEqual(['駅に到着', '昼食', '集合', 'お土産を見る']);
  });
});

describe('validateTripInput', () => {
  it('終了日が開始日より前', () => expect(validateTripInput('x', '2026-12-03', '2026-12-01')).toMatch(/終了日/));
  it('必須', () => expect(validateTripInput(' ', '2026-12-01', '2026-12-01')).toMatch(/旅行名/));
  it('期間外になる予定があれば止める', () => {
    const msg = validateTripInput('京都', '2026-12-01', '2026-12-02', [ev('9', '2026-12-03', '帰宅')]);
    expect(msg).toMatch(/12\/3/);
    expect(msg).toMatch(/帰宅/);
  });
  it('短縮でも予定が収まれば可', () =>
    expect(validateTripInput('京都', '2026-12-01', '2026-12-02', trip.events)).toBeNull());
});

describe('export / import', () => {
  it('往復でき、新ID・コピー名', () => {
    const r = parseImport(exportTrip(trip), [trip]);
    if ('error' in r) throw new Error(r.error);
    expect(r.trip.name).toBe('京都（コピー）');
    expect(r.trip.id).not.toBe(trip.id);
    expect(r.trip.events.map((e) => e.id)).not.toContain('1');
    expect(r.trip.events.map((e) => e.title)).toEqual(trip.events.map((e) => e.title));
  });
  it('同名なしならそのまま', () => {
    const r = parseImport(exportTrip(trip), []);
    expect('trip' in r && r.trip.name).toBe('京都');
  });
  it.each([
    ['壊れたJSON', '{abc'],
    ['別形式', JSON.stringify({ format: 'other', version: 1 })],
    ['未来バージョン', JSON.stringify({ format: 'ryotei-note', version: 2, trip: {} })],
    ['期間外の予定', wrap({ name: 'a', startDate: '2026-12-01', endDate: '2026-12-02', events: [{ date: '2026-12-09', title: 'x' }] })],
    ['不正な時刻', wrap({ name: 'a', startDate: '2026-12-01', endDate: '2026-12-02', events: [{ date: '2026-12-01', title: 'x', time: '25:00' }] })],
    ['存在しない日付', wrap({ name: 'a', startDate: '2026-02-30', endDate: '2026-03-02', events: [] })],
  ])('不正: %s', (_n, text) => expect('error' in parseImport(text, [])).toBe(true));
});
