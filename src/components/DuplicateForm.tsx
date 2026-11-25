import { useState, type FormEvent } from 'react';
import { formatRange } from '../lib/dates';
import type { Trip } from '../lib/trips';

interface Props {
  trip: Trip;
  onSubmit: (name: string, start: string) => string | null;
  onCancel: () => void;
}

export default function DuplicateForm({ trip, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(`${trip.name}（コピー）`);
  const [start, setStart] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('旅行名を入力してください。');
    if (!start) return setError('新しい開始日を入力してください。');
    setError(onSubmit(name, start));
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="dup-title">
      <h2 id="dup-title" className="wrap">「{trip.name}」を複製</h2>
      <p className="hint">元の期間: {formatRange(trip.startDate, trip.endDate)}。予定・持ち物・費用をコピーし、日付は新しい開始日に合わせてずらします。持ち物のチェックは外れます。</p>
      <label>
        新しい旅行名
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </label>
      <label>
        新しい開始日（必須）
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
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
          複製する
        </button>
      </div>
    </form>
  );
}
