import { describe, expect, it } from 'vitest';
import {
  getNoteDisplayHtml,
  getNoteEditorHtml,
  getNotePreviewText,
  isRichTextNoteContent,
  serializeNoteRichText,
} from './noteRichText';

describe('noteRichText helpers', () => {
  it('keeps plain text readable for the editor and display view', () => {
    const noteText = 'Erste Zeile\nZweite Zeile';

    expect(isRichTextNoteContent(noteText)).toBe(false);
    expect(getNoteEditorHtml(noteText)).toBe('<div>Erste Zeile</div><div>Zweite Zeile</div>');
    expect(getNoteDisplayHtml(noteText)).toBe('<div>Erste Zeile</div><div>Zweite Zeile</div>');
  });

  it('wraps sanitized rich text in the storage marker', () => {
    const serialized = serializeNoteRichText('<div><strong>Wichtig</strong><script>alert(1)</script></div>');

    expect(serialized).toContain('data-note-rich-text="true"');
    expect(serialized).toContain('<strong>Wichtig</strong>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).not.toContain('alert(1)');
  });

  it('drops disallowed attributes but preserves checklist semantics', () => {
    const serialized = serializeNoteRichText('<ul data-list-type="checklist" class="x"><li data-checked="true" style="color:red">Milch</li></ul>');

    expect(serialized).toContain('<ul data-list-type="checklist">');
    expect(serialized).toContain('<li data-checked="true">Milch</li>');
    expect(serialized).not.toContain('style=');
    expect(serialized).not.toContain('class=');
  });

  it('converts stored rich text back to editor html', () => {
    const storedNote = '<div data-note-rich-text="true"><div><strong>Packen</strong></div><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul></div>';

    expect(getNoteEditorHtml(storedNote)).toBe('<div><strong>Packen</strong></div><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul>');
    expect(getNoteDisplayHtml(storedNote)).toBe('<div><strong>Packen</strong></div><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul>');
  });

  it('builds a readable plain-text preview from rich text', () => {
    const storedNote = '<div data-note-rich-text="true"><div>Heute</div><ol><li>Brot</li><li>Milch</li></ol><ul data-list-type="checklist"><li data-checked="true">Turnbeutel</li></ul></div>';

    expect(getNotePreviewText(storedNote)).toBe('Heute 1. Brot 2. Milch ☑ Turnbeutel');
  });
});