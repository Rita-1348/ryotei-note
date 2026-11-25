import { formatDay } from '../lib/dates';
import { formatYen, summarizeCosts, type Trip } from '../lib/trips';

export default function Costs({ trip }: { trip: Trip }) {
  const s = summarizeCosts(trip);
  const withCost = trip.events.length - s.missing;

  return (
    <section aria-label="費用">
      <h2 className="day-title">費用メモ</h2>
      <div className="total">
        <p className="sub">合計</p>
        <p className="total-n">{formatYen(s.total)}</p>
        <p className="sub">
          費用ありの予定 {withCost}件 / 未入力 {s.missing}件
        </p>
      </div>

      {withCost === 0 ? (
        <p className="empty-note">予定の「費用」を入力すると、ここに集計されます(予定の編集 → 種類・終了時刻・予約・費用)。</p>
      ) : (
        <>
          <h3 className="sec">日別</h3>
          <ul className="sum-list">
            {s.byDay.map((d) => (
              <li key={d.date}>
                <span>{formatDay(d.date)}</span>
                <span className="amount">{formatYen(d.total)}</span>
              </li>
            ))}
          </ul>
          <h3 className="sec">種類別</h3>
          <ul className="sum-list">
            {s.byKind.map((k) => (
              <li key={k.kind}>
                <span>{k.kind}</span>
                <span className="amount">{formatYen(k.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
