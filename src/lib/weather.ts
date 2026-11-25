import { addDays, todayString } from './dates';

export interface DayWeather {
  date: string;
  label: string;
  max: number;
  min: number;
  pop: number | null;
}

export type WeatherResult =
  | { ok: true; place: string; days: Record<string, DayWeather>; note?: string }
  | { ok: false; error: string };

/** Open-Meteo の天気コード → 日本語 */
export function weatherLabel(code: number): string {
  if (code === 0) return '快晴';
  if (code === 1) return '晴れ';
  if (code === 2) return '薄曇り';
  if (code === 3) return '曇り';
  if (code === 45 || code === 48) return '霧';
  if (code >= 51 && code <= 57) return '霧雨';
  if (code >= 61 && code <= 67) return '雨';
  if (code >= 71 && code <= 77) return '雪';
  if (code >= 80 && code <= 82) return 'にわか雨';
  if (code === 85 || code === 86) return 'にわか雪';
  if (code >= 95) return '雷雨';
  return '不明';
}

/**
 * 目的地名から天気を取得する(Open-Meteo、APIキー不要)。
 * 目的地名がこのサービスに送信される。予報の対象は過去90日〜15日先まで。
 */
export async function fetchWeather(destination: string, start: string, end: string, signal?: AbortSignal): Promise<WeatherResult> {
  const today = todayString();
  const from = start < addDays(today, -90) ? addDays(today, -90) : start;
  const to = end > addDays(today, 15) ? addDays(today, 15) : end;
  if (from > to) return { ok: false, error: '予報を出せる期間(15日先まで)の外です。' };
  try {
    // 検索は完全一致に近いため、「京都」→「京都市」のように接尾辞を補って順に試す
    let hit: { latitude: number; longitude: number; name: string } | undefined;
    for (const suffix of ['', '市', '町', '区', '村', '都']) {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination + suffix)}&count=1&language=ja&country_code=JP`,
        { signal },
      );
      if (!g.ok) throw new Error('geocode');
      const gj = (await g.json()) as { results?: { latitude: number; longitude: number; name: string }[] };
      hit = gj.results?.[0];
      if (hit) break;
    }
    if (!hit) return { ok: false, error: `「${destination}」の場所が見つかりませんでした。市区町村名などで試してください。` };
    const f = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=Asia%2FTokyo&start_date=${from}&end_date=${to}`,
      { signal },
    );
    if (!f.ok) throw new Error('forecast');
    const fj = (await f.json()) as {
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
      };
    };
    const days: Record<string, DayWeather> = {};
    fj.daily.time.forEach((d, i) => {
      days[d] = {
        date: d,
        label: weatherLabel(fj.daily.weather_code[i]),
        max: Math.round(fj.daily.temperature_2m_max[i]),
        min: Math.round(fj.daily.temperature_2m_min[i]),
        pop: fj.daily.precipitation_probability_max[i] ?? null,
      };
    });
    return { ok: true, place: hit.name, days };
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { ok: false, error: '' };
    return { ok: false, error: '天気を取得できませんでした(通信できないか、サービスが応答しません)。' };
  }
}
