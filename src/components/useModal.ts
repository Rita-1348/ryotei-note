import { useEffect, useRef, type RefObject } from 'react';

let openCount = 0;

// タップしてもボタンにフォーカスが移らない環境(iPhone の Safari など)でも起点へ戻せるよう、直前に押された要素を覚えておく
let lastTrigger: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('button, a, summary, [tabindex]');
      if (el) lastTrigger = el;
    },
    true,
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * シート・ダイアログ共通の挙動:
 * 背景を操作不可(inert)にして、中にフォーカスを収め、Escapeで閉じ、閉じたら起点へフォーカスを戻す。
 * 起点が消えている(削除など)ときは、data-focus-fallback の見出しへ移す。
 */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: () => void, initialFocus?: () => HTMLElement | null) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    // 直前に押された要素(=開いた操作)を優先し、なければ現在のフォーカス位置
    const active = document.activeElement as HTMLElement | null;
    const origin = lastTrigger?.isConnected ? lastTrigger : active;
    const root = document.getElementById('root');
    openCount++;
    root?.setAttribute('inert', '');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let target = initialFocus?.() ?? null;
    if (!target) {
      target = ref.current?.querySelector<HTMLElement>('h2') ?? null;
      target?.setAttribute('tabindex', '-1');
    }
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !ref.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !ref.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount === 0) root?.removeAttribute('inert');
      document.body.style.overflow = prevOverflow;
      const back = origin && origin.isConnected ? origin : document.querySelector<HTMLElement>('[data-focus-fallback]');
      back?.focus();
    };
    // 開いている間だけ有効にする(依存は意図的に空)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
