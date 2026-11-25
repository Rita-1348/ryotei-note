import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from './useModal';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useModal(ref, onCancel, () => cancelRef.current);

  return createPortal(
    <div className="overlay">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg" ref={ref}>
        <h2 id="dlg-title" className="wrap">
          {title}
        </h2>
        <p id="dlg-msg" className="wrap">
          {message}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
