import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from './useModal';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** 画面下から出るシート(入力内容を失わないよう、外側タップでは閉じない) */
export default function Sheet({ label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, onClose);

  return createPortal(
    <div className="overlay sheet-overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
