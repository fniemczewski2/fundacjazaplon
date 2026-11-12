import { QueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '../lib/config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.content,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
