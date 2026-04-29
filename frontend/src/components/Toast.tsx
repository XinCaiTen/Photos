import React, { useEffect } from 'react';
import type { ToastMessage } from '../types';

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ICONS: Record<ToastMessage['type'], string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
};

const Toast: React.FC<Props> = ({ toasts, onRemove }) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const last = toasts[toasts.length - 1];
    const timer = setTimeout(() => onRemove(last.id), 3500);
    return () => clearTimeout(timer);
  }, [toasts, onRemove]);

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} id={`toast-${t.id}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span>{t.message}</span>
          <button
            style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}
            onClick={() => onRemove(t.id)}
            aria-label="Đóng thông báo"
          >×</button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
