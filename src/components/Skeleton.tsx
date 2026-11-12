/** Szkielet ładowania. Animację pulsowania wyłącza `prefers-reduced-motion` (reguła globalna w index.css). */
export function Skeleton({ className = '' }: Readonly<{ className?: string }>) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-surface-cool ${className}`} />;
}

type SkeletonListProps = { count?: number; variant?: 'card' | 'row' | 'article'; label?: string };

export function SkeletonList({ count = 3, variant = 'card', label = 'Wczytywanie treści' }: Readonly<SkeletonListProps>) {
  if (variant === 'article') {
    return (
      <output className="block space-y-4" aria-label={label}>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </output>
    );
  }

  const grid = variant === 'card' ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3';
  return (
    <output className={`block ${grid}`} aria-label={label}>
      {Array.from({ length: count }, (_, index) =>
        variant === 'card' ? (
          <div key={index} className="card space-y-3 p-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <Skeleton key={index} className="h-14 w-full" />
        ),
      )}
    </output>
  );
}
