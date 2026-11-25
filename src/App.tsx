import { useCallback, useEffect, useState } from 'react';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import { loadTrips, requestPersistence, saveTrips } from './lib/storage';
import type { Trip } from './lib/trips';

function readHash(): string | null {
  // Artifact でも使えるよう、ハッシュは ASCII の「#trip-ID」形式にする
  const m = /^#trip-(.+)$/.exec(window.location.hash);
  return m ? m[1] : null;
}

export default function App() {
  const [initial] = useState(loadTrips);
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const [warning, setWarning] = useState<string | undefined>(initial.warning);
  const [openId, setOpenId] = useState<string | null>(readHash);

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
    try {
      saveTrips(next);
    } catch {
      return '保存できませんでした。ブラウザの保存領域がいっぱいか、保存が許可されていない可能性があります。変更は反映されていません。';
    }
    setTrips(next);
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
          onBack={() => open(null)}
          onUpdate={(t) => commit(trips.map((x) => (x.id === t.id ? t : x)))}
        />
      ) : (
        <TripList trips={trips} onCommit={commit} onOpen={(id) => open(id)} missingTrip={openId !== null} />
      )}
    </div>
  );
}
