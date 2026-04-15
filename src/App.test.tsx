import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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

function createDocumentFile(name: string, type: string, content = 'datei-inhalt') {
  return new File([content], name, { type });
}

function getCalendarForm() {
  const heading = screen.getByRole('heading', { level: 4, name: 'Termin anlegen' });
  const form = heading.closest('form');

  if (!form) {
    throw new Error('Kalenderformular wurde nicht gefunden.');
  }

  return within(form);
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
    const brandImages = Array.from(container.querySelectorAll('.brand-mark-image'));

    expect(plannerHeadings).toHaveLength(2);
    expect(demoModeBadges).toHaveLength(2);
    expect(brandImages).toHaveLength(2);
    expect(brandImages.every((image) => image.getAttribute('src') === '/freyLogo.svg')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).not.toBeInTheDocument();
    expect(overviewSection).not.toBeNull();
    expect(within(overviewSection as HTMLElement).getByRole('heading', { level: 3, name: 'To-dos' })).toBeInTheDocument();
    expect(within(overviewSection as HTMLElement).getByRole('heading', { level: 3, name: 'Kalender' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Auth-Status' })).not.toBeInTheDocument();
  });

  it('allows switching to the shopping list module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Einkauf' }));

    const heading = screen.getByRole('heading', { level: 4, name: 'Neuen Artikel hinzufügen' });
    const form = heading.closest('form');

    if (!form) {
      throw new Error('Einkaufsformular wurde nicht gefunden.');
    }

    const shoppingForm = within(form);

    expect(screen.getByRole('heading', { level: 4, name: 'Neuen Artikel hinzufügen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artikel speichern' })).toBeInTheDocument();
    expect(screen.queryByText('Milch')).not.toBeInTheDocument();

    await user.type(shoppingForm.getByPlaceholderText('Artikel'), 'Milch');
    await user.type(shoppingForm.getByPlaceholderText('Menge'), '2');
    await user.type(shoppingForm.getByPlaceholderText('Kategorie'), 'Kueche');
    await user.click(shoppingForm.getByRole('button', { name: 'Artikel speichern' }));

    expect(screen.getByRole('checkbox', { name: 'Milch' })).toHaveClass('app-switch');
  });

  it('allows switching to the notes module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Notizen' }));

    const notesHeading = screen.getByRole('heading', { level: 4, name: 'Neue Notiz' });
    const notesModule = notesHeading.closest('section');

    expect(notesHeading).toBeInTheDocument();
    expect(notesModule).not.toBeNull();
    expect(within(notesModule as HTMLElement).queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notiz speichern' })).toBeInTheDocument();
  });

  it('allows switching to the meals module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });

    await user.click(within(moduleNav).getByRole('button', { name: 'Essensplan' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Gericht eintragen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gericht speichern' })).toBeInTheDocument();
  });

  it('shows a navigable month view in the calendar module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const moduleNav = screen.getByRole('navigation', { name: 'Module' });
    await user.click(within(moduleNav).getByRole('button', { name: 'Kalender' }));

    const dateInput = screen.getByLabelText('Datum');
    const timeInput = screen.getByLabelText('Uhrzeit');
    const form = getCalendarForm();

    expect(screen.getByRole('button', { name: 'Heute' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Monatskalender' })).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(timeInput).toHaveAttribute('type', 'time');

    await user.type(form.getByPlaceholderText('Titel'), 'Laternenfest');
    await user.type(dateInput, toDateInputValue(new Date()));
    await user.type(timeInput, '18:30');
    await user.type(form.getByPlaceholderText('Ort'), 'Schulhof');
    await user.click(form.getByRole('button', { name: 'Termin speichern' }));

    expect(screen.getAllByText('Laternenfest').length).toBeGreaterThan(0);
    expect(screen.getByText('Schulhof')).toBeInTheDocument();
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
    await user.clear(screen.getByLabelText('Dokumentstatus bearbeiten'));
    await user.type(screen.getByLabelText('Dokumentstatus bearbeiten'), 'Aktuell');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    const updatedCard = screen
      .getByRole('button', { name: 'Dokument Arztbrief 2026 bearbeiten' })
      .closest('li');

    expect(screen.getByText('Arztbrief 2026')).toBeInTheDocument();
    expect(updatedCard).not.toBeNull();
    expect(
      (updatedCard as HTMLLIElement).querySelector('.document-meta-line')?.textContent,
    ).toContain('Aktuell');
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
      (documentCard as HTMLLIElement).querySelector('.document-meta-line')?.textContent?.trim(),
    ).toBe('PDF · Neu');
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
      (documentCard as HTMLLIElement).querySelectorAll('.document-actions a, .document-actions button'),
    ).map((element) => element.textContent?.trim());

    expect(actionLabels).toEqual(['Datei öffnen', 'Vorschau', 'Bearbeiten', 'Löschen']);
  });
});
