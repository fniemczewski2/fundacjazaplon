import React from 'react';
import { FaXmark } from 'react-icons/fa6';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tytuł okna. Trafia do `aria-labelledby`, więc jest wymagany. */
  title: string;
  /** Ukryj widoczny nagłówek, gdy treść okna ma już własny H2. */
  hideTitle?: boolean;
  size?: 'md' | 'lg';
  children: React.ReactNode;
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Okno modalne spełniające wzorzec ARIA „dialog (modal)”.
 *
 * Poprzednie okna w projekcie (pobieranie materiałów, linki) były zwykłymi
 * `div`-ami: bez roli, bez zamykania Escape'em, bez pułapki fokusu i bez
 * powrotu fokusu do przycisku, który je otworzył. Osoba nawigująca
 * klawiaturą albo czytnikiem ekranu wypadała z okna po pierwszym Tabie
 * i trafiała w treść pod spodem.
 *
 * Tutaj: rola `dialog` + `aria-modal`, Escape zamyka, Tab krąży wewnątrz,
 * tło jest zablokowane przed przewijaniem, a po zamknięciu fokus wraca
 * dokładnie tam, skąd przyszedł.
 */
export default function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  size = 'md',
  children,
}: Props) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokus na panel — czytnik ekranu odczyta tytuł okna zaraz po otwarciu.
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Tło. Klik zamyka, ale element jest ukryty przed czytnikami —
          zamykanie zapewnia już Escape i widoczny przycisk „Zamknij”. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'card animate-fade-in relative max-h-[90vh] w-full overflow-y-auto p-6 md:p-8',
          size === 'lg' ? 'max-w-4xl' : 'max-w-md',
        ].join(' ')}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-heading text-2xl font-semibold'}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost -mt-1 -mr-1 shrink-0 px-3"
          >
            <FaXmark aria-hidden="true" className="size-5" />
            <span className="sr-only">Zamknij okno</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
