import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PlannerState } from '../../lib/planner-data';
import { useActiveTab } from '../../context/ActiveTabContext';
import { validateRequiredFields, type FieldErrors } from '../../lib/form-validation';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../../lib/storage';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appInputClassName, appTextareaClassName } from '../ui/AppField';
import { FieldError } from './FieldError';

type NoteCreateDraft = {
  title: string;
  text: string;
};

const NOTES_CREATE_STORAGE_KEY = 'notes-create';
const EMPTY_NOTE_DRAFT: NoteCreateDraft = {
  title: '',
  text: '',
};

export function NotesModule({
  notes,
  onAddNote,
  onDeleteNote,
  onOpenNote,
}: {
  notes: PlannerState['notes'];
  onAddNote: (title: string, text: string) => Promise<boolean>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNote: (noteId: string) => void;
}) {
  const { activeTab } = useActiveTab();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draft, setDraft] = useState<NoteCreateDraft>(() =>
    loadUiDraft<NoteCreateDraft>(NOTES_CREATE_STORAGE_KEY, EMPTY_NOTE_DRAFT),
  );

  const updateDraft = (updater: (current: NoteCreateDraft) => NoteCreateDraft) => {
    setDraft((current) => {
      const next = updater(current);
      saveUiDraft(NOTES_CREATE_STORAGE_KEY, next);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateRequiredFields(new FormData(event.currentTarget), [{ name: 'text', label: 'Inhalt' }]);
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    if (!draft.text.trim()) {
      return;
    }

    setErrors({});
    const didSave = await onAddNote(draft.title, draft.text);

    if (!didSave) {
      return;
    }

    setDraft(EMPTY_NOTE_DRAFT);
    clearUiDraft(NOTES_CREATE_STORAGE_KEY);
  };

  const clearFieldError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });

  return (
    <section className={activeTab === 'notes' ? 'module is-visible' : 'module'}>
      <div className="module-layout grid-cols-[minmax(320px,440px)_minmax(0,1fr)]">
        <AppCard as="form" className="form-panel min-w-0" onSubmit={handleSubmit} noValidate>
          <h4>Neue Notiz</h4>
          <input
            className={appInputClassName()}
            name="title"
            placeholder="Titel"
            value={draft.title}
            onChange={(event) => {
              const nextTitle = event.currentTarget.value;
              updateDraft((current) => ({ ...current, title: nextTitle }));
            }}
          />
          <textarea
            className={appTextareaClassName()}
            name="text"
            placeholder="Inhalt"
            rows={5}
            value={draft.text}
            aria-invalid={errors.text ? 'true' : undefined}
            aria-describedby={errors.text ? 'text-error' : undefined}
            onInput={(event) => {
              const nextText = event.currentTarget.value;
              updateDraft((current) => ({ ...current, text: nextText }));
              clearFieldError('text');
            }}
          />
          <FieldError fieldName="text" message={errors.text} />
          <AppButton type="submit" variant="primary">Notiz speichern</AppButton>
        </AppCard>
        <AppCard className="self-start">
          <div className="columns-2 gap-x-[1.15rem] max-[720px]:columns-1">
            {notes.length > 0 ? notes.map((note) => (
              <article key={note.id} className="note-card break-inside-avoid relative grid mb-4 p-0 w-full max-w-full max-h-[15rem] overflow-hidden rounded-[24px] bg-[rgba(255,248,239,0.92)]">
                <button
                  type="button"
                  className="absolute top-[0.85rem] right-[0.85rem] z-[1] inline-flex items-center justify-center min-w-[2.35rem] min-h-[2.35rem] p-[0.35rem] mb-[0.6rem] rounded-full bg-[#db8e95] text-white leading-none hover:bg-[#d27d85] [&_svg]:w-4 [&_svg]:h-4"
                  aria-label={`Notiz ${note.title} löschen`}
                  onClick={() => void onDeleteNote(note.id)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className="appearance-none grid gap-3 w-full p-4 border-none bg-transparent text-left cursor-pointer pt-[1.2rem] pr-[4.3rem] max-[560px]:pt-[1.35rem] max-[560px]:pr-[4.75rem]"
                  onClick={() => onOpenNote(note.id)}
                  aria-label={`Notiz ${note.title} öffnen`}
                >
                  <h4 className="m-0 pt-0 pr-0 [overflow-wrap:anywhere] break-words hyphens-auto line-clamp-2">{note.title}</h4>
                  <p className="m-0 leading-[1.6] [overflow-wrap:anywhere] break-words hyphens-auto line-clamp-5">{note.text}</p>
                </button>
              </article>
            )) : null}
            {notes.length === 0 ? <p className="py-3 text-[rgba(24,52,47,0.55)] italic border-none list-none">Keine Notizen vorhanden</p> : null}
          </div>
        </AppCard>
      </div>
    </section>
  );
}