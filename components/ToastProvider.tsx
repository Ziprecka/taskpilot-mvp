'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type Toast = { id: string; message: string };

const ToastContext = createContext<{ pushToast: (message: string) => void }>({ pushToast: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      pushToast: (message: string) => {
        const toast = { id: crypto.randomUUID(), message };
        setToasts((prev) => [toast, ...prev].slice(0, 4));
        setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== toast.id)), 3200);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-xl border border-amber-400/50 bg-slate-950/95 px-4 py-2 text-sm text-amber-100 shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
