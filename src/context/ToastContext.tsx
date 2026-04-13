import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastLevel = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  level: ToastLevel;
}

interface ToastContextValue {
  toast: (message: string, level?: ToastLevel) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const STYLES: Record<ToastLevel, string> = {
  success: 'bg-teal-900/90 border-teal-500/50 text-teal-200',
  error:   'bg-red-900/90  border-red-500/50  text-red-200',
  info:    'bg-sol-card    border-sol-border   text-gray-200',
};

const ICONS: Record<ToastLevel, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm text-sm max-w-sm w-full pointer-events-auto animate-fade-in ${STYLES[toast.level]}`}
      role="alert"
    >
      <span className="font-bold mt-0.5 flex-shrink-0">{ICONS[toast.level]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, level: ToastLevel = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, level }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container — always on top */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
