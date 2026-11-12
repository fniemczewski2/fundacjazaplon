import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** `warm` / `cool` zmieniają tło na jedno z pasm systemu. */
  tone?: 'default' | 'warm' | 'cool';
  /** Unoszenie przy najechaniu - tylko dla kart, które są linkiem. */
  interactive?: boolean;
  /** Wyśrodkowanie zawartości. Domyślnie do lewej - tekst czyta się lepiej. */
  center?: boolean;
};

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: '',
  warm: 'panel-warm',
  cool: 'panel-cool',
};

/** Karta treści. Wyśrodkowanie zawartości włącza się jawnie (`center`), żeby formularze i listy zajmowały pełną szerokość. */
export default function Card({
  children,
  className = '',
  tone = 'default',
  interactive = false,
  center = false,
}: Readonly<Props>) {
  return (
    <div
      className={[
        'card flex h-full flex-col p-6 md:p-8',
        TONE[tone],
        interactive ? 'card-interactive' : '',
        center ? 'items-center text-center' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
