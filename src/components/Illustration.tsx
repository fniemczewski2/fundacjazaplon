/**
 * Ilustracje marki.
 *
 * Wszystkie pliki leżą w `public/images/illustrations/` w dwóch formatach:
 * WebP (podstawowy, ~2× lżejszy) i PNG (zapasowy). Wymiary są zaszyte
 * w manifeście, żeby przeglądarka rezerwowała miejsce jeszcze przed
 * pobraniem obrazka - bez tego siatka skacze przy wczytywaniu (CLS).
 */

export const ILLUSTRATIONS = {
  // Ikony filarów wsparcia
  'wsparcie-merytoryczne': { w: 369, h: 512 },
  'wsparcie-prawne': { w: 512, h: 455 },
  'wsparcie-finansowe': { w: 397, h: 512 },
  'wsparcie-lokalowe': { w: 370, h: 512 },
  'wsparcie-psychologiczne': { w: 512, h: 470 },
  // Motyw ognia
  zapalki: { w: 474, h: 512 },
  plomyk: { w: 438, h: 512 },
  ognisko: { w: 478, h: 512 },
  wulkan: { w: 386, h: 512 },
  gasnica: { w: 334, h: 512 },
  // Pozostałe
  megafon: { w: 475, h: 512 },
  skrzynka: { w: 512, h: 467 },
  notes: { w: 512, h: 439 },
  koperta: { w: 510, h: 512 },
  moneta: { w: 512, h: 512 },
  fabryka: { w: 512, h: 428 },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

type Props = {
  name: IllustrationName;
  /**
   * Tekst alternatywny. Pomiń dla grafik czysto dekoracyjnych - komponent
   * ustawi wtedy `alt=""` i `aria-hidden`, żeby czytnik ekranu ich nie czytał.
   */
  alt?: string;
  className?: string;
  /** Ilustracja nad zgięciem strony ładuje się od razu, reszta leniwie. */
  priority?: boolean;
  /** Ciepła poświata pod spodem - dla motywu ognia. */
  glow?: boolean;
  /** Delikatne unoszenie się. Wyłączane automatycznie przez `prefers-reduced-motion`. */
  float?: boolean;
};

export default function Illustration({
  name,
  alt,
  className = '',
  priority = false,
  glow = false,
  float = false,
}: Readonly<Props>) {
  const { w, h } = ILLUSTRATIONS[name];
  const base = `/images/illustrations/${name}`;
  const decorative = !alt;

  return (
    <picture className={glow ? 'glow-ember inline-block' : 'inline-block'}>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        src={`${base}.png`}
        alt={decorative ? '' : alt}
        aria-hidden={decorative || undefined}
        width={w}
        height={h}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        draggable={false}
        className={[
          'h-auto w-full object-contain select-none',
          float ? 'motion-safe:animate-float' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </picture>
  );
}
