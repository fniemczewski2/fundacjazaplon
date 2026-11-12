import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import Modal from '../Modal';

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

const TOAST_DURATION_MS = 6000;

const TOAST_BG: Record<ToastType, string> = {
  error: 'bg-danger text-ink-inverse',
  success: 'bg-success text-ink-inverse',
  info: 'bg-brand text-on-brand',
};

/** Pojedynczy komunikat. Zegar zamknięcia staje, gdy wskaźnik albo fokus jest na komunikacie (WCAG 2.2.1). */
function Toast({ item, onDismiss }: Readonly<{ item: ToastItem; onDismiss: (id: number) => void }>) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(item.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [paused, item.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium ${TOAST_BG[item.type]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="min-w-0 flex-1">{item.text}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-ink-inverse/15"
      >
        <FaXmark aria-hidden="true" />
        <span className="sr-only">Zamknij komunikat</span>
      </button>
    </div>
  );
}

export function FeedbackProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);
  const pendingConfirm = useRef<ConfirmState | null>(null);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      const next: ConfirmState = { message, resolve, ...options };
      pendingConfirm.current = next;
      setConfirmState(next);
    });
  }, []);

  const resolveConfirm = useCallback((value: boolean) => {
    pendingConfirm.current?.resolve(value);
    pendingConfirm.current = null;
    setConfirmState(null);
  }, []);

  const closeConfirm = useCallback(() => resolveConfirm(false), [resolveConfirm]);

  const contextValue = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      {/* Jeden region live dla wszystkich komunikatów: czytnik zapowiada każdy nowy wpis dokładnie raz. */}
      <section
        aria-label="Powiadomienia"
        aria-live="polite"
        aria-relevant="additions"
        className="fixed right-4 bottom-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={dismissToast} />
        ))}
      </section>

      <Modal open={confirmState !== null} onClose={closeConfirm} title={confirmState?.title ?? 'Potwierdź akcję'}>
        <p className="text-sm text-ink-muted">{confirmState?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => resolveConfirm(false)}>
            {confirmState?.cancelLabel ?? 'Anuluj'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => resolveConfirm(true)}>
            {confirmState?.confirmLabel ?? 'Potwierdź'}
          </button>
        </div>
      </Modal>
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
