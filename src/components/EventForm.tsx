import { useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import { KINDS, parseCost, validateEventFields, type Kind, type TripEvent } from '../lib/trips';

interface Props {
  days: string[];
  event?: TripEvent;
  defaultDate: string;
  /** 過去に入力した場所(入力補完用) */
  placeHistory: string[];
  onSubmit: (v: Omit<TripEvent, 'id'>) => string | null;
  onCancel: () => void;
}

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
  const [error, setError] = useState<string | null>(null);
  const hasDetail = !!(event?.endTime || event?.kind || event?.bookingNo || event?.bookingUrl || event?.cost != null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateEventFields({ title, time, endTime, bookingUrl, cost });
    if (err) return setError(err);
    if (!days.includes(date)) return setError('日付は旅行期間内から選んでください。');
    const c = parseCost(cost);
    setError(
      onSubmit({
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
      }),
    );
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="event-form-title">
      <h2 id="event-form-title">{event ? '予定を編集' : '予定を追加'}</h2>
      <label>
        日付
        <select value={date} onChange={(e) => setDate(e.target.value)}>
          {days.map((d, i) => (
            <option key={d} value={d}>
              {i + 1}日目 {formatDay(d)}
            </option>
          ))}
        </select>
      </label>
      <label>
        予定名（必須）
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="例: 昼食" autoFocus />
      </label>
      <label>
        開始時刻（任意）
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <label>
        場所名または住所（任意）
        <input
          type="text"
          list="place-history"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={300}
          placeholder="例: 京都駅 / 京都府京都市下京区..."
        />
        <datalist id="place-history">
          {placeHistory.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label>
        自由メモ（任意）
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} maxLength={5000} />
      </label>

      <details className="more" open={hasDetail}>
        <summary>種類・終了時刻・予約・費用（任意）</summary>
        <label>
          種類
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind | '')}>
            <option value="">指定しない</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          終了時刻（開始より早いと翌日に終わる予定になります）
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!time} />
        </label>
        <label>
          予約番号など
          <input type="text" value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} maxLength={100} autoComplete="off" />
        </label>
        <label>
          予約ページのURL
          <input type="url" inputMode="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} maxLength={500} placeholder="https://" />
        </label>
        <label>
          費用（円）
          <input type="text" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} maxLength={12} placeholder="例: 1200" />
        </label>
      </details>

      {error && (
        <p className="error wrap" role="alert">
          {error}
        </p>
      )}
      <div className="row">
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
