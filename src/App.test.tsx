import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('./lib/supabase')>('./lib/supabase');

  return {
    ...actual,
    supabaseConfigured: false,
    getCurrentSession: async () => null,
    subscribeToAuthChanges: () => () => undefined,
  };
});

import App from './App';

function getRichTextEditor(container: HTMLElement) {
  const editor = within(container).getAllByRole('textbox').find((element) => element.classList.contains('note-rich-text-surface'));
  if (!editor) {
    throw new Error('Rich text editor not found');
  }

  return editor;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

async function openDocumentsModule(user: ReturnType<typeof userEvent.setup>) {
  const moduleNav = screen.getByRole('navigation', { name: 'Module' });

  await user.click(within(moduleNav).getByRole('button', { name: 'Dokumente' }));
}

function getDocumentForm() {
  const heading = screen.getByRole('heading', { level: 4, name: 'Dokument erfassen' });
  const form = heading.closest('form');

  if (!form) {
    throw new Error('Dokumentformular wurde nicht gefunden.');
  }

  return within(form);
}

function getVisibleModuleButton(name: string | RegExp) {
  const button = screen.getAllByRole('button', { name }).find((candidate) => (
    candidate.closest('section')?.classList.contains('is-visible')
  ));

  if (!button) {
    throw new Error(`Visible module button not found: ${String(name)}`);
  }

  return button;
}

function createDocumentFile(name: string, type: string, content = 'datei-inhalt') {
  return new File([content], name, { type });
}

async function addLocalDocument(user: ReturnType<typeof userEvent.setup>, file: File) {
  const heading = screen.getByRole('heading', { level: 4, name: 'Dokument erfassen' });
  const form = heading.closest('form');

  if (!form) {
    throw new Error('Dokumentformular wurde nicht gefunden.');
  }

  const fileInput = form.querySelector<HTMLInputElement>('input[type="file"][name="file"]');

  if (!fileInput) {
    throw new Error('Datei-Input wurde nicht gefunden.');
  }

  await user.upload(fileInput, file);
  await user.click(within(form).getByRole('button', { name: 'Dokument speichern' }));
}

describe('App', () => {
  it('renders the family planner shell in demo mode', () => {
    const { container } = render(<App />);

    const overviewSection = container.querySelector('.overview-stack');
    const plannerHeadings = screen.getAllByRole('heading', { level: 1, name: 'Frey Frey' });
    const demoModeBadges = screen.getAllByText('Demo-Modus');
    const brandImages = Array.from(container.querySelectorAll('.brand-mark img'));

    expect(plannerHeadings).toHaveLength(2);
    expect(demoModeBadges).toHaveLength(1);
    expect(brandImages).toHaveLength(2);
    expect(brandImages.every((image) => image.getAttribute('src') === '/freyLogo.svg')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).not.toBeInTheDocument();
    expect(overviewSection).not.toBeNull();
    expect(within(overviewSection as HTMLElement).getByRole('heading', { level: 3, name: 'To-dos' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Auth-Status' })).not.toBeInTheDocument();
  });

  it('allows switching to the shopping list module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Einkauf' }));

    expect(getVisibleModuleButton('Liste erstellen')).toBeInTheDocument();
    await user.click(getVisibleModuleButton('Liste erstellen'));

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('heading', { level: 3, name: 'Neue Einkaufsliste' })).toBeInTheDocument();
    await user.type(within(dialog).getByPlaceholderText('z. B. Wocheneinkauf'), 'Wocheneinkauf');
    await user.clear(within(dialog).getByLabelText('Datum'));
    await user.type(within(dialog).getByLabelText('Datum'), '2026-05-07');

    const quickAddInput = within(dialog).getByLabelText('Neuer Artikel');

    await user.type(quickAddInput, '2 Milch{Enter}');
    expect(quickAddInput).toHaveValue('');
    expect(quickAddInput).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Liste anlegen' }));

    await user.click(screen.getByText('Wocheneinkauf').closest('button') as HTMLButtonElement);

    expect(screen.getByRole('checkbox', { name: /Milch/i })).toHaveClass('app-checkbox', 'checkbox');
  });

  it('allows switching to the notes module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Notizen' }));

    const createButton = screen.getByRole('button', { name: 'Neue Notiz erstellen' });
    const notesModule = createButton.closest('section');

    expect(createButton).toBeInTheDocument();
    expect(notesModule).not.toBeNull();
    expect(within(notesModule as HTMLElement).queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
  });

  it('allows deleting a note from the notes overview', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Notizen' }));
    await user.click(screen.getByRole('button', { name: 'Neue Notiz erstellen' }));

    const dialog = screen.getByRole('dialog', { name: 'Neue Notiz' });

    await user.type(within(dialog).getByPlaceholderText('Titel'), 'Lösch mich');
    await user.type(getRichTextEditor(dialog), 'Diese Notiz wird direkt wieder entfernt.');
    await user.click(within(dialog).getByRole('button', { name: 'Notiz speichern' }));

    expect(screen.getByRole('button', { name: 'Notiz Lösch mich öffnen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Notiz Lösch mich löschen' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Löschen?' })).toBeInTheDocument();
    expect(screen.getByText('Notiz Lösch mich löschen?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notiz Lösch mich öffnen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(screen.queryByRole('button', { name: 'Notiz Lösch mich öffnen' })).not.toBeInTheDocument();
  });

  it('allows switching to the meals module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Essensplan' }));

    expect(screen.queryByRole('heading', { level: 4, name: 'Essenskalender' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 Wochen' })).toBeInTheDocument();
  });

  it('keeps the active planner module after a reload without router state', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Notizen' }));
    expect(screen.getByRole('button', { name: 'Neue Notiz erstellen' })).toBeInTheDocument();

    firstRender.unmount();
    const secondRender = render(<App />);

    const reloadedCreateButton = screen.getByRole('button', { name: 'Neue Notiz erstellen' });
    const reloadedNotesSection = reloadedCreateButton.closest('section');
    const reloadedOverviewSection = secondRender.container.querySelector('.overview-stack');

    expect(reloadedCreateButton).toBeInTheDocument();
    expect(reloadedNotesSection).toHaveClass('is-visible');
    expect(reloadedOverviewSection).not.toHaveClass('is-visible');
  });

  it('restores an unsaved note draft after a reload', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Notizen' }));
    await user.click(screen.getByRole('button', { name: 'Neue Notiz erstellen' }));

    const firstDialog = screen.getByRole('dialog', { name: 'Neue Notiz' });

    await user.type(within(firstDialog).getByPlaceholderText('Titel'), 'Einkaufsidee');
    await user.type(getRichTextEditor(firstDialog), 'Blaubeeren nicht vergessen');

    firstRender.unmount();
    render(<App />);

    const secondDialog = screen.getByRole('dialog', { name: 'Neue Notiz' });

    expect(screen.getByRole('button', { name: 'Neue Notiz erstellen' })).toBeInTheDocument();
    expect(within(secondDialog).getByDisplayValue('Einkaufsidee')).toBeInTheDocument();
    expect(getRichTextEditor(secondDialog)).toHaveTextContent('Blaubeeren nicht vergessen');
  });


  it('restores an unsaved shopping draft dialog after a reload', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Einkauf' }));
    await user.click(getVisibleModuleButton('Liste erstellen'));

    const firstDialog = screen.getByRole('dialog', { name: 'Neue Einkaufsliste' });
    await user.type(within(firstDialog).getByPlaceholderText('z. B. Wocheneinkauf'), 'Samstag');
    await user.type(within(firstDialog).getByLabelText('Neuer Artikel'), 'Hafermilch{Enter}');

    firstRender.unmount();
    render(<App />);

    const secondDialog = screen.getByRole('dialog', { name: 'Neue Einkaufsliste' });

    expect(within(secondDialog).getByDisplayValue('Samstag')).toBeInTheDocument();
    expect(within(secondDialog).getByDisplayValue('Hafermilch')).toBeInTheDocument();
  });

  it('creates a todo list and adds items with Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'To-dos' }));
    await user.click(getVisibleModuleButton('Liste erstellen'));

    const createDialog = screen.getByRole('dialog', { name: 'Neue Todo-Liste' });
    await user.type(within(createDialog).getByLabelText('Listenname'), 'Kinderzimmer');
    await user.click(within(createDialog).getByRole('button', { name: 'Liste erstellen' }));

    const dialog = screen.getByRole('dialog', { name: 'Kinderzimmer' });
    const quickAddInput = within(dialog).getByLabelText('Todo hinzufügen');

    await user.type(quickAddInput, 'Kinderzimmer aufräumen{Enter}');

    expect(quickAddInput).toHaveValue('');
    expect(quickAddInput).toHaveFocus();
    expect(within(dialog).getByRole('checkbox', { name: 'Kinderzimmer aufräumen' })).not.toBeChecked();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Kinderzimmer aufräumen' }));

    expect(within(dialog).getByRole('checkbox', { name: 'Kinderzimmer aufräumen' })).toBeChecked();
  });

  it('restores an unsaved meal draft dialog after a reload', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Essensplan' }));
    await user.click(screen.getAllByRole('button', { name: /Essensplan für .* öffnen/ })[0]);

    const firstDialog = screen.getByRole('dialog', { name: /Gerichte für .*/ });
    await user.type(within(firstDialog).getByPlaceholderText('Gerichtname'), 'Kartoffelsuppe');
    await user.type(within(firstDialog).getByPlaceholderText('Rezept'), 'Mit Lauch und Karotten');

    firstRender.unmount();
    render(<App />);

    const secondDialog = screen.getByRole('dialog', { name: /Gerichte für .*/ });

    expect(within(secondDialog).getByDisplayValue('Kartoffelsuppe')).toBeInTheDocument();
    expect(within(secondDialog).getByDisplayValue('Mit Lauch und Karotten')).toBeInTheDocument();
  });

  it('shows an upload-only document form in the documents module', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    const form = getDocumentForm();

    expect(screen.getByRole('heading', { level: 4, name: 'Dokument erfassen' })).toBeInTheDocument();
    expect(screen.getByText('Datei hochladen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dokument speichern' })).toBeInTheDocument();
    expect(form.queryByPlaceholderText('Dokument')).not.toBeInTheDocument();
    expect(form.queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    expect(form.queryByPlaceholderText('Status')).not.toBeInTheDocument();
    expect(form.queryByPlaceholderText('Link zum Dokument (optional)')).not.toBeInTheDocument();
    expect(screen.getByText(/Word-Dateien oder mehrere Dateien hier hineinziehen/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximal erlaubt sind 15 MB pro Datei/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Dokumente' })).not.toBeInTheDocument();
  });

  it('shows a visible error when a selected document exceeds the size limit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    const fileInput = document.querySelector('input[type="file"][name="file"]');
    const tooLargeFile = new File(['a'.repeat(16 * 1024 * 1024)], 'zu-gross.pdf', {
      type: 'application/pdf',
    });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, tooLargeFile);

    expect(
      screen.getByText('zu-gross.pdf ist zu groß. Maximal erlaubt sind 15 MB pro Datei.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dateiauswahl prüfen')).toBeInTheDocument();
  });

  it('allows removing a single selected file before upload', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    const fileInput = document.querySelector('input[type="file"][name="file"]');
    const firstFile = new File(['a'], 'eins.pdf', { type: 'application/pdf' });
    const secondFile = new File(['b'], 'zwei.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, [firstFile, secondFile]);

    expect(screen.getByText('2 Datei(en) ausgewählt')).toBeInTheDocument();
    expect(screen.getByText('eins.pdf')).toBeInTheDocument();
    expect(screen.getByText('zwei.docx')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Entfernen' })[0]);

    expect(screen.queryByText('eins.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('zwei.docx')).toBeInTheDocument();
    expect(screen.getByText('1 Datei(en) ausgewählt')).toBeInTheDocument();
  });

  it(
    'hides the document deletion feedback after five seconds',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await openDocumentsModule(user);

      await addLocalDocument(user, createDocumentFile('Löschprobe.pdf', 'application/pdf'));

      await user.click(screen.getByRole('button', { name: 'Dokument Löschprobe löschen' }));
      expect(screen.getByRole('heading', { level: 3, name: 'Löschen?' })).toBeInTheDocument();
      expect(screen.getByText('Dokument Löschprobe löschen?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Löschen' }));

      expect(screen.getByText('Dokument wurde gelöscht.')).toBeInTheDocument();

      await new Promise((resolve) => window.setTimeout(resolve, 5200));

      expect(screen.queryByText('Dokument wurde gelöscht.')).not.toBeInTheDocument();
    },
    10000,
  );

  it('filters and sorts documents in the documents module', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await openDocumentsModule(user);

    await addLocalDocument(user, createDocumentFile('Zebra Vertrag.pdf', 'application/pdf'));
    await addLocalDocument(user, createDocumentFile('Alpha Foto.jpg', 'image/jpeg'));
    await addLocalDocument(
      user,
      createDocumentFile(
        'Schulportal.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );

    await user.selectOptions(screen.getByLabelText('Dokumenttyp filtern'), 'pdf');

    expect(screen.getByText('Zebra Vertrag')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Foto')).not.toBeInTheDocument();
    expect(screen.queryByText('Schulportal')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Dokumenttyp filtern'), 'all');
    await user.selectOptions(screen.getByLabelText('Dokumente sortieren'), 'name');

    const orderedNames = Array.from(container.querySelectorAll('.document-grid li strong')).map((entry) =>
      entry.textContent?.trim(),
    );

    expect(orderedNames.slice(0, 3)).toEqual(['Alpha Foto', 'Schulportal', 'Zebra Vertrag']);
  });

  it('allows editing document metadata', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    await addLocalDocument(user, createDocumentFile('Arztbrief.pdf', 'application/pdf'));

    await user.click(screen.getByRole('button', { name: 'Dokument Arztbrief bearbeiten' }));

    await user.clear(screen.getByLabelText('Dokumentname bearbeiten'));
    await user.type(screen.getByLabelText('Dokumentname bearbeiten'), 'Arztbrief 2026');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    const updatedCard = screen
      .getByRole('button', { name: 'Dokument Arztbrief 2026 bearbeiten' })
      .closest('li');

    expect(screen.getByText('Arztbrief 2026')).toBeInTheDocument();
    expect(updatedCard).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Arztbrief' })).not.toBeInTheDocument();
  });

  it('opens an in-app preview modal for previewable documents', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    await addLocalDocument(user, createDocumentFile('Reisepass Scan.pdf', 'application/pdf'));

    await user.click(screen.getByRole('button', { name: 'Dokument Reisepass Scan in Vorschau öffnen' }));

    expect(screen.getByRole('dialog', { name: 'Reisepass Scan' })).toBeInTheDocument();
    expect(screen.getByTitle('PDF-Vorschau für Reisepass Scan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'In neuem Tab öffnen' })).toBeInTheDocument();
  });

  it('hides the generic Dokument label in the document meta line', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    await addLocalDocument(user, createDocumentFile('Versicherung PDF.pdf', 'application/pdf'));

    const documentCard = screen
      .getByRole('button', { name: 'Dokument Versicherung PDF bearbeiten' })
      .closest('li');

    expect(documentCard).not.toBeNull();
    expect(
      (documentCard as HTMLLIElement).querySelector('small')?.textContent?.trim(),
    ).toBe('PDF');
    expect(within(documentCard as HTMLLIElement).queryByText('Dokument · PDF')).not.toBeInTheDocument();
  });

  it('renders document actions in a stable primary-to-destructive order', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocumentsModule(user);

    await addLocalDocument(user, createDocumentFile('Urlaub Foto.jpg', 'image/jpeg'));

    const documentCard = screen
      .getByRole('button', { name: 'Dokument Urlaub Foto bearbeiten' })
      .closest('li');

    expect(documentCard).not.toBeNull();

    const actionLabels = Array.from(
      (documentCard as HTMLLIElement).querySelectorAll('a[href], button'),
    ).map((element) => element.textContent?.trim());

    expect(actionLabels).toEqual(['Datei öffnen', 'Vorschau', 'Bearbeiten', 'Löschen']);
  });
});
