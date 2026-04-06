import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  acceptPendingFamilyInvite,
  createFamilyInvite,
  deleteDocument,
  deleteCurrentAccount,
  emitAuthChange,
  ensureProfile,
  fetchCalendarEntries,
  fetchDocuments,
  fetchFamilyContext,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMeals,
  fetchNotes,
  fetchShoppingItems,
  fetchTasks,
  getCurrentSession,
  removeFamilyInvite,
  resetPasswordForEmail,
  signInWithPassword,
  signUpWithPassword,
  subscribeToAuthChanges,
  updatePassword,
} = vi.hoisted(() => {
  let authChangeListener: ((session: unknown) => void) | null = null;

  return {
    acceptPendingFamilyInvite: vi.fn(),
    createFamilyInvite: vi.fn(),
    deleteDocument: vi.fn(),
    deleteCurrentAccount: vi.fn(),
    emitAuthChange: (session: unknown) => authChangeListener?.(session),
    ensureProfile: vi.fn(),
    fetchCalendarEntries: vi.fn(),
    fetchDocuments: vi.fn(),
    fetchFamilyContext: vi.fn(),
    fetchFamilyInvites: vi.fn(),
    fetchFamilyMembers: vi.fn(),
    fetchMeals: vi.fn(),
    fetchNotes: vi.fn(),
    fetchShoppingItems: vi.fn(),
    fetchTasks: vi.fn(),
    getCurrentSession: vi.fn(),
    removeFamilyInvite: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    subscribeToAuthChanges: (callback: (session: unknown) => void) => {
      authChangeListener = callback;

      return () => {
        authChangeListener = null;
      };
    },
    updatePassword: vi.fn(),
  };
});

vi.mock('./lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('./lib/supabase')>('./lib/supabase');

  return {
    ...actual,
    supabaseConfigured: true,
    acceptPendingFamilyInvite,
    createFamilyInvite,
    deleteDocument,
    deleteCurrentAccount,
    ensureProfile,
    fetchCalendarEntries,
    fetchDocuments,
    fetchFamilyContext,
    fetchFamilyInvites,
    fetchFamilyMembers,
    fetchMeals,
    fetchNotes,
    fetchShoppingItems,
    fetchTasks,
    getCurrentSession,
    removeFamilyInvite,
    resetPasswordForEmail,
    signInWithPassword,
    subscribeToAuthChanges,
    signUpWithPassword,
    updatePassword,
  };
});

import App from './App';

function getAccountCard() {
  const accountCard = document.querySelector('.sidebar .account-card') ?? document.querySelector('.mobile-account-card');

  if (!accountCard) {
    throw new Error('Konto-Card wurde nicht gefunden.');
  }

  return within(accountCard as HTMLElement);
}

async function expectPlannerShellHeading() {
  const headings = await screen.findAllByRole('heading', { level: 1, name: 'Frey Frey' });

  expect(headings.length).toBeGreaterThan(0);

  return headings;
}

function getInviteForm() {
  const inviteHeading = screen.getByRole('heading', { level: 4, name: 'Familienmitglied einladen' });
  const inviteForm = inviteHeading.closest('form');

  if (!inviteForm) {
    throw new Error('Einladungsformular wurde nicht gefunden.');
  }

  return within(inviteForm as HTMLElement);
}

describe('App auth flow', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    acceptPendingFamilyInvite.mockReset();
    createFamilyInvite.mockReset();
    deleteDocument.mockReset();
    ensureProfile.mockReset();
    fetchCalendarEntries.mockReset();
    fetchDocuments.mockReset();
    fetchFamilyContext.mockReset();
    fetchFamilyInvites.mockReset();
    fetchFamilyMembers.mockReset();
    fetchMeals.mockReset();
    fetchNotes.mockReset();
    fetchShoppingItems.mockReset();
    fetchTasks.mockReset();
    getCurrentSession.mockReset();
    removeFamilyInvite.mockReset();
    resetPasswordForEmail.mockReset();
    deleteCurrentAccount.mockReset();
    signInWithPassword.mockReset();
    signUpWithPassword.mockReset();
    updatePassword.mockReset();

    getCurrentSession.mockResolvedValue(null);
    fetchShoppingItems.mockResolvedValue([]);
    fetchTasks.mockResolvedValue([]);
    fetchNotes.mockResolvedValue([]);
    fetchCalendarEntries.mockResolvedValue([]);
    fetchMeals.mockResolvedValue([]);
    fetchDocuments.mockResolvedValue([]);
    fetchFamilyMembers.mockResolvedValue([]);
    fetchFamilyInvites.mockResolvedValue([]);
    createFamilyInvite.mockResolvedValue({
      invite: {
        id: 'invite-created',
        familyId: 'family-created',
        email: 'new@example.com',
        role: 'familyuser',
        createdAt: '2026-04-04T10:00:00.000Z',
        acceptedAt: null,
      },
      emailSent: true,
    });
    deleteDocument.mockResolvedValue(undefined);
    deleteCurrentAccount.mockResolvedValue(undefined);
    removeFamilyInvite.mockResolvedValue(undefined);
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    updatePassword.mockResolvedValue({ data: {}, error: null });
  });

  it('shows the confirmation message after sign-up without crashing on form reset', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { container } = render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey mit echten Benutzerkonten',
    });

    const brandImage = container.querySelector('.brand-lockup-auth .brand-mark-image');

    expect(brandImage).not.toBeNull();
    expect(brandImage?.getAttribute('src')).toBe('/freyLogo.svg');

    await user.click(screen.getByRole('button', { name: 'Registrieren' }));
    await user.type(screen.getByPlaceholderText('Anzeigename'), 'Alex');
    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.type(screen.getByPlaceholderText('Passwort'), 'supersecret');
    await user.click(screen.getByRole('button', { name: 'Konto anlegen' }));

    await screen.findByText(
      'Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.',
    );

    expect(signUpWithPassword).toHaveBeenCalledWith('alex@example.com', 'supersecret', 'Alex');
    expect(screen.queryByText(/can't access property "reset"/i)).not.toBeInTheDocument();
  });

  it('requests a password reset email from the sign-in screen', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey mit echten Benutzerkonten',
    });

    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.click(screen.getByRole('button', { name: 'Passwort vergessen?' }));
    await user.click(screen.getByRole('button', { name: 'Reset-Link senden' }));

    expect(resetPasswordForEmail).toHaveBeenCalledWith('alex@example.com');
    expect(
      await screen.findByText('Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.'),
    ).toBeInTheDocument();
  });

  it('lets the user set a new password from a recovery link', async () => {
    const user = userEvent.setup();

    window.history.replaceState({}, '', '/auth/reset-password#access_token=test-token&type=recovery');
    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-recovery',
        email: 'alex@example.com',
        user_metadata: {},
      },
    });

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey mit echten Benutzerkonten',
    });

    expect(screen.queryByRole('heading', { level: 1, name: 'Frey Frey' })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Neues Passwort'), 'supersecret2');
    await user.type(screen.getByPlaceholderText('Passwort wiederholen'), 'supersecret2');
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }));

    expect(updatePassword).toHaveBeenCalledWith('supersecret2');
    expect(await screen.findByText('Passwort erfolgreich aktualisiert.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('allows signing in normally after finishing the password reset flow', async () => {
    const user = userEvent.setup();

    window.history.replaceState({}, '', '/auth/reset-password#access_token=test-token&type=recovery');
    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-recovery',
        email: 'alex@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-recovery',
      display_name: 'Alex',
      email: 'alex@example.com',
      role: 'familyuser',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-1',
      familyName: 'Familie Test',
      role: 'familyuser',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-recovery',
        name: 'Alex',
        email: 'alex@example.com',
        role: 'familyuser',
      },
    ]);
    signInWithPassword.mockImplementation(async () => {
      emitAuthChange({
        user: {
          id: 'user-recovery',
          email: 'alex@example.com',
          user_metadata: {},
        },
      });

      return { data: {}, error: null };
    });

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey mit echten Benutzerkonten',
    });

    await user.type(screen.getByPlaceholderText('Neues Passwort'), 'supersecret2');
    await user.type(screen.getByPlaceholderText('Passwort wiederholen'), 'supersecret2');
    await user.click(screen.getByRole('button', { name: 'Passwort speichern' }));

    await screen.findByText('Passwort erfolgreich aktualisiert.');

    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.type(screen.getByPlaceholderText('Passwort'), 'supersecret2');
    await user.click(screen.getByRole('button', { name: 'Jetzt anmelden' }));

    expect(signInWithPassword).toHaveBeenCalledWith('alex@example.com', 'supersecret2');
    expect(await expectPlannerShellHeading()).toHaveLength(2);
  });

  it('accepts a pending invitation during session hydration', async () => {
    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'mia@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-1',
      display_name: 'Mia',
      email: 'mia@example.com',
      role: 'familyuser',
    });
    fetchFamilyContext
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        familyId: 'family-1',
        familyName: 'Familie Test',
        role: 'familyuser',
      });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-1',
        name: 'Mia',
        email: 'mia@example.com',
        role: 'familyuser',
      },
    ]);
    acceptPendingFamilyInvite.mockResolvedValue({ id: 'invite-1' });

    render(<App />);

    await expectPlannerShellHeading();

    expect(acceptPendingFamilyInvite).toHaveBeenCalledWith('user-1', 'mia@example.com');
    expect(getAccountCard().getByText('Familie Test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Familie & Rollen' })).not.toBeInTheDocument();
  });

  it('shows a success message after a signup confirmation redirect', async () => {
    window.history.replaceState({}, '', '/#access_token=test-token&type=signup');
    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-2',
        email: 'alex@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-2',
      display_name: 'Alex',
      email: 'alex@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-2',
      familyName: 'Familie Erfolg',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-2',
        name: 'Alex',
        email: 'alex@example.com',
        role: 'admin',
      },
    ]);

    render(<App />);

    await screen.findByText('E-Mail bestätigt. Du bist jetzt erfolgreich angemeldet.');
    expect(getAccountCard().getByText('Familie Erfolg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Familie & Rollen' })).toBeInTheDocument();
  });

  it('shows family management only as an admin-only navigation module', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-3',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-3',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-3',
      familyName: 'Familie Admin',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-3',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();

    await user.click(screen.getByRole('button', { name: 'Familie & Rollen' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Mitglieder & Rollen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einladung senden' })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting the account and returns to sign-in afterwards', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-3',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-3',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-3',
      familyName: 'Familie Admin',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-3',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();

    await user.click(getAccountCard().getByRole('button', { name: 'Account löschen' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bist du sicher?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(deleteCurrentAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(getAccountCard().getByRole('button', { name: 'Account löschen' }));
    await user.click(screen.getByRole('button', { name: 'Ja, Account löschen' }));

    expect(deleteCurrentAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey mit echten Benutzerkonten',
    })).toBeInTheDocument();
    expect(screen.getByText('Dein Konto wurde gelöscht.')).toBeInTheDocument();
  });

  it('sends an invitation email for admins and shows the success message', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-4',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-4',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-4',
      familyName: 'Familie Mail',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-4',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    createFamilyInvite.mockResolvedValue({
      invite: {
        id: 'invite-42',
        familyId: 'family-4',
        email: 'new@example.com',
        role: 'familyuser',
        createdAt: '2026-04-04T10:00:00.000Z',
        acceptedAt: null,
      },
      emailSent: true,
    });

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Familie & Rollen' }));

    const inviteForm = getInviteForm();

    await user.type(inviteForm.getByPlaceholderText('E-Mail'), 'new@example.com');
    await user.selectOptions(inviteForm.getByRole('combobox'), 'familyuser');
    await user.click(inviteForm.getByRole('button', { name: 'Einladung senden' }));

    expect(createFamilyInvite).toHaveBeenCalledWith(
      'family-4',
      'new@example.com',
      'familyuser',
      'user-4',
    );
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
    expect(screen.getByText('Wartet auf Registrierung oder nächsten Login')).toBeInTheDocument();
  });

  it('allows admins to withdraw a pending invitation', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-5',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-5',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-5',
      familyName: 'Familie Test',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-5',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    fetchFamilyInvites.mockResolvedValue([
      {
        id: 'invite-open',
        familyId: 'family-5',
        email: 'open@example.com',
        role: 'familyuser',
        createdAt: '2026-04-04T10:00:00.000Z',
        acceptedAt: null,
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Familie & Rollen' }));
    await user.click(screen.getByRole('button', { name: 'Einladung für open@example.com zurückziehen' }));

    expect(removeFamilyInvite).toHaveBeenCalledWith('invite-open');
    expect(await screen.findByText('Einladung wurde zurückgezogen.')).toBeInTheDocument();
    expect(screen.queryByText('open@example.com')).not.toBeInTheDocument();
  });

  it('keeps document deletion feedback inside the documents module', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-6',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-6',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-6',
      familyName: 'Familie Dokumente',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-6',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    fetchDocuments.mockResolvedValue([
      {
        id: 'document-1',
        name: 'Arztbrief',
        category: 'Gesundheit',
        status: 'Aktuell',
        linkUrl: 'https://example.com/arztbrief.pdf',
        filePath: '',
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Dokumente' }));
    await user.click(screen.getByRole('button', { name: 'Dokument Arztbrief löschen' }));

    expect(deleteDocument).toHaveBeenCalledWith('document-1', undefined);
    expect(screen.getByText('Dokument wurde gelöscht.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Familie & Rollen' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Mitglieder & Rollen' })).toBeInTheDocument();
    expect(screen.queryByText('Dokument wurde gelöscht.')).not.toBeInTheDocument();
  });
});