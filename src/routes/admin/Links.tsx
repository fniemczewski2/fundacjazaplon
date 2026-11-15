import { useCallback, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { useAsyncData } from '../../hooks/useAsyncData';
import { createLink, deleteLink, listLinks, saveLinkOrder, updateLink, type LinkDraft, type LinkItem } from '../../lib/links';
import { getErrorMessage } from '../../lib/utils/errors';
import { useConfirm, useToast } from '../../components/ui/Feedback';
import { useStaff } from '../../app/staffContext';
import Loader from '../../components/Loader';
import {
  LINK_ICONS,
  LINK_ICON_LABELS,
  LINK_KIND_LABELS,
  LINK_LIMITS,
  isValidLinkUrl,
  type LinkIcon,
} from '../../../shared/links';

const EMPTY_DRAFT: LinkDraft = { kind: 'link', title: '', description: '', url: '', icon: 'link', active: true };

/** Zwraca komunikat błędu albo null. Adres jest wymagany tylko dla zwykłego linku. */
function validate(draft: LinkDraft): string | null {
  const title = draft.title.trim();
  if (!title) return 'Podaj tytuł.';
  if (title.length > LINK_LIMITS.title) return `Tytuł może mieć najwyżej ${LINK_LIMITS.title} znaków.`;
  if ((draft.description ?? '').length > LINK_LIMITS.description) return `Opis może mieć najwyżej ${LINK_LIMITS.description} znaków.`;
  if (draft.kind === 'link') {
    const url = (draft.url ?? '').trim();
    if (!url) return 'Podaj adres linku.';
    if (!isValidLinkUrl(url)) return 'Adres musi zaczynać się od https:// (albo http://) lub od / dla strony serwisu (np. /materialy).';
  }
  return null;
}

const normalize = (draft: LinkDraft): LinkDraft => ({
  ...draft,
  title: draft.title.trim(),
  description: draft.description?.trim() || null,
  url: draft.kind === 'link' ? (draft.url ?? '').trim() : null,
});

type FormProps = {
  draft: LinkDraft;
  onChange: (draft: LinkDraft) => void;
  idPrefix: string;
  disabled: boolean;
};

function LinkFields({ draft, onChange, idPrefix, disabled }: Readonly<FormProps>) {
  const set = (patch: Partial<LinkDraft>) => onChange({ ...draft, ...patch });
  const isPlainLink = draft.kind === 'link';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm" htmlFor={`${idPrefix}-title`}>
        Tytuł
        <input id={`${idPrefix}-title`} className="border p-2 rounded w-full" maxLength={LINK_LIMITS.title} value={draft.title} disabled={disabled} onChange={(e) => set({ title: e.target.value })} />
      </label>
      <label className="block text-sm" htmlFor={`${idPrefix}-desc`}>
        Opis (opcjonalnie)
        <input id={`${idPrefix}-desc`} className="border p-2 rounded w-full" maxLength={LINK_LIMITS.description} value={draft.description ?? ''} disabled={disabled} onChange={(e) => set({ description: e.target.value })} />
      </label>
      {isPlainLink ? (
        <label className="block text-sm sm:col-span-2" htmlFor={`${idPrefix}-url`}>
          Adres
          <input id={`${idPrefix}-url`} className="border p-2 rounded w-full" type="text" inputMode="url" placeholder="https://… albo /materialy" maxLength={LINK_LIMITS.url} value={draft.url ?? ''} disabled={disabled} onChange={(e) => set({ url: e.target.value })} />
        </label>
      ) : (
        <p className="text-sm text-ink-muted sm:col-span-2">{LINK_KIND_LABELS[draft.kind]}. Adres jest ustawiany poza tą listą.</p>
      )}
      <label className="block text-sm" htmlFor={`${idPrefix}-icon`}>
        Ikona
        <select id={`${idPrefix}-icon`} className="border p-2 rounded w-full" value={draft.icon} disabled={disabled} onChange={(e) => set({ icon: e.target.value as LinkIcon })}>
          {LINK_ICONS.map((icon) => (
            <option key={icon} value={icon}>{LINK_ICON_LABELS[icon]}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm sm:self-end" htmlFor={`${idPrefix}-active`}>
        <input id={`${idPrefix}-active`} type="checkbox" checked={draft.active} disabled={disabled} onChange={(e) => set({ active: e.target.checked })} />
        Widoczny na stronie
      </label>
    </div>
  );
}

type RowProps = {
  item: LinkItem;
  index: number;
  total: number;
  busy: boolean;
  canDelete: boolean;
  onSave: (id: string, draft: LinkDraft) => Promise<void>;
  onMove: (index: number, delta: -1 | 1) => void;
  onDelete: (item: LinkItem) => void;
};

function LinkRow({ item, index, total, busy, canDelete, onSave, onMove, onDelete }: Readonly<RowProps>) {
  const [draft, setDraft] = useState<LinkDraft>({
    kind: item.kind,
    title: item.title,
    description: item.description ?? '',
    url: item.url ?? '',
    icon: item.icon,
    active: item.active,
  });
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const message = validate(draft);
    setError(message);
    if (!message) await onSave(item.id, normalize(draft));
  };

  return (
    <li className="space-y-3 rounded-xl border p-4">
      <LinkFields draft={draft} onChange={setDraft} idPrefix={`link-${item.id}`} disabled={busy} />
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>Zapisz</button>
        <button type="button" className="btn btn-secondary" disabled={busy || index === 0} onClick={() => onMove(index, -1)} aria-label={`Przesuń wyżej: ${item.title}`}>
          <FiArrowUp aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy || index === total - 1} onClick={() => onMove(index, 1)} aria-label={`Przesuń niżej: ${item.title}`}>
          <FiArrowDown aria-hidden="true" />
        </button>
        {canDelete && (
          <button type="button" className="btn btn-secondary text-danger" disabled={busy} onClick={() => onDelete(item)}>Usuń</button>
        )}
      </div>
    </li>
  );
}

export default function AdminLinks() {
  const fetchLinks = useCallback(() => listLinks(), []);
  const { data: items, loading, error: loadError, reload } = useAsyncData(fetchLinks, [] as LinkItem[], 'Nie udało się wczytać linków.');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<LinkDraft>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState<string | null>(null);
  const showToast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { can } = useStaff();

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      await reload();
      await queryClient.invalidateQueries({ queryKey: ['links'] });
      showToast(success, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Operacja nie powiodła się.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onSave = (id: string, next: LinkDraft) => run(() => updateLink(id, next), 'Zapisano.');

  const onMove = (index: number, delta: -1 | 1) => {
    const ids = items.map((i) => i.id);
    const target = index + delta;
    const moved = ids[index];
    const other = ids[target];
    if (moved === undefined || other === undefined) return;
    ids[index] = other;
    ids[target] = moved;
    void run(() => saveLinkOrder(ids), 'Zmieniono kolejność.');
  };

  const onDelete = async (item: LinkItem) => {
    const confirmed = await confirm(`Usunąć link „${item.title}”? Tej operacji nie można cofnąć.`, { title: 'Usuń link', confirmLabel: 'Usuń' });
    if (confirmed) void run(() => deleteLink(item.id), 'Link usunięty.');
  };

  const onAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = validate(draft);
    setDraftError(message);
    if (message) return;
    const nextOrder = items.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1;
    void run(async () => {
      await createLink(normalize(draft), nextOrder);
      setDraft(EMPTY_DRAFT);
    }, 'Link dodany.');
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Linki</h1>
        <Link to="/admin" className="btn btn-secondary">Panel</Link>
      </div>
      <p className="text-sm text-ink-muted">
        Lista wyświetla się na stronie <a className="underline" href="/links" target="_blank" rel="noopener noreferrer">/links<span className="sr-only"> (otwiera się w nowej karcie)</span></a> w tej kolejności. Pozycje Instagram, LinkedIn i „Dołącz” pobierają adres z ustawień i znikają, gdy go brak.
      </p>

      {loading && <Loader />}
      {loadError && <p className="field-error" role="alert">{loadError}</p>}

      <ul className="space-y-4">
        {items.map((item, index) => (
          <LinkRow
            key={`${item.id}:${item.sort_order}:${item.title}:${item.url}:${item.description}:${item.icon}:${item.active}`}
            item={item}
            index={index}
            total={items.length}
            busy={busy}
            canDelete={can('admin')}
            onSave={onSave}
            onMove={onMove}
            onDelete={(i) => void onDelete(i)}
          />
        ))}
      </ul>

      <form onSubmit={onAdd} className="space-y-3 rounded-xl border p-4">
        <h2 className="text-lg font-medium">Dodaj link</h2>
        <LinkFields draft={draft} onChange={setDraft} idPrefix="link-new" disabled={busy} />
        {draftError && <p className="field-error" role="alert">{draftError}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>Dodaj</button>
      </form>
    </div>
  );
}
