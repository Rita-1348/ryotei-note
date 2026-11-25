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

/** 失敗時は例外を投げる */
export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, trips }));
}
