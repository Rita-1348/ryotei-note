import type { KeyboardEvent } from 'react';

/** タブの左右キー・Home・End で移動する(選択と同時にフォーカスも移す) */
export function onTabKeyDown(e: KeyboardEvent<HTMLElement>, count: number, current: number, select: (i: number) => void, idOf: (i: number) => string) {
  let next = current;
  if (e.key === 'ArrowRight') next = (current + 1) % count;
  else if (e.key === 'ArrowLeft') next = (current - 1 + count) % count;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = count - 1;
  else return;
  e.preventDefault();
  select(next);
  requestAnimationFrame(() => document.getElementById(idOf(next))?.focus());
}
