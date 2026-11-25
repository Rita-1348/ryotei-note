import { normalizeTrip, makeId, type Trip } from './trips';

export const FILE_FORMAT = 'ryotei-note';
export const FILE_VERSION = 1;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function exportTrip(trip: Trip): string {
  return JSON.stringify(
    {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      trip: {
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        events: trip.events.map(({ date, title, time, place, memo }) => ({ date, title, time, place, memo })),
      },
    },
    null,
    2,
  );
}

export function exportFileName(trip: Trip): string {
  const safe = trip.name.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'trip';
  return `旅程ノート_${safe}_${trip.startDate}.json`;
}

/** 読み込み: 検証し、新しいIDを振った Trip を返す。同名があれば「（コピー）」を付ける。 */
export function parseImport(text: string, existing: Trip[]): { trip: Trip } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'JSONとして読み取れませんでした。旅程ノートから書き出したファイルを選んでください。' };
  }
  if (!data || typeof data !== 'object') return { error: '旅程ノートのファイルではありません。' };
  const d = data as Record<string, unknown>;
  if (d.format !== FILE_FORMAT) return { error: '旅程ノートのファイルではありません。' };
  if (typeof d.version !== 'number') return { error: 'ファイルのバージョンがありません。' };
  if (d.version > FILE_VERSION) {
    return { error: `新しい形式(バージョン${d.version})のファイルです。アプリを更新してから読み込んでください。` };
  }
  if (d.version !== FILE_VERSION) return { error: `未対応のバージョン(${d.version})です。` };
  const res = normalizeTrip(d.trip, false);
  if ('error' in res) return { error: `ファイルの内容に問題があります: ${res.error}` };
  const trip = res.trip;
  trip.id = makeId();
  if (existing.some((t) => t.name === trip.name)) trip.name = `${trip.name}（コピー）`;
  return { trip };
}
