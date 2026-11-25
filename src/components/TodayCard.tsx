import { formatDuration } from '../lib/dates';
import { mapsUrl } from '../lib/trips';
import type { NextInfo } from '../lib/today';

export default function TodayCard({ info }: { info: NextInfo }) {
  if (info.state === 'none') return null;

  if (info.state === 'done') {
    return (
      <section className="today" aria-label="今日の状況">
        <p className="today-label">今日</p>
        <p className="today-main">今日の予定はすべて終わりました</p>
      </section>
    );
  }

  const e = info.event;
  const label =
    info.state === 'now'
      ? `進行中${info.untilMin != null ? `・終了まで${formatDuration(info.untilMin)}` : ''}`
      : info.state === 'next'
        ? `次の予定・あと${formatDuration(info.inMin)}`
        : '時間未定の予定';

  return (
    <section className="today" aria-label="今日の次の予定">
      <p className="today-label">{label}</p>
      <p className="today-main wrap">
        {e.time && <span className="today-time">{e.time}</span>} {e.title}
      </p>
      {e.place && <p className="wrap">{e.place}</p>}
      {e.place && (
        <a className="map-btn map-btn-lg" href={mapsUrl(e.place)} target="_blank" rel="noopener noreferrer">
          地図で開く
        </a>
      )}
    </section>
  );
}
