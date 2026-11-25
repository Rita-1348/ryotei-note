import { useState } from 'react';
import TripForm from './TripForm';
import ConfirmDialog from './ConfirmDialog';
import Sheet from './Sheet';
import DuplicateForm from './DuplicateForm';
import InstallHint from './InstallHint';
import { ExportSheet, ImportSheet } from './ExchangeSheets';
import { daysBetween, formatRange, todayString } from '../lib/dates';
import { MAX_FILE_BYTES, parseImport } from '../lib/exchange';
import { duplicateTrip, makeId, validateTripInput, type Trip } from '../lib/trips';
import { getBackupMap, markBackup, needsBackup } from '../lib/storage';

interface Props {
  trips: Trip[];
  onCommit: (next: Trip[]) => string | null;
  onOpen: (id: string) => void;
  missingTrip: boolean;
}

type Mode = { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'duplicate'; id: string };

/** 出発までの日数・旅行中・終了の表示 */
export function tripStatus(t: Trip, today: string): string {
  if (today < t.startDate) return `出発まであと${daysBetween(today, t.startDate)}日`;
  if (today <= t.endDate) return `旅行中(${daysBetween(t.startDate, today) + 1}日目)`;
  return '終了';
}

export default function TripList({ trips, onCommit, onOpen, missingTrip }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'none' });
  const [deleting, setDeleting] = useState<Trip | null>(null);
  const [exporting, setExporting] = useState<Trip | null>(null);
  const [importing, setImporting] = useState(false);
  const [backups, setBackups] = useState(getBackupMap);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const today = todayString();

  const ok = (text: string) => setMessage({ type: 'ok', text });
  const fail = (text: string) => setMessage({ type: 'error', text });
  const closeForm = () => setMode({ kind: 'none' });

  const create = (v: { name: string; start: string; end: string; destination: string }) => {
    const err = onCommit([
      ...trips,
      { id: makeId(), name: v.name, startDate: v.start, endDate: v.end, events: [], checklist: [], ...(v.destination ? { destination: v.destination } : {}) },
    ]);
    if (!err) {
      closeForm();
      ok(`「${v.name}」を作成しました。`);
    }
    return err;
  };

  const edit = (id: string) => (v: { name: string; start: string; end: string; destination: string }) => {
    const err = onCommit(
      trips.map((t) =>
        t.id === id ? { ...t, name: v.name, startDate: v.start, endDate: v.end, destination: v.destination || undefined } : t,
      ),
    );
    if (!err) {
      closeForm();
      ok(`「${v.name}」を更新しました。`);
    }
    return err;
  };

  const duplicate = (src: Trip) => (name: string, start: string) => {
    const copy = duplicateTrip(src, name, start);
    const bad = validateTripInput(copy.name, copy.startDate, copy.endDate, copy.events);
    if (bad) return bad;
    const err = onCommit([...trips, copy]);
    if (!err) {
      closeForm();
      ok(`「${copy.name}」を作成しました(${formatRange(copy.startDate, copy.endDate)})。`);
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
    markBackup(res.trip.id); // 読み込み元のデータが手元にあるので、バックアップ済みとして扱う
    setBackups(getBackupMap());
    setImporting(false);
    ok(`「${res.trip.name}」を新しい旅行として読み込みました。`);
    return null;
  };

  const target = mode.kind === 'edit' || mode.kind === 'duplicate' ? trips.find((t) => t.id === mode.id) : undefined;
  const needing = trips.filter((t) => needsBackup(t, backups));

  return (
    <main>
      <h1 tabIndex={-1} data-focus-fallback>
        旅程ノート
      </h1>
      <p className="hint">このブラウザに保存されます。別の端末へは書き出し・読み込みで移せます</p>
      {trips.length > 0 && (
        <p className={needing.length === 0 ? 'hint' : 'hint hint-warn'}>
          {needing.length === 0
            ? 'すべての旅行をバックアップ済みです。'
            : `${needing.length}件の旅行が未バックアップ、または書き出し後に変更されています。「書き出す」でコピーを残してください。`}
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
      {mode.kind === 'edit' && target && (
        <Sheet label="旅行を編集" onClose={closeForm}>
          <TripForm key={target.id} trip={target} onSubmit={edit(target.id)} onCancel={closeForm} />
        </Sheet>
      )}
      {mode.kind === 'duplicate' && target && (
        <Sheet label="旅行を複製" onClose={closeForm}>
          <DuplicateForm key={target.id} trip={target} onSubmit={duplicate(target)} onCancel={closeForm} />
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
          {trips.map((t) => {
            const status = tripStatus(t, today);
            const active = status.startsWith('旅行中');
            return (
              <li key={t.id} className="card">
                <div className="status-row">
                  <p className={active ? 'status status-active' : 'status'}>{status}</p>
                  {needsBackup(t, backups) && (
                    <span className="badge-warn" role="img" aria-label="未バックアップ。書き出してコピーを残してください">
                      未バックアップ
                    </span>
                  )}
                </div>
                <h2 className="trip-name wrap">{t.name}</h2>
                <p className="period">{formatRange(t.startDate, t.endDate)}</p>
                <p className="period">
                  予定 {t.events.length}件 ・ 持ち物 {t.checklist.filter((c) => c.done).length}/{t.checklist.length}
                </p>
                <button type="button" className="btn btn-primary full" onClick={() => onOpen(t.id)}>
                  {active ? '今日の予定を見る' : '開く'}
                </button>
                <div className="card-actions">
                  <button type="button" className="btn" onClick={() => setMode({ kind: 'edit', id: t.id })}>
                    編集
                  </button>
                  <button type="button" className="btn" onClick={() => setExporting(t)}>
                    書き出す
                  </button>
                  <button type="button" className="btn" onClick={() => setMode({ kind: 'duplicate', id: t.id })}>
                    複製
                  </button>
                  <button type="button" className="btn btn-danger-outline" onClick={() => setDeleting(t)}>
                    削除
                  </button>
                </div>
              </li>
            );
          })}
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
            setBackups(getBackupMap());
          }}
        />
      )}
      {importing && <ImportSheet onImport={doImport} onClose={() => setImporting(false)} />}

      {deleting && (
        <ConfirmDialog
          title={`「${deleting.name}」を削除しますか?`}
          message={`この旅行と、その予定${deleting.events.length}件を削除します。元に戻せません。`}
          confirmLabel="削除する"
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
