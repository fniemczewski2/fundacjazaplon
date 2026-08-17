import React from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

type Direction = 'up' | 'left' | 'right' | 'zoom';

type Props = {
  children: React.ReactNode;
  /** Kierunek wejścia. Domyślnie delikatne podniesienie z dołu. */
  direction?: Direction;
  /** Opóźnienie w ms - do kaskadowego odsłaniania kart w siatce. */
  delay?: number;
  /** Element HTML do wyrenderowania. Domyślnie `div`. */
  as?: 'div' | 'section' | 'article' | 'li' | 'header' | 'aside';
  className?: string;
  id?: string;
};

const DIRECTION_CLASS: Record<Direction, string> = {
  up: '',
  left: 'reveal-left',
  right: 'reveal-right',
  zoom: 'reveal-zoom',
};

/**
 * Odsłania zawartość, gdy wjedzie w widok.
 *
 * Trzy decyzje warte odnotowania:
 *
 * 1. Animacja jest jednorazowa - po pokazaniu przestajemy obserwować element.
 *    Treść migocząca przy każdym przewinięciu w górę i w dół męczy.
 * 2. Przy `prefers-reduced-motion: reduce` w ogóle nie dodajemy klasy `reveal`,
 *    więc nie ma ani przejścia, ani stanu „niewidoczny”.
 * 3. Gdyby JavaScript nie wystartował, CSS i tak wymusza pełną widoczność
 *    w media query - treść nigdy nie zostaje uwięziona w `opacity: 0`.
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  as: Tag = 'div',
  className = '',
  id,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    // Starsze przeglądarki bez IntersectionObserver: pokaż od razu.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      // Odpalamy nieco zanim element w pełni wjedzie w kadr - dzięki temu
      // ruch kończy się mniej więcej wtedy, gdy użytkownik na niego patrzy.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const classes = reduced
    ? className
    : [
        'reveal',
        DIRECTION_CLASS[direction],
        visible ? 'is-visible' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ');

  return (
    <Tag
      id={id}
      ref={ref as React.Ref<never>}
      className={classes}
      style={delay && !reduced ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
