'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from 'react';

export type ToastType = 'default' | 'success';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timeoutRefs.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'default') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts(prev => [...prev, {id, message, type}]);

      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS);
      timeoutRefs.current.set(id, timeoutId);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{toast}}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-900 text-white'
          }`}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-1 rounded p-1 opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
