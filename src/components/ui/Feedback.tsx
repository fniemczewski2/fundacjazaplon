import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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

const TOAST_BG: Record<ToastType, string> = {
  error: 'bg-red-600',
  success: 'bg-emerald-600',
  info: 'bg-brand',
};

export function FeedbackProvider({ children }: Readonly<{ children: React.ReactNode }>) {
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

  const contextValue = React.useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      <div
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const className = `rounded-xl px-4 py-3 shadow-lg text-sm font-medium text-white ${TOAST_BG[t.type]}`;
          return t.type === 'error' ? (
            <div key={t.id} role="alert" className={className}>
              {t.text}
            </div>
          ) : (
            <output key={t.id} className={`block ${className}`}>
              {t.text}
            </output>
          );
        })}
      </div>

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
