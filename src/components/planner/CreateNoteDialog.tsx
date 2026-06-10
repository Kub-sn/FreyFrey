import type { FormEvent } from 'react';
import { AppButton } from '../ui/AppButton';
import { appInputClassName } from '../ui/AppField';
import { FieldError } from './FieldError';
import { ModalDialog } from './ModalDialog';
import { NoteRichTextEditor } from './NoteRichTextEditor';

export function CreateNoteDialog({
  draft,
  errorMessage,
  onClose,
  onFieldChange,
  onSave,
}: {
  draft: {
    title: string;
    text: string;
  };
  errorMessage?: string;
  onClose: () => void;
  onFieldChange: (field: 'title' | 'text', value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <ModalDialog
      id="note-create-title"
      title="Neue Notiz"
      eyebrow="Notiz"
      className="w-[min(760px,100%)]"
      actions={(
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </AppButton>
          <AppButton type="submit" form="note-create-form" variant="primary">
            Notiz speichern
          </AppButton>
        </>
      )}
    >
      <form id="note-create-form" className="dialog-form form-panel grid min-w-0 gap-[0.8rem]" onSubmit={(event) => void onSave(event)}>
        <input
          className={appInputClassName()}
          aria-label="Notiztitel"
          placeholder="Titel"
          value={draft.title}
          onChange={(event) => onFieldChange('title', event.currentTarget.value)}
        />
        <NoteRichTextEditor
          aria-label="Notizinhalt"
          placeholder="Inhalt"
          value={draft.text}
          invalid={Boolean(errorMessage)}
          describedBy={errorMessage ? 'text-error' : undefined}
          onChange={(value) => onFieldChange('text', value)}
        />
        <FieldError fieldName="text" message={errorMessage} />
      </form>
    </ModalDialog>
  );
}