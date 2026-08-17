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

/**
 * Poprzednia wersja wymuszała `items-center`, przez co formularze i listy
 * wewnątrz kart zwężały się do szerokości najdłuższego wiersza. Teraz
 * wyśrodkowanie jest świadomym wyborem (`center`), a nie domyślnym.
 */
export default function Card({
  children,
  className = '',
  tone = 'default',
  interactive = false,
  center = false,
}: Props) {
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
