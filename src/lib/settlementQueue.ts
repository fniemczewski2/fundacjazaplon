import type { SettlementInput } from './settlements';

/**
 * Kolejka offline dla rozliczeń: wypełniony formularz (wraz z plikiem faktury) zapisujemy w IndexedDB,
 * gdy nie ma sieci. Wysyłka następuje po powrocie połączenia, po ponownym potwierdzeniu captcha.
 * Pliki są przechowywane jako Blob, więc nie ma limitu rozmiaru właściwego dla localStorage.
 */
const DB_NAME = 'zaplon-offline';
const STORE = 'settlements';

export type QueuedSettlement = {
  id: string;
  createdAt: number;
  fields: Omit<SettlementInput, 'file' | 'fileName'>;
  file: Blob | null;
  fileName: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB niedostępne'));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Błąd IndexedDB'));
    });
  } finally {
    db.close();
  }
}

export async function enqueueSettlement(input: SettlementInput): Promise<void> {
  const { file, fileName, ...fields } = input;
  const item: QueuedSettlement = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    fields,
    file: file ?? null,
    fileName: fileName ?? (file instanceof File ? file.name : null),
  };
  await run('readwrite', (store) => store.put(item));
}

export async function listQueuedSettlements(): Promise<QueuedSettlement[]> {
  try {
    const items = await run<QueuedSettlement[]>('readonly', (store) => store.getAll());
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removeQueuedSettlement(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
}

export const queuedToInput = (item: QueuedSettlement): SettlementInput => ({
  ...item.fields,
  file: item.file,
  fileName: item.fileName ?? undefined,
});
