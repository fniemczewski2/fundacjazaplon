import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../lib/logger';

const RESET_MS = 2000;

/** Kopiuje tekst do schowka i przez chwilę zwraca klucz skopiowanej wartości (do zmiany ikony i komunikatu). */
export function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), RESET_MS);
    } catch (error) {
      logger.error('clipboard', 'Nie udało się skopiować wartości', error);
    }
  }, []);

  return { copiedKey, copy };
}
