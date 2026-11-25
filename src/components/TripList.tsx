import { useState } from 'react';
import TripForm from './TripForm';
import ConfirmDialog from './ConfirmDialog';
import Sheet from './Sheet';
import InstallHint from './InstallHint';
import { ExportSheet, ImportSheet } from './ExchangeSheets';
import { formatRange } from '../lib/dates';
import { MAX_FILE_BYTES, parseImport } from '../lib/exchange';
import { makeId, type Trip } from '../lib/trips';
import { getLastBackup } from '../lib/storage';

interface Props {
  trips: Trip[];
  onCommit: (next: Trip[]) => string | null;
  onOpen: (id: string) => void;
  missingTrip: boolean;
}

function backupLabel(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return days <= 0 ? '今日' : `${days}日前`;
}

type Mode ={ kind: 'none' } | { kind: 'create' } | { kind: 'edit'; id: string };

export default function TripList({ trips, onCommit, onOpen, missingTrip }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'none' });
  const [deleting, setDeleting] = useState<Trip | null>(null);
  const [exporting, setExporting] = useState<Trip | null>(null);
  const [importing, setImporting] = useState(false);
  const [backupAt, setBackupAt] = useState<Date | null>(getLastBackup);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const ok = (text: string) => setMessage({ type: 'ok', text });
  const fail = (text: string) => setMessage({ type: 'error', text });
  const closeForm = () => setMode({ kind: 'none' });

  const create = (name: string, start: string, end: string) => {
    const err = onCommit([...trips, { id: makeId(), name, startDate: start, endDate: end, events: [] }]);
    if (!err) {
      closeForm();
      ok(`「${name}」を作成しました。`);
    }
    return err;
  };

  const edit = (id: string) => (name: string, start: string, end: string) => {
    const err = onCommit(trips.map((t) => (t.id === id ? { ...t, name, startDate: start, endDate: end } : t)));
    if (!err) {
      closeForm();
      ok(`「${name}」を更新しました。`);
    }
    return err;
  };

  const doDelete = () => {
    if (!deleting) return;
    const err = onCommit(trips.filter((t) => t.id !== deleting.id));
    if (err) fail(err);
    else ok(`「${deleting.name}」を削除しました。`);
    setDeleting(null);
  };

  /** 読み込み。失敗時はエラー文を返し、既存データには触れない */
  const doImport = (text: string): string | null => {
    if (text.length > MAX_FILE_BYTES) return 'データが大きすぎます(2MBまで)。';
    const res = parseImport(text, trips);
    if ('error' in res) return `読み込めませんでした。${res.error}`;
    const err = onCommit([...trips, res.trip]);
    if (err) return err;
    setImporting(false);
    ok(`「${res.trip.name}」を新しい旅行として読み込みました。`);
    return null;
  };

  const editing = mode.kind === 'edit' ? trips.find((t) => t.id === mode.id) : undefined;

  return (
    <main>
      <h1>旅程ノート</h1>
      <p className="hint">このブラウザに保存されます。別の端末へは書き出し・読み込みで移せます</p>
      {trips.length > 0 && (
        <p className={backupAt ? 'hint' : 'hint hint-warn'}>
          {backupAt
            ? `最後のバックアップ: ${backupLabel(backupAt)}`
            : 'まだバックアップがありません。スマホのデータが消えたときに備え、各旅行の「書き出す」でコピーを残してください。'}
        </p>
      )}
      {missingTrip && (
        <p className="banner banner-error" role="alert">
          開こうとした旅行が見つかりませんでした(このブラウザには保存されていません)。
        </p>
      )}
      {message && (
        <p className={`banner ${message.type === 'ok' ? 'banner-ok' : 'banner-error'} wrap`} role={message.type === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}

      {mode.kind === 'create' && (
        <Sheet label="旅行を作成" onClose={closeForm}>
          <TripForm onSubmit={create} onCancel={closeForm} />
        </Sheet>
      )}
      {mode.kind === 'edit' && editing && (
        <Sheet label="旅行を編集" onClose={closeForm}>
          <TripForm key={editing.id} trip={editing} onSubmit={edit(editing.id)} onCancel={closeForm} />
        </Sheet>
      )}

      {trips.length === 0 ? (
        <section className="empty">
          <p>まだ旅行がありません。</p>
          <button type="button" className="btn btn-primary btn-big" onClick={() => setMode({ kind: 'create' })}>
            最初の旅行を作成
          </button>
        </section>
      ) : (
        <ul className="trip-list">
          {trips.map((t) => (
            <li key={t.id} className="card">
              <h2 className="wrap">{t.name}</h2>
              <p className="sub">{formatRange(t.startDate, t.endDate)}</p>
              <p className="sub">予定 {t.events.length}件</p>
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => onOpen(t.id)}>
                  開く
                </button>
                <button type="button" className="btn" onClick={() => setMode({ kind: 'edit', id: t.id })}>
                  編集
                </button>
                <button type="button" className="btn" onClick={() => setExporting(t)}>
                  書き出す
                </button>
                <button type="button" className="btn btn-danger-outline" onClick={() => setDeleting(t)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {trips.length > 0 && (
        <button type="button" className="fab" onClick={() => setMode({ kind: 'create' })}>
          <span aria-hidden="true">＋</span> 旅行を作成
        </button>
      )}
      <div className="row toolbar">
        <button type="button" className="btn" onClick={() => setImporting(true)}>
          旅行ファイルを読み込む
        </button>
        <InstallHint />
      </div>

      {exporting && (
        <ExportSheet
          trip={exporting}
          onClose={() => {
            setExporting(null);
            setBackupAt(getLastBackup());
          }}
        />
      )}
      {importing && <ImportSheet onImport={doImport} onClose={() => setImporting(false)} />}

      {deleting && (
        <ConfirmDialog
          title="旅行を削除しますか?"
          message={`「${deleting.name}」と、その予定${deleting.events.length}件を削除します。元に戻せません。`}
          confirmLabel="削除する"
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
