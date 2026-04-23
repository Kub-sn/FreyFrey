import { Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';

export function NotesModule({
  activeTab,
  notes,
  onAddNote,
  onDeleteNote,
  onOpenNote,
}: {
  activeTab: string;
  notes: PlannerState['notes'];
  onAddNote: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNote: (noteId: string) => void;
}) {
  return (
    <section className={activeTab === 'notes' ? 'module is-visible' : 'module'}>
      <div className="module-layout notes-module-layout">
        <form className="panel form-panel notes-form-panel" onSubmit={(event) => void onAddNote(event)}>
          <h4>Neue Notiz</h4>
          <input name="title" placeholder="Titel" />
          <textarea name="text" placeholder="Inhalt" rows={5} />
          <button type="submit">Notiz speichern</button>
        </form>
        <article className="panel masonry-panel">
          <div className="notes-grid">
            {notes.length > 0 ? notes.map((note) => (
              <article key={note.id} className="note-card">
                <button
                  type="button"
                  className="secondary-action danger-action note-delete-button"
                  aria-label={`Notiz ${note.title} löschen`}
                  onClick={() => void onDeleteNote(note.id)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className="note-card-button note-open-button"
                  onClick={() => onOpenNote(note.id)}
                  aria-label={`Notiz ${note.title} öffnen`}
                >
                  <h4>{note.title}</h4>
                  <p>{note.text}</p>
                </button>
              </article>
            )) : null}
            {notes.length === 0 ? <p className="empty-state-text">Keine Notizen vorhanden</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}