import { useEffect, useMemo, useRef, useState } from 'react';
import EventForm from './EventForm';
import ConfirmDialog from './ConfirmDialog';
import Sheet from './Sheet';
import Checklist from './Checklist';
import Costs from './Costs';
import TodayCard from './TodayCard';
import { onTabKeyDown } from './tabs';
import { formatDay, formatFullDay, formatRangeShort, listDays, nowMinutes, todayString } from '../lib/dates';
import { nextEvent } from '../lib/today';
import { fetchWeather, type WeatherResult } from '../lib/weather';
import {
  canMove,
  eventsOnDay,
  formatYen,
  makeId,
  mapsUrl,
  moveEvent,
  sortEvents,
  type ChecklistItem,
  type Trip,
  type TripEvent,
} from '../lib/trips';

interface Props {
  trip: Trip;
  otherTrips: Trip[];
  onBack: () => void;
  onUpdate: (t: Trip) => string | null;
}

type Editing = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; id: string };
type View = 'plan' | 'list' | 'cost';
const VIEWS: { id: View; label: string }[] = [
  { id: 'plan', label: '予定' },
  { id: 'list', label: '持ち物' },
  { id: 'cost', label: '費用' },
];

export default function TripDetail({ trip, otherTrips, onBack, onUpdate }: Props) {
  const days = listDays(trip.startDate, trip.endDate);
  const today = todayString();
  const [view, setView] = useState<View>('plan');
  const [selected, setSelected] = useState(() => (days.includes(today) ? today : days[0]));
  const [editing, setEditing] = useState<Editing>({ kind: 'none' });
  const [deleting, setDeleting] = useState<TripEvent | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [nowMin, setNowMin] = useState(nowMinutes);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 選んだ日付タブを、列内の見える位置へ送る
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selected, view]);

  // 日付・表示を切り替えたら、本文を先頭へ戻す
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [selected, view]);

  // 「今日」カードの残り時間を更新する
  useEffect(() => {
    const t = setInterval(() => setNowMin(nowMinutes()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 天気(目的地が入っている旅行のみ。取得できなくても他の機能には影響しない)
  const [weather, setWeather] = useState<WeatherResult | 'loading' | null>(null);
  useEffect(() => {
    if (!trip.destination) return setWeather(null);
    const ctl = new AbortController();
    setWeather('loading');
    fetchWeather(trip.destination, trip.startDate, trip.endDate, ctl.signal).then((r) => {
      if (!ctl.signal.aborted) setWeather(r);
    });
    return () => ctl.abort();
  }, [trip.destination, trip.startDate, trip.endDate]);

  const placeHistory = useMemo(() => {
    const s = new Set<string>();
    for (const t of [trip, ...otherTrips]) for (const e of t.events) if (e.place) s.add(e.place);
    return [...s].slice(-50);
  }, [trip, otherTrips]);

  const dayEvents = sortEvents(eventsOnDay(trip, selected));
  const untimedStart = dayEvents.findIndex((e) => !e.time);
  const editingEvent = editing.kind === 'edit' ? trip.events.find((e) => e.id === editing.id) : undefined;
  const closeForm = () => setEditing({ kind: 'none' });
  const dayWeather = weather && weather !== 'loading' && weather.ok ? weather.days[selected] : undefined;
  const viewIndex = VIEWS.findIndex((v) => v.id === view);
  const dayIndex = days.indexOf(selected);

  const add = (v: Omit<TripEvent, 'id'>) => {
    const err = onUpdate({ ...trip, events: [...trip.events, { id: makeId(), ...v }] });
    if (!err) {
      closeForm();
      setSelected(v.date);
      setMessage({ type: 'ok', text: `「${v.title}」を${formatDay(v.date)}に追加しました。` });
    }
    return err;
  };

  const update = (id: string) => (v: Omit<TripEvent, 'id'>) => {
    const old = trip.events.find((e) => e.id === id);
    const err = onUpdate({ ...trip, events: trip.events.map((e) => (e.id === id ? { id, ...v } : e)) });
    if (!err) {
      closeForm();
      setSelected(v.date);
      const moved = old && old.date !== v.date;
      setMessage({
        type: 'ok',
        text: moved ? `「${v.title}」を${formatDay(v.date)}へ移動しました。` : `「${v.title}」を更新しました。`,
      });
    }
    return err;
  };

  const doDelete = () => {
    if (!deleting) return;
    const err = onUpdate({ ...trip, events: trip.events.filter((e) => e.id !== deleting.id) });
    setMessage(err ? { type: 'error', text: err } : { type: 'ok', text: `「${deleting.title}」を削除しました。` });
    setDeleting(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    const err = onUpdate({ ...trip, events: moveEvent(trip.events, selected, id, dir) });
    setMessage(err ? { type: 'error', text: err } : null);
  };

  const setChecklist = (items: ChecklistItem[]) => onUpdate({ ...trip, checklist: items });

  return (
    <main className="detail">
      <header className="detail-head">
        <div className="topbar">
          <button type="button" className="back-btn" onClick={onBack} aria-label="旅行一覧へ戻る">
            ‹
          </button>
          <div className="topbar-text">
            <h1 className="wrap">{trip.name}</h1>
            <p className="period">{formatRangeShort(trip.startDate, trip.endDate)}</p>
          </div>
        </div>

        <div className="view-tabs" role="tablist" aria-label="表示の切り替え">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              id={`view-tab-${v.id}`}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              aria-controls="view-panel"
              tabIndex={view === v.id ? 0 : -1}
              onClick={() => setView(v.id)}
              onKeyDown={(e) => onTabKeyDown(e, VIEWS.length, viewIndex, (n) => setView(VIEWS[n].id), (n) => `view-tab-${VIEWS[n].id}`)}
              data-index={i}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'plan' && (
          <div className="days" role="tablist" aria-label="日程">
            {days.map((d, i) => (
              <button
                key={d}
                id={`day-tab-${d}`}
                type="button"
                role="tab"
                className="day"
                ref={d === selected ? selectedRef : undefined}
                aria-selected={d === selected}
                aria-controls="day-panel"
                aria-current={d === today ? 'date' : undefined}
                tabIndex={d === selected ? 0 : -1}
                onClick={() => {
                  setSelected(d);
                  setMessage(null);
                }}
                onKeyDown={(e) =>
                  onTabKeyDown(e, days.length, dayIndex, (n) => { setSelected(days[n]); setMessage(null); }, (n) => `day-tab-${days[n]}`)
                }
              >
                <span className="day-n">
                  {i + 1}日目{d === today ? '・今日' : ''}
                </span>
                <span className="day-d">{formatDay(d)}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="detail-body" ref={bodyRef} id="view-panel" role="tabpanel" aria-labelledby={`view-tab-${view}`}>
        {view === 'list' && <Checklist items={trip.checklist} otherTrips={otherTrips} onChange={setChecklist} />}
        {view === 'cost' && <Costs trip={trip} />}

        {view === 'plan' && (
          <section id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${selected}`} className="stack">
            {selected === today && <TodayCard info={nextEvent(dayEvents, nowMin)} />}

            <h2 className="day-title" tabIndex={-1} data-focus-fallback>
              {formatFullDay(selected)}の予定
            </h2>
            {trip.destination && (
              <p className="weather" aria-live="polite">
                {weather === 'loading' && '天気を取得中…'}
                {weather && weather !== 'loading' && !weather.ok && weather.error}
                {weather && weather !== 'loading' && weather.ok && (dayWeather
                  ? `${weather.place}の天気: ${dayWeather.label}　最高${dayWeather.max}° / 最低${dayWeather.min}°${dayWeather.pop != null ? `　降水確率${dayWeather.pop}%` : ''}`
                  : `${weather.place}: この日の予報はまだ出せません(15日先まで)`)}
              </p>
            )}

            {message && (
              <p className={`banner ${message.type === 'ok' ? 'banner-ok' : 'banner-error'} wrap`} role={message.type === 'ok' ? 'status' : 'alert'}>
                {message.text}
              </p>
            )}

            {dayEvents.length === 0 ? (
              <div className="empty">
                <p>この日の予定はまだありません。</p>
                <button type="button" className="btn btn-primary btn-big" onClick={() => setEditing({ kind: 'new' })}>
                  この日に予定を追加
                </button>
              </div>
            ) : (
              <ul className="events">
                {dayEvents.map((e, i) => (
                  <li key={e.id}>
                    {i === untimedStart && <p className="group-label">時間未定</p>}
                    <article className={e.time && e.endTime && e.endTime < e.time ? 'event event-stack' : 'event'}>
                      {e.time && (
                        <div className="event-time">
                          <span className="time">{e.time}</span>
                          {e.endTime && (
                            <span className="end-time">
                              〜{e.endTime < e.time ? '翌' : ''}
                              {e.endTime}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="event-main">
                        {e.kind && <span className="chip">{e.kind}</span>}
                        <h3 className="event-title wrap">{e.title}</h3>
                        {e.place && <p className="place wrap">{e.place}</p>}
                        {e.place && (
                          <a className="text-link" href={mapsUrl(e.place)} target="_blank" rel="noopener noreferrer">
                            地図で開く
                          </a>
                        )}
                      </div>
                      <div className="event-extra">
                        {e.bookingNo && (
                          <p className="booking wrap">
                            予約番号: <strong>{e.bookingNo}</strong>
                          </p>
                        )}
                        {e.bookingUrl && (
                          <a className="text-link" href={e.bookingUrl} target="_blank" rel="noopener noreferrer">
                            予約ページ
                          </a>
                        )}
                        {e.cost != null && <p className="cost">費用 {formatYen(e.cost)}</p>}
                        {e.memo && <p className="memo wrap">{e.memo}</p>}
                        <div className="event-actions">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setEditing({ kind: 'edit', id: e.id });
                              setMessage(null);
                            }}
                            aria-label={`「${e.title}」を編集`}
                          >
                            編集
                          </button>
                          <button type="button" className="btn btn-danger-outline" onClick={() => setDeleting(e)} aria-label={`「${e.title}」を削除`}>
                            削除
                          </button>
                          {canMove(trip.events, selected, e.id, -1) && (
                            <button type="button" className="btn btn-icon" onClick={() => move(e.id, -1)} aria-label={`「${e.title}」を1つ上へ移動`}>
                              ↑
                            </button>
                          )}
                          {canMove(trip.events, selected, e.id, 1) && (
                            <button type="button" className="btn btn-icon" onClick={() => move(e.id, 1)} aria-label={`「${e.title}」を1つ下へ移動`}>
                              ↓
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {view === 'plan' && (
        <button
          type="button"
          className="fab"
          onClick={() => {
            setEditing({ kind: 'new' });
            setMessage(null);
          }}
        >
          <span aria-hidden="true">＋</span> 予定を追加
        </button>
      )}

      {editing.kind === 'new' && (
        <Sheet label="予定を追加" onClose={closeForm}>
          <EventForm days={days} defaultDate={selected} placeHistory={placeHistory} onSubmit={add} onCancel={closeForm} />
        </Sheet>
      )}
      {editing.kind === 'edit' && editingEvent && (
        <Sheet label="予定を編集" onClose={closeForm}>
          <EventForm key={editingEvent.id} days={days} event={editingEvent} defaultDate={selected} placeHistory={placeHistory} onSubmit={update(editingEvent.id)} onCancel={closeForm} />
        </Sheet>
      )}

      {deleting && (
        <ConfirmDialog
          title={`「${deleting.title}」を削除しますか?`}
          message={`${formatDay(deleting.date)}の予定を削除します。元に戻せません。`}
          confirmLabel="削除する"
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
