import { useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import type { TripEvent } from '../lib/trips';

interface Props {
  days: string[];
  event?: TripEvent;
  defaultDate: string;
  onSubmit: (v: Omit<TripEvent, 'id'>) => string | null;
  onCancel: () => void;
}

export default function EventForm({ days, event, defaultDate, onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(event?.date ?? defaultDate);
  const [title, setTitle] = useState(event?.title ?? '');
  const [time, setTime] = useState(event?.time ?? '');
  const [place, setPlace] = useState(event?.place ?? '');
  const [memo, setMemo] = useState(event?.memo ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('予定名を入力してください。');
    if (!days.includes(date)) return setError('日付は旅行期間内から選んでください。');
    setError(
      onSubmit({
        date,
        title: title.trim(),
        ...(time ? { time } : {}),
        ...(place.trim() ? { place: place.trim() } : {}),
        ...(memo.trim() ? { memo } : {}),
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
        <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={300} placeholder="例: 京都駅 / 京都府京都市下京区..." />
      </label>
      <label>
        自由メモ（任意）
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} maxLength={5000} />
      </label>
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
