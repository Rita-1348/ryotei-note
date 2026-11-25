import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

/** 画面の描画中にエラーが起きても、真っ白にせず原因を表示する(旅行データには触れない) */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app" style={{ gap: 16 }}>
        <h1 className="wrap">画面の表示でエラーが起きました</h1>
        <p>保存済みの旅行データは消えていません。再読み込みしても直らないときは、下の内容を開発者に伝えてください。</p>
        <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
          再読み込み
        </button>
        <p className="hint wrap">{String(this.state.error.message || this.state.error)}</p>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

try {
  sessionStorage.removeItem('ryotei-note:retried');
} catch {
  /* 使えなくても問題ない */
}

// HTTPS(または localhost)で開いたときだけ、アプリ本体をキャッシュして起動を速くする
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
