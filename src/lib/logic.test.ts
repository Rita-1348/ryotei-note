import { describe, expect, it } from 'vitest';
import { listDays, isValidDate, todayString, formatDay, addDays } from './dates';
import {
  canMove,
  duplicateTrip,
  moveEvent,
  sortEvents,
  summarizeCosts,
  validateEventFields,
  validateTripInput,
  type Trip,
  type TripEvent,
} from './trips';
import { exportTrip, parseImport } from './exchange';
import { nextEvent } from './today';
import { weatherLabel } from './weather';

const ev = (id: string, date: string, title: string, time?: string, extra: Partial<TripEvent> = {}): TripEvent => ({
  id,
  date,
  title,
  ...(time ? { time } : {}),
  ...extra,
});
const trip: Trip = {
  id: 'a',
  name: '京都',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  checklist: [{ id: 'c1', text: '充電器', done: true }],
  events: [
    ev('1', '2026-12-01', '昼食', '12:00'),
    ev('2', '2026-12-01', '駅に到着', '09:30'),
    ev('3', '2026-12-01', 'お土産を見る'),
    ev('4', '2026-12-01', '集合', '12:00'),
  ],
};
const wrap = (t: object, version = 2) => JSON.stringify({ format: 'ryotei-note', version, trip: t });
const base = { name: 'a', startDate: '2026-12-01', endDate: '2026-12-02' };

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
  it('日付の加算', () => expect(addDays('2026-12-31', 1)).toBe('2027-01-01'));
});

describe('sortEvents / moveEvent', () => {
  it('時刻順・未定は末尾・同時刻は登録順', () => {
    expect(sortEvents(trip.events).map((e) => e.title)).toEqual(['駅に到着', '昼食', '集合', 'お土産を見る']);
  });
  it('同時刻どうしは入れ替えられ、順序が変わる', () => {
    expect(canMove(trip.events, '2026-12-01', '1', 1)).toBe(true);
    const moved = moveEvent(trip.events, '2026-12-01', '1', 1);
    expect(sortEvents(moved).map((e) => e.title)).toEqual(['駅に到着', '集合', '昼食', 'お土産を見る']);
  });
  it('時刻が違う予定とは入れ替えられない', () => {
    expect(canMove(trip.events, '2026-12-01', '2', 1)).toBe(false);
    expect(moveEvent(trip.events, '2026-12-01', '2', 1)).toBe(trip.events);
  });
  it('時間未定どうしは入れ替えられる', () => {
    const evs = [ev('u1', '2026-12-02', 'A'), ev('u2', '2026-12-02', 'B')];
    expect(sortEvents(moveEvent(evs, '2026-12-02', 'u2', -1)).map((e) => e.title)).toEqual(['B', 'A']);
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

describe('validateEventFields', () => {
  it('予定名は必須', () => expect(validateEventFields({ title: '  ' })?.message).toMatch(/予定名/));
  it('終了だけは不可', () => expect(validateEventFields({ title: 'x', endTime: '10:00' })?.message).toMatch(/開始時刻/));
  it('予約URLは http(s) のみ', () => {
    expect(validateEventFields({ title: 'x', bookingUrl: 'javascript:alert(1)' })?.message).toMatch(/URL/);
    expect(validateEventFields({ title: 'x', bookingUrl: 'https://example.com/r/1' })).toBeNull();
  });
  it('費用は0以上の整数', () => {
    expect(validateEventFields({ title: 'x', cost: '-5' })?.message).toMatch(/費用/);
    expect(validateEventFields({ title: 'x', cost: '12.5' })?.message).toMatch(/費用/);
    expect(validateEventFields({ title: 'x', cost: '1,200円' })).toBeNull();
  });
});

describe('nextEvent', () => {
  const day = sortEvents([
    ev('a', '2026-12-01', '朝', '09:00'),
    ev('b', '2026-12-01', '夜行バス', '23:00', { endTime: '06:00' }),
    ev('c', '2026-12-01', '未定の用事'),
  ]);
  it('これからの予定と残り分数', () => {
    const r = nextEvent(day, 8 * 60 + 30);
    expect(r).toMatchObject({ state: 'next', inMin: 30 });
  });
  it('終了時刻があれば進行中(日またぎ含む)', () => {
    expect(nextEvent(day, 23 * 60 + 30)).toMatchObject({ state: 'now', untilMin: 6 * 60 + 30 });
  });
  it('時刻のある予定が終われば、時間未定を案内', () => {
    expect(nextEvent(sortEvents([ev('a', 'd', '朝', '09:00'), ev('c', 'd', '未定')]), 12 * 60)).toMatchObject({ state: 'untimed' });
  });
  it('全部終わった/予定なし', () => {
    expect(nextEvent([ev('a', 'd', '朝', '09:00')], 12 * 60)).toEqual({ state: 'done' });
    expect(nextEvent([], 0)).toEqual({ state: 'none' });
  });
});

describe('summarizeCosts', () => {
  it('合計・日別・種類別・未入力件数', () => {
    const t: Trip = {
      ...trip,
      events: [
        ev('1', '2026-12-01', 'a', '10:00', { cost: 1000, kind: '食事' }),
        ev('2', '2026-12-01', 'b', undefined, { cost: 500, kind: '移動' }),
        ev('3', '2026-12-02', 'c', undefined, { cost: 2000, kind: '食事' }),
        ev('4', '2026-12-02', 'd'),
      ],
    };
    const s = summarizeCosts(t);
    expect(s.total).toBe(3500);
    expect(s.missing).toBe(1);
    expect(s.byDay).toEqual([
      { date: '2026-12-01', total: 1500 },
      { date: '2026-12-02', total: 2000 },
    ]);
    expect(s.byKind[0]).toEqual({ kind: '食事', total: 3000 });
  });
});

describe('duplicateTrip', () => {
  it('日付をずらし、新ID・チェックを外す', () => {
    const d = duplicateTrip(trip, '京都（来年）', '2027-03-10');
    expect(d.startDate).toBe('2027-03-10');
    expect(d.endDate).toBe('2027-03-12');
    expect(d.events.every((e) => e.date === '2027-03-10')).toBe(true);
    expect(d.id).not.toBe(trip.id);
    expect(d.events[0].id).not.toBe(trip.events[0].id);
    expect(d.checklist).toEqual([{ id: expect.any(String), text: '充電器', done: false }]);
    expect(trip.checklist[0].done).toBe(true); // 元は変わらない
  });
});

describe('export / import', () => {
  const full: Trip = {
    ...trip,
    destination: '京都市',
    events: [ev('1', '2026-12-01', '新幹線', '08:00', { endTime: '10:15', kind: '移動', bookingNo: 'AB12', bookingUrl: 'https://example.com/r', cost: 14000, place: '東京駅' })],
  };
  it('往復でき、新ID・コピー名・新しい項目も保持', () => {
    const r = parseImport(exportTrip(full), [full]);
    if ('error' in r) throw new Error(r.error);
    expect(r.trip.name).toBe('京都（コピー）');
    expect(r.trip.id).not.toBe(full.id);
    expect(r.trip.events[0]).toMatchObject({ endTime: '10:15', kind: '移動', bookingNo: 'AB12', cost: 14000, place: '東京駅' });
    expect(r.trip.events[0].id).not.toBe('1');
    expect(r.trip.destination).toBe('京都市');
    expect(r.trip.checklist).toEqual([{ id: expect.any(String), text: '充電器', done: true }]);
  });
  it('同名なしならそのまま', () => {
    const r = parseImport(exportTrip(trip), []);
    expect('trip' in r && r.trip.name).toBe('京都');
  });
  it('旧バージョン1のファイルも読める(持ち物は空)', () => {
    const r = parseImport(wrap({ ...base, events: [{ date: '2026-12-01', title: 'x' }] }, 1), []);
    expect('trip' in r && r.trip.checklist).toEqual([]);
  });
  it.each([
    ['壊れたJSON', '{abc'],
    ['別形式', JSON.stringify({ format: 'other', version: 1 })],
    ['未来バージョン', JSON.stringify({ format: 'ryotei-note', version: 3, trip: {} })],
    ['期間外の予定', wrap({ ...base, events: [{ date: '2026-12-09', title: 'x' }] })],
    ['不正な時刻', wrap({ ...base, events: [{ date: '2026-12-01', title: 'x', time: '25:00' }] })],
    ['終了だけある', wrap({ ...base, events: [{ date: '2026-12-01', title: 'x', endTime: '10:00' }] })],
    ['不正な種類', wrap({ ...base, events: [{ date: '2026-12-01', title: 'x', kind: '宇宙' }] })],
    ['危険なURL', wrap({ ...base, events: [{ date: '2026-12-01', title: 'x', bookingUrl: 'javascript:alert(1)' }] })],
    ['負の費用', wrap({ ...base, events: [{ date: '2026-12-01', title: 'x', cost: -1 }] })],
    ['持ち物が不正', wrap({ ...base, events: [], checklist: [{ text: '' }] })],
    ['存在しない日付', wrap({ name: 'a', startDate: '2026-02-30', endDate: '2026-03-02', events: [] })],
  ])('不正: %s', (_n, text) => expect('error' in parseImport(text, [])).toBe(true));
});

describe('weatherLabel', () => {
  it('コードを日本語に', () => {
    expect(weatherLabel(0)).toBe('快晴');
    expect(weatherLabel(63)).toBe('雨');
    expect(weatherLabel(95)).toBe('雷雨');
  });
});
