import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// HTTPS(または localhost)で開いたときだけ、アプリ本体をキャッシュして起動を速くする
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' &&'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
