import { useEffect, useState } from 'react';
import { FaArrowUp } from 'react-icons/fa6';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * Powrót na górę - pojawia się dopiero po przewinięciu ekranu w dół.
 *
 * Gdy jest schowany, ma `inert`, więc nie łapie fokusu klawiatury. Sam skok
 * respektuje preferencję ograniczonego ruchu: bez niej płynnie, z nią
 * natychmiast.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      inert={!visible}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
        // Fokus wraca na początek dokumentu, żeby nawigacja klawiaturą
        // nie została na dole strony.
        document.getElementById('main-content')?.focus({ preventScroll: true });
      }}
      className={[
        'fixed right-4 bottom-4 z-40 inline-flex size-12 items-center justify-center',
        'rounded-full border bg-surface-raised text-ink shadow-lg transition-all duration-300',
        'hover:-translate-y-1',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      <FaArrowUp aria-hidden="true" />
      <span className="sr-only">Wróć na górę strony</span>
    </button>
  );
}
