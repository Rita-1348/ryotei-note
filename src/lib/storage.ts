import { normalizeTrip, type Trip } from './trips';

export const STORAGE_KEY = 'ryotei-note:data';
const VERSION = 1;

export interface LoadResult {
  trips: Trip[];
  warning?: string;
}

export function loadTrips(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      trips: [],
      warning: 'このブラウザでは保存領域を読み込めませんでした。プライベートブラウズ等では保存できない場合があります。',
    };
  }
  if (raw == null) return { trips: [] };
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION || !Array.isArray(data.trips)) throw new Error('format');
    const trips: Trip[] = [];
    for (const t of data.trips) {
      const r = normalizeTrip(t, true);
      if ('error' in r) throw new Error(r.error);
      trips.push(r.trip);
    }
    return { trips };
  } catch {
    // 壊れたデータは上書きせず退避する
    const backupKey = `${STORAGE_KEY}:broken-${Date.now()}`;
    try {
      localStorage.setItem(backupKey, raw);
    } catch {
      /* 退避できなくても続行 */
    }
    return { trips: [], warning: `保存データを読み込めませんでした。元のデータは「${backupKey}」として退避しました。` };
  }
}

const BACKUP_KEY = 'ryotei-note:last-backup';

/** 最後に書き出し(バックアップ)した時刻。なければ null */
export function getLastBackup(): Date | null {
  try {
    const v = localStorage.getItem(BACKUP_KEY);
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

export function markBackup(): void {
  try {
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  } catch {
    /* 記録できなくても書き出し自体は成功 */
  }
}

/** ブラウザに「容量不足でも消さないで」と要求する(対応していない端末では何もしない) */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/** 失敗時は例外を投げる */
export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, trips }));
}
