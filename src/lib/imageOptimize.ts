// Optymalizacja obrazów przed wgraniem do Storage: zmniejszenie do rozsądnego rozmiaru i konwersja do WebP.
// Supabase Free nie przetwarza obrazów po stronie serwera (parametry ?width= są ignorowane), więc ciężki
// oryginał trafiałby do odwiedzających bez zmian.

export const MAX_IMAGE_SIDE = 1600;
export const WEBP_QUALITY = 0.82;

/** Wymiary po przeskalowaniu tak, by dłuższy bok nie przekraczał `max`. Nigdy nie powiększa. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Zwraca plik WebP o ograniczonym rozmiarze albo oryginał, gdy konwersja nie ma sensu lub się nie powiodła.
 * GIF (animacje) zostaje bez zmian.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_SIDE);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const resized = width !== bitmap.width || height !== bitmap.height;
    bitmap.close();

    const blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
    if (blob?.type !== 'image/webp') return file;
    // Plik, który nie był skalowany i nie zmalał, zostaje bez zmian (bez kolejnej utraty jakości).
    if (!resized && blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'obraz';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}
