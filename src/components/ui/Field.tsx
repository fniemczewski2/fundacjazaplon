import { useId, type ReactNode } from 'react';

/**
 * Pole formularza z etykietą, podpowiedzią i komunikatem błędu powiązanymi przez aria-describedby.
 * Dziecko dostaje gotowe atrybuty dostępności i podpina je do własnego `input`/`textarea`.
 */
export type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: (a11y: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

export default function Field({ label, error, hint, children }: Readonly<FieldProps>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="field-hint mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
