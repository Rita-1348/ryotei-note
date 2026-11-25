import { useCallback, useEffect, useRef, useState } from 'react';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import { todayString } from './lib/dates';
import { loadTrips, requestPersistence, saveTrips } from './lib/storage';
import type { Trip } from './lib/trips';

function readHash(): string | null {
  // Artifact でも使えるよう、ハッシュは ASCII の「#trip-ID」形式にする
  const m = /^#trip-(.+)$/.exec(window.location.hash);
  return m ? m[1] : null;
}

/** 起動時に開く旅行: URLで指定があればそれ、なければ「旅行中」の旅行が1件のときだけそれを開く */
function initialOpenId(trips: Trip[]): string | null {
  const fromHash = readHash();
  if (fromHash) return fromHash;
  if (window.location.hash && window.location.hash !== '#') return null;
  const today = todayString();
  const active = trips.filter((t) => t.startDate <= today && today <= t.endDate);
  if (active.length !== 1) return null;
  window.history.replaceState(null, '', `#trip-${active[0].id}`);
  return active[0].id;
}

export default function App() {
  const [initial] = useState(loadTrips);
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const tripsRef = useRef(trips);
  const [warning, setWarning] = useState<string | undefined>(initial.warning);
  const [openId, setOpenId] = useState<string | null>(() => initialOpenId(initial.trips));

  useEffect(() => {
    void requestPersistence();
  }, []);

  useEffect(() => {
    const onHash = () => setOpenId(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /** 保存に成功したときだけ画面の状態を更新する。失敗時は日本語のエラー文を返す。 */
  const commit = useCallback((next: Trip[]): string | null => {
    // 変更された旅行にだけ更新時刻を付ける(バックアップ要否の判定に使う)
    const now = new Date().toISOString();
    const stamped = next.map((t) => (tripsRef.current.includes(t) ? t : { ...t, updatedAt: now }));
    try {
      saveTrips(stamped);
    } catch {
      return '保存できませんでした。ブラウザの保存領域がいっぱいか、保存が許可されていない可能性があります。変更は反映されていません。';
    }
    tripsRef.current = stamped;
    setTrips(stamped);
    setWarning(undefined);
    return null;
  }, []);

  const open = (id: string | null) => {
    window.location.hash = id ? `#trip-${id}` : '#';
    window.scrollTo(0, 0);
  };

  const trip = openId ? trips.find((t) => t.id === openId) : undefined;

  return (
    <div className="app">
      {warning && (
        <p className="banner banner-error" role="alert">
          {warning}
        </p>
      )}
      {trip ? (
        <TripDetail
          key={trip.id}
          trip={trip}
          otherTrips={trips.filter((t) => t.id !== trip.id)}
          onBack={() => open(null)}
          onUpdate={(t) => commit(trips.map((x) => (x.id === t.id ? t : x)))}
        />
      ) : (
        <TripList trips={trips} onCommit={commit} onOpen={(id) => open(id)} missingTrip={openId !== null} />
      )}
    </div>
  );
}
