import { useEffect, type ReactNode } from 'react';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** 画面下から出るシート(入力内容を失わないよう、外側タップでは閉じない) */
export default function Sheet({ label, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="overlay sheet-overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
