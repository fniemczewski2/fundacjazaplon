import { useCallback, useEffect, useState } from 'react';
import { listQueuedSettlements, type QueuedSettlement } from '../lib/settlementQueue';

/** Rozliczenia zapisane lokalnie (offline), czekające na wysłanie. */
export function useSettlementQueue() {
  const [items, setItems] = useState<QueuedSettlement[]>([]);

  const refresh = useCallback(async () => setItems(await listQueuedSettlements()), []);

  useEffect(() => {
    let alive = true;
    listQueuedSettlements().then((list) => alive && setItems(list));
    return () => {
      alive = false;
    };
  }, []);

  return { items, refresh };
}
