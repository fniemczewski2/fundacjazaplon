import { FiCheck, FiCopy } from 'react-icons/fi';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

export default function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const { copiedKey, copy } = useCopyToClipboard();
  const copied = copiedKey === 'value';

  return (
    <button
      type="button"
      onClick={() => copy('value', value)}
      aria-label={copied ? `Skopiowano: ${label}` : `Skopiuj: ${label}`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-cool"
    >
      {copied ? <FiCheck aria-hidden="true" className="size-4 text-success" /> : <FiCopy aria-hidden="true" className="size-4" />}
    </button>
  );
}
