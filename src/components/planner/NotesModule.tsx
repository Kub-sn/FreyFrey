import type { FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';

export function NotesModule({
  activeTab,
  notes,
  onAddNote,
}: {
  activeTab: string;
  notes: PlannerState['notes'];
  onAddNote: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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
            {notes.map((note) => (
              <article key={note.id} className="note-card">
                <h4>{note.title}</h4>
                <p>{note.text}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}