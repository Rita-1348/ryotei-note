import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** アプリとして追加する案内。インストール済み・Artifact では何も出さない。 */
export default function InstallHint() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEv(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEv(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || import.meta.env.MODE === 'artifact') return null;

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (ev) {
    return (
      <button type="button" className="btn install" onClick={() => ev.prompt().then(() => setEv(null))}>
        アプリとして追加
      </button>
    );
  }
  if (isIos) {
    return (
      <div className="install-ios">
        <button type="button" className="btn install" onClick={() => setShowIos((v) => !v)} aria-expanded={showIos}>
          アプリとして追加する方法
        </button>
        {showIos && <p className="hint">Safari の共有ボタン(□に↑)を押し、「ホーム画面に追加」を選びます。</p>}
      </div>
    );
  }
  return null;
}
