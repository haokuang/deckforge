import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastMessage } from '../../types';

const ICON_MAP = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };
const COLOR_MAP = {
  success: 'text-deck-accent2',
  error: 'text-deck-error',
  warning: 'text-deck-warn',
  info: 'text-deck-accent',
};

export function ToastContainer() {
  const { toasts, removeToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const Icon = ICON_MAP[toast.type];
  const colorClass = COLOR_MAP[toast.type];
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration || 3000;
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);

  useEffect(() => {
    if (isPaused) return;
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(remainingRef.current - elapsed, 0);
      const pct = (remaining / duration) * 100;
      setProgress(pct);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsExiting(true);
        setTimeout(onClose, 250);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, duration, onClose]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(remainingRef.current - elapsed, 0);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 250);
  };

  return (
    <div
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        pointer-events-auto relative flex items-center gap-2.5 px-4 py-3 deck-glass-thin min-w-[260px] max-w-sm overflow-hidden
        transition-all duration-250
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 anim-fade-in-up'}
      `}
    >
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
      <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
      <span className="text-[13px] text-deck-text flex-1">{toast.message}</span>
      <button
        onClick={handleClose}
        className="deck-btn-ghost p-0.5 opacity-60 hover:opacity-100"
        aria-label="关闭通知"
        title="关闭"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
