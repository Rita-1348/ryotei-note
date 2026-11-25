import { formatDuration } from '../lib/dates';
import { mapsUrl, type TripEvent } from '../lib/trips';
import type { NextInfo } from '../lib/today';

function TimeRange({ e }: { e: TripEvent }) {
  if (!e.time) return null;
  return (
    <p className="today-time-row">
      <span className="today-time">{e.time}</span>
      {e.endTime && (
        <span className="today-end">
          〜{e.endTime < e.time ? '翌' : ''}
          {e.endTime}
        </span>
      )}
    </p>
  );
}

export default function TodayCard({ info }: { info: NextInfo }) {
  if (info.state === 'none') return null;

  if (info.state === 'done') {
    return (
      <section className="today today-done" aria-label="今日の状況">
        <p className="today-done-text">今日の予定はすべて終わりました</p>
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
      <TimeRange e={e} />
      <p className="today-title wrap">{e.title}</p>
      {e.place && <p className="today-place wrap">{e.place}</p>}
      {e.place && (
        <a className="btn btn-primary btn-link" href={mapsUrl(e.place)} target="_blank" rel="noopener noreferrer">
          地図で開く
        </a>
      )}
    </section>
  );
}
