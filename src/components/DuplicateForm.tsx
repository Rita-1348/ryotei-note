import { useState, type FormEvent } from 'react';
import Field, { focusField } from './Field';
import { formatRange } from '../lib/dates';
import type { Trip } from '../lib/trips';

interface Props {
  trip: Trip;
  onSubmit: (name: string, start: string) => string | null;
  onCancel: () => void;
}

type Errs = Partial<Record<'name' | 'start' | 'form', string>>;

export default function DuplicateForm({ trip, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(`${trip.name}（コピー）`);
  const [start, setStart] = useState('');
  const [errs, setErrs] = useState<Errs>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrs({ name: '旅行名を入力してください。' });
      return focusField('dup-name');
    }
    if (!start) {
      setErrs({ start: '新しい開始日を入力してください。' });
      return focusField('dup-start');
    }
    const err = onSubmit(name, start);
    setErrs(err ? { form: err } : {});
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-labelledby="dup-title">
      <h2 id="dup-title" className="wrap">
        「{trip.name}」を複製
      </h2>
      <div className="form-body">
        <p className="hint">
          元の期間: {formatRange(trip.startDate, trip.endDate)}。予定・持ち物・費用をコピーし、日付は新しい開始日に合わせてずらします。持ち物のチェックは外れます。
        </p>
        <Field id="dup-name" label="新しい旅行名" error={errs.name}>
          {(p) => <input {...p} type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />}
        </Field>
        <Field id="dup-start" label="新しい開始日（必須）" error={errs.start}>
          {(p) => <input {...p} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
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
          複製する
        </button>
      </div>
    </form>
  );
}
