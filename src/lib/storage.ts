import { normalizeTrip, type Trip } from './trips';

export const STORAGE_KEY = 'ryotei-note:data';
const VERSION = 1;
const BACKUP_KEY = 'ryotei-note:backups';

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

/** 旅行ごとの最後のバックアップ(書き出し)時刻 */
export function getBackupMap(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function markBackup(tripId: string): void {
  try {
    const m = getBackupMap();
    m[tripId] = new Date().toISOString();
    localStorage.setItem(BACKUP_KEY, JSON.stringify(m));
  } catch {
    /* 記録できなくても書き出し自体は成功 */
  }
}

/** 書き出していない、または書き出し後に変更がある旅行か */
export function needsBackup(trip: Trip, map: Record<string, string>): boolean {
  const b = map[trip.id];
  if (!b) return true;
  return !!trip.updatedAt && trip.updatedAt > b;
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
