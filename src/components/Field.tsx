import type { ReactNode } from 'react';

export interface ControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

interface Props {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: (p: ControlProps) => ReactNode;
}

/** 常時見えるラベル(htmlFor/id)と、欄の直下に出すエラー(aria-describedby)をまとめた入力欄 */
export default function Field({ id, label, error, hint, children }: Props) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, ...(ids ? { 'aria-describedby': ids } : {}), ...(error ? { 'aria-invalid': true as const } : {}) })}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error wrap" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 検証エラーの欄へフォーカスを移す */
export function focusField(id: string) {
  setTimeout(() => document.getElementById(id)?.focus(), 0);
}
