import { useState, type FormEvent } from 'react';
import Field, { focusField } from './Field';
import { tripErrorField, validateTripInput, type Trip } from '../lib/trips';

interface Props {
  trip?: Trip;
  /** 保存処理。失敗時はエラー文を返す */
  onSubmit: (v: { name: string; start: string; end: string; destination: string }) => string | null;
  onCancel: () => void;
}

type Errs = Partial<Record<'name' | 'start' | 'end', string>> & { form?: string };

export default function TripForm({ trip, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.startDate ?? '');
  const [end, setEnd] = useState(trip?.endDate ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [errs, setErrs] = useState<Errs>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = validateTripInput(name, start, end, trip?.events);
    if (bad) {
      const f = tripErrorField(bad);
      setErrs({ [f]: bad });
      return focusField(`trip-${f}`);
    }
    const err = onSubmit({ name: name.trim(), start, end, destination: destination.trim() });
    setErrs(err ? { form: err } : {});
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="trip-form-title">
      <h2 id="trip-form-title">{trip ? '旅行を編集' : '旅行を作成'}</h2>
      <div className="form-body">
        <Field id="trip-name" label="旅行名（必須）" error={errs.name}>
          {(p) => <input {...p} type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="例: 京都2泊3日" required />}
        </Field>
        <Field id="trip-start" label="開始日（必須）" error={errs.start}>
          {(p) => <input {...p} type="date" value={start} onChange={(e) => setStart(e.target.value)} required />}
        </Field>
        <Field id="trip-end" label="終了日（必須）" error={errs.end}>
          {(p) => <input {...p} type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />}
        </Field>
        <Field
          id="trip-destination"
          label="目的地（任意・天気表示用）"
          hint="入れると旅行詳細に天気を表示します。入力した地名は天気サービス(Open-Meteo)へ送信されます。空欄なら何も送信しません。"
        >
          {(p) => <input {...p} type="text" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={60} placeholder="例: 京都市 / 箱根町" />}
        </Field>
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
