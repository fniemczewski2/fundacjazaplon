import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../lib/utils/errors';

type State<T> = { data: T; loading: boolean; error: string | null };

/**
 * Pobiera dane przy montowaniu i na żądanie (`reload`). Stan jest zapisywany dopiero po zakończeniu żądania,
 * więc efekt nie wywołuje setState synchronicznie. `fetcher` musi mieć stabilną tożsamość (funkcja modułu albo useCallback).
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, initial: T, fallbackError: string) {
  const [state, setState] = useState<State<T>>({ data: initial, loading: true, error: null });

  const load = useCallback(async () => {
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: getErrorMessage(error, fallbackError) }));
    }
  }, [fetcher, fallbackError]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    return load();
  }, [load]);

  return { data: state.data, loading: state.loading, error: state.error, reload };
}
