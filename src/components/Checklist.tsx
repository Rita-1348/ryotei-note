import { useState, type FormEvent } from 'react';
import Field from './Field';
import { makeId, type ChecklistItem, type Trip } from '../lib/trips';

interface Props {
  items: ChecklistItem[];
  otherTrips: Trip[];
  /** 保存。失敗時はエラー文を返す */
  onChange: (items: ChecklistItem[]) => string | null;
}

export default function Checklist({ items, otherTrips, onChange }: Props) {
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const done = items.filter((i) => i.done).length;
  const sources = otherTrips.filter((t) => t.checklist.length > 0);

  const apply = (next: ChecklistItem[], okText?: string) => {
    const err = onChange(next);
    setMessage(err ? { type: 'error', text: err } : okText ? { type: 'ok', text: okText } : null);
    return !err;
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return setFieldError('持ち物の名前を入力してください。');
    if (items.some((i) => i.text === t)) return setFieldError(`「${t}」はすでにあります。`);
    setFieldError(null);
    if (apply([...items, { id: makeId(), text: t, done: false }])) setText('');
  };

  const importFrom = () => {
    const src = sources.find((t) => t.id === source);
    if (!src) return;
    const have = new Set(items.map((i) => i.text));
    const add = src.checklist.filter((c) => !have.has(c.text)).map((c) => ({ id: makeId(), text: c.text, done: false }));
    if (add.length === 0) return setMessage({ type: 'ok', text: '追加できる持ち物はありませんでした(すべて登録済みです)。' });
    apply([...items, ...add], `「${src.name}」から${add.length}件を取り込みました。`);
  };

  return (
    <section aria-label="持ち物" className="stack">
      <p className="progress" aria-live="polite">
        {done}/{items.length} 準備済み
      </p>

      {message && (
        <p className={`banner ${message.type === 'ok' ? 'banner-ok' : 'banner-error'} wrap`} role={message.type === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}

      <form className="add-row" onSubmit={add} noValidate>
        <Field id="checklist-new" label="持ち物を追加" error={fieldError}>
          {(p) => <input {...p} type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="例: 充電器" />}
        </Field>
        <button type="submit" className="btn btn-primary">
          追加
        </button>
      </form>

      {items.length === 0 ? (
        <p className="empty-note">まだ持ち物がありません。</p>
      ) : (
        <ul className="checks">
          {items.map((i) => (
            <li key={i.id}>
              <label className="check">
                <input type="checkbox" checked={i.done} onChange={() => apply(items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
                <span className={i.done ? 'wrap done' : 'wrap'}>
                  {i.done && <span aria-hidden="true">✓ </span>}
                  {i.text}
                </span>
              </label>
              <button type="button" className="btn btn-sm btn-danger-outline" aria-label={`「${i.text}」を削除`} onClick={() => apply(items.filter((x) => x.id !== i.id))}>
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {done > 0 && (
        <button type="button" className="btn" onClick={() => apply(items.map((x) => ({ ...x, done: false })))}>
          チェックをすべて外す
        </button>
      )}

      {sources.length > 0 && (
        <div className="card stack">
          <h3 className="sec-title">他の旅行の持ち物を取り込む</h3>
          <Field id="checklist-source" label="取り込み元">
            {(p) => (
              <select {...p} value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">選んでください</option>
                {sources.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{t.checklist.length}件）
                  </option>
                ))}
              </select>
            )}
          </Field>
          <button type="button" className="btn" disabled={!source} onClick={importFrom}>
            取り込む(チェックは外れた状態)
          </button>
        </div>
      )}
    </section>
  );
}
