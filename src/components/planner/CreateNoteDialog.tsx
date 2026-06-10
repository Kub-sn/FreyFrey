import type { FormEvent } from 'react';
import { AppButton } from '../ui/AppButton';
import { appInputClassName, appTextareaClassName } from '../ui/AppField';
import { FieldError } from './FieldError';
import { ModalDialog } from './ModalDialog';

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
        <textarea
          className={appTextareaClassName()}
          aria-label="Notizinhalt"
          placeholder="Inhalt"
          rows={12}
          value={draft.text}
          aria-invalid={errorMessage ? 'true' : undefined}
          aria-describedby={errorMessage ? 'text-error' : undefined}
          onChange={(event) => onFieldChange('text', event.currentTarget.value)}
        />
        <FieldError fieldName="text" message={errorMessage} />
      </form>
    </ModalDialog>
  );
}