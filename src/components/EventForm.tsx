import { useState, type FormEvent } from 'react';
import Field, { focusField } from './Field';
import { formatDay } from '../lib/dates';
import { KINDS, parseCost, validateEventFields, type EventField, type Kind, type TripEvent } from '../lib/trips';

interface Props {
  days: string[];
  event?: TripEvent;
  defaultDate: string;
  /** 過去に入力した場所(入力補完用) */
  placeHistory: string[];
  onSubmit: (v: Omit<TripEvent, 'id'>) => string | null;
  onCancel: () => void;
}

type Errs = Partial<Record<EventField | 'date', string>> & { form?: string };

export default function EventForm({ days, event, defaultDate, placeHistory, onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [title, setTitle] = useState(event?.title ?? '');
  const [time, setTime] = useState(event?.time ?? '');
  const [place, setPlace] = useState(event?.place ?? '');
  const [memo, setMemo] = useState(event?.memo ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [kind, setKind] = useState<Kind | ''>(event?.kind ?? '');
  const [bookingNo, setBookingNo] = useState(event?.bookingNo ?? '');
  const [bookingUrl, setBookingUrl] = useState(event?.bookingUrl ?? '');
  const [cost, setCost] = useState(event?.cost != null ? String(event.cost) : '');
  const [errs, setErrs] = useState<Errs>({});
  const [moreOpen, setMoreOpen] = useState(!!(event?.endTime || event?.kind || event?.bookingNo || event?.bookingUrl || event?.cost != null));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = validateEventFields({ title, time, endTime, bookingUrl, cost });
    if (bad) {
      setErrs({ [bad.field]: bad.message });
      if (bad.field !== 'title') setMoreOpen(true);
      return focusField(`event-${bad.field}`);
    }
    if (!days.includes(date)) {
      setErrs({ date: '日付は旅行期間内から選んでください。' });
      return focusField('event-date');
    }
    const c = parseCost(cost);
    const err = onSubmit({
      date,
      title: title.trim(),
      ...(time ? { time } : {}),
      ...(endTime && time ? { endTime } : {}),
      ...(kind ? { kind } : {}),
      ...(place.trim() ? { place: place.trim() } : {}),
      ...(memo.trim() ? { memo } : {}),
      ...(bookingNo.trim() ? { bookingNo: bookingNo.trim() } : {}),
      ...(bookingUrl.trim() ? { bookingUrl: bookingUrl.trim() } : {}),
      ...(c != null ? { cost: c } : {}),
    });
    setErrs(err ? { form: err } : {});
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="event-form-title">
      <h2 id="event-form-title">{event ? '予定を編集' : '予定を追加'}</h2>
      <div className="form-body">
        <Field id="event-date" label="日付" error={errs.date}>
          {(p) => (
            <select {...p} value={date} onChange={(e) => setDate(e.target.value)}>
              {days.map((d, i) => (
                <option key={d} value={d}>
                  {i + 1}日目 {formatDay(d)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="event-title" label="予定名（必須）" error={errs.title}>
          {(p) => <input {...p} type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="例: 昼食" />}
        </Field>
        <Field id="event-time" label="開始時刻（任意）">
          {(p) => <input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
        </Field>
        <Field id="event-place" label="場所名または住所（任意）">
          {(p) => (
            <>
              <input {...p} type="text" list="place-history" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={300} placeholder="例: 京都駅 / 京都府京都市下京区..." />
              <datalist id="place-history">
                {placeHistory.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field id="event-memo" label="自由メモ（任意）">
          {(p) => <textarea {...p} value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} maxLength={5000} />}
        </Field>

        <details className="more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
          <summary>種類・終了時刻・予約・費用（任意）</summary>
          <div className="more-body">
            <Field id="event-kind" label="種類">
              {(p) => (
                <select {...p} value={kind} onChange={(e) => setKind(e.target.value as Kind | '')}>
                  <option value="">指定しない</option>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field id="event-endTime" label="終了時刻" hint="開始より早い時刻にすると、翌日に終わる予定になります。開始時刻が必要です。" error={errs.endTime}>
              {(p) => <input {...p} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!time} />}
            </Field>
            <Field id="event-bookingNo" label="予約番号など">
              {(p) => <input {...p} type="text" value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} maxLength={100} autoComplete="off" />}
            </Field>
            <Field id="event-bookingUrl" label="予約ページのURL" error={errs.bookingUrl}>
              {(p) => <input {...p} type="url" inputMode="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} maxLength={500} placeholder="https://" />}
            </Field>
            <Field id="event-cost" label="費用（円）" error={errs.cost}>
              {(p) => <input {...p} type="text" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} maxLength={12} placeholder="例: 1200" />}
            </Field>
          </div>
        </details>

        {errs.form && (
          <p className="field-error wrap" role="alert">
            {errs.form}
          </p>
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary">
          保存
        </button>
      </div>
    </form>
  );
}
