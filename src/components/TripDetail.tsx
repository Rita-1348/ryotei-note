import { useEffect, useRef, useState } from 'react';
import EventForm from './EventForm';
import ConfirmDialog from './ConfirmDialog';
import Sheet from './Sheet';
import { formatDay, formatFullDay, formatRange, listDays, todayString } from '../lib/dates';
import { eventsOnDay, makeId, mapsUrl, sortEvents, type Trip, type TripEvent } from '../lib/trips';

interface Props {
  trip: Trip;
  onBack: () => void;
  onUpdate: (t: Trip) => string | null;
}

type Editing = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; id: string };

export default function TripDetail({ trip, onBack, onUpdate }: Props) {
  const days = listDays(trip.startDate, trip.endDate);
  const today = todayString();
  const [selected, setSelected] = useState(() => (days.includes(today) ? today : days[0]));
  const [editing, setEditing] = useState<Editing>({ kind: 'none' });
  const [deleting, setDeleting] = useState<TripEvent | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selected]);

  const dayEvents = sortEvents(eventsOnDay(trip, selected));
  const untimedStart = dayEvents.findIndex((e) => !e.time);
  const editingEvent = editing.kind === 'edit' ? trip.events.find((e) => e.id === editing.id) : undefined;
  const closeForm = () => setEditing({ kind: 'none' });

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

  return (
    <main className="detail">
      <div className="sticky-head">
        <div className="topbar">
          <button type="button" className="back-btn" onClick={onBack} aria-label="旅行一覧へ戻る">
            ←
          </button>
          <div className="topbar-text">
            <h1 className="wrap">{trip.name}</h1>
            <p className="sub">{formatRange(trip.startDate, trip.endDate)}</p>
          </div>
        </div>
        <nav aria-label="日程">
          <ul className="days">
            {days.map((d, i) => (
              <li key={d}>
                <button
                  type="button"
                  className="day"
                  ref={d === selected ? selectedRef : undefined}
                  aria-pressed={d === selected}
                  aria-current={d === selected ? 'date' : undefined}
                  onClick={() => {
                    setSelected(d);
                    setMessage(null);
                  }}
                >
                  <span className="day-n">
                    {i + 1}日目{d === today ? '・今日' : ''}
                  </span>
                  <span className="day-d">{formatDay(d)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <h2 className="day-title">{formatFullDay(selected)}の予定</h2>

      {message && (
        <p className={`banner ${message.type === 'ok' ? 'banner-ok' : 'banner-error'} wrap`} role={message.type === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}

      {dayEvents.length === 0 ? (
        <section className="empty">
          <p>この日の予定はまだありません。</p>
          <button type="button" className="btn btn-primary btn-big" onClick={() => setEditing({ kind: 'new' })}>
            この日に予定を追加
          </button>
        </section>
      ) : (
        <ul className="events">
          {dayEvents.map((e, i) => (
            <li key={e.id}>
              {i === untimedStart && <p className="group-label">時間未定</p>}
              <article className="event">
                <p className="time">{e.time ?? ''}</p>
                <div className="body">
                  <h3 className="wrap">{e.title}</h3>
                  {e.place && (
                    <p className="place wrap">
                      <span aria-hidden="true">📍 </span>
                      {e.place}
                    </p>
                  )}
                  {e.place && (
                    <a className="map-btn" href={mapsUrl(e.place)} target="_blank" rel="noopener noreferrer">
                      地図で開く
                    </a>
                  )}
                  {e.memo && <p className="memo wrap">{e.memo}</p>}
                  <div className="row small">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setEditing({ kind: 'edit', id: e.id });
                        setMessage(null);
                      }}
                      aria-label={`「${e.title}」を編集`}
                    >
                      編集
                    </button>
                    <button type="button" className="btn btn-sm btn-danger-outline" onClick={() => setDeleting(e)} aria-label={`「${e.title}」を削除`}>
                      削除
                    </button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

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

      {editing.kind === 'new' && (
        <Sheet label="予定を追加" onClose={closeForm}>
          <EventForm days={days} defaultDate={selected} onSubmit={add} onCancel={closeForm} />
        </Sheet>
      )}
      {editing.kind === 'edit' && editingEvent && (
        <Sheet label="予定を編集" onClose={closeForm}>
          <EventForm key={editingEvent.id} days={days} event={editingEvent} defaultDate={selected} onSubmit={update(editingEvent.id)} onCancel={closeForm} />
        </Sheet>
      )}

      {deleting && (
        <ConfirmDialog
          title="予定を削除しますか?"
          message={`「${deleting.title}」(${formatDay(deleting.date)})を削除します。元に戻せません。`}
          confirmLabel="削除する"
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
