import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Zastępuje natywne `window.alert()` / `window.confirm()` (patrz audyt, pkt 7.2):
 * te blokują wątek JS, nie dają się stylować i nie mają żadnej kontroli nad
 * fokusem/ARIA. `<FeedbackProvider>` owija aplikację raz (w main.tsx) i wystawia
 * dwa hooki: `useToast()` do komunikatów oraz `useConfirm()` do potwierdzeń.
 */

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: number; type: ToastType; text: string };

type ConfirmOptions = { title?: string; confirmLabel?: string; cancelLabel?: string };
type ConfirmState = ConfirmOptions & {
  message: string;
  resolve: (value: boolean) => void;
};

type FeedbackContextValue = {
  showToast: (text: string, type?: ToastType) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmState) confirmButtonRef.current?.focus();
  }, [confirmState]);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve, ...options });
    });
  }, []);

  const resolveConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Kontener toastów */}
      <div
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]"
        role="region"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-3 shadow-lg text-sm font-medium text-white ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-brand'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Modal potwierdzenia (zastępuje window.confirm) */}
      {confirmState && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
          >
            <h2 id="confirm-title" className="text-lg font-semibold mb-2 text-text-black dark:text-white">
              {confirmState.title ?? 'Potwierdź akcję'}
            </h2>
            <p className="text-sm text-text-black/80 dark:text-gray-300 mb-6">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => resolveConfirm(false)}>
                {confirmState.cancelLabel ?? 'Anuluj'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => resolveConfirm(true)} ref={confirmButtonRef}>
                {confirmState.confirmLabel ?? 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback musi być użyty wewnątrz <FeedbackProvider>.');
  return ctx;
}

export function useToast() {
  return useFeedback().showToast;
}

export function useConfirm() {
  return useFeedback().confirm;
}
