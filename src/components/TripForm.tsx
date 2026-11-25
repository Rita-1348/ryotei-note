import { useState, type FormEvent } from 'react';
import { validateTripInput, type Trip } from '../lib/trips';

interface Props {
  trip?: Trip;
  /** 保存処理。失敗時はエラー文を返す */
  onSubmit: (name: string, start: string, end: string) => string | null;
  onCancel: () => void;
}

export default function TripForm({ trip, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.startDate ?? '');
  const [end, setEnd] = useState(trip?.endDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateTripInput(name, start, end, trip?.events) ?? onSubmit(name.trim(), start, end);
    setError(err);
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="trip-form-title">
      <h2 id="trip-form-title">{trip ? '旅行を編集' : '旅行を作成'}</h2>
      <label>
        旅行名（必須）
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="例: 京都2泊3日" required />
      </label>
      <label>
        開始日（必須）
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      </label>
      <label>
        終了日（必須）
        <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
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
