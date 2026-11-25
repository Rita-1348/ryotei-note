import { useRef, useState, type ChangeEvent } from 'react';
import Sheet from './Sheet';
import { exportFileName, exportTrip, MAX_FILE_BYTES } from '../lib/exchange';
import { markBackup } from '../lib/storage';
import type { Trip } from '../lib/trips';

/** Artifact ではページからのダウンロードができないため、そのビルドでは無効にする */
export const CAN_DOWNLOAD = import.meta.env.MODE !== 'artifact';

export function ExportSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const text = exportTrip(trip);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      markBackup(trip.id);
      setStatus('コピーしました。別の端末で「読み込む」に貼り付けてください。');
    } catch {
      areaRef.current?.focus();
      areaRef.current?.select();
      setStatus('自動でコピーできませんでした。選択された文字を長押ししてコピーしてください。');
    }
  };

  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(trip);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      markBackup(trip.id);
      setStatus('ファイルに書き出しました。');
    } catch {
      setStatus('ファイルの書き出しに失敗しました。コピーを使ってください。');
    }
  };

  return (
    <Sheet label="旅行を書き出す" onClose={onClose}>
      <div className="form">
        <h2 className="wrap">「{trip.name}」を書き出す</h2>
        <p className="hint">この文字を別の端末の「旅行を読み込む」に貼り付けると、新しい旅行として追加されます。</p>
        <label>
          書き出しデータ
          <textarea id="export-text" ref={areaRef} className="code" readOnly value={text} onFocus={(e) => e.currentTarget.select()} />
        </label>
        {status && (
          <p className="banner banner-ok wrap" role="status">
            {status}
          </p>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
          {CAN_DOWNLOAD && (
            <button type="button" className="btn" onClick={download}>
              ファイルで保存
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={copy}>
            コピー
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function ImportSheet({ onImport, onClose }: { onImport: (text: string) => string | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (t: string) => setError(onImport(t));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError('ファイルが大きすぎます(2MBまで)。');
    try {
      run(await file.text());
    } catch {
      setError('ファイルを読み取れませんでした。');
    }
  };

  return (
    <Sheet label="旅行を読み込む" onClose={onClose}>
      <div className="form">
        <h2>旅行を読み込む</h2>
        <p className="hint">読み込むたびに、新しい旅行として追加されます。既存の旅行は変更されません。</p>
        <button type="button" className="btn btn-big" style={{ width: '100%', marginBottom: 14 }} onClick={() => fileRef.current?.click()}>
          ファイルを選ぶ
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden aria-label="旅行ファイルを選択" />
        <label>
          または、書き出したデータを貼り付け
          <textarea id="import-text" className="code" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"format": "ryotei-note", ...' />
        </label>
        {error && (
          <p className="error wrap" role="alert">
            {error} 既存の旅行は変更されていません。
          </p>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => run(text)}>
            貼り付けた内容を読み込む
          </button>
        </div>
      </div>
    </Sheet>
  );
}
