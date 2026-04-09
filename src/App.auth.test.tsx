import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  acceptPendingFamilyInvite,
  fetchRegistrationGate,
  createFamilyInvite,
  deleteDocument,
  deleteFamily,
  deleteFamilyMemberAccount,
  deleteCurrentAccount,
  emitAuthChange,
  ensureProfile,
  fetchAdminFamilyDirectory,
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
  updateFamilyRegistrationSetting,
  updatePassword,
} = vi.hoisted(() => {
  let authChangeListener: ((session: unknown) => void) | null = null;

  return {
    acceptPendingFamilyInvite: vi.fn(),
    fetchRegistrationGate: vi.fn(),
    createFamilyInvite: vi.fn(),
    deleteDocument: vi.fn(),
    deleteFamily: vi.fn(),
    deleteFamilyMemberAccount: vi.fn(),
    deleteCurrentAccount: vi.fn(),
    emitAuthChange: (session: unknown) => authChangeListener?.(session),
    ensureProfile: vi.fn(),
    fetchAdminFamilyDirectory: vi.fn(),
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
    updateFamilyRegistrationSetting: vi.fn(),
    updatePassword: vi.fn(),
  };
});

vi.mock('./lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('./lib/supabase')>('./lib/supabase');

  return {
    ...actual,
    supabaseConfigured: true,
    acceptPendingFamilyInvite,
    fetchRegistrationGate,
    createFamilyInvite,
    deleteDocument,
    deleteFamily,
    deleteFamilyMemberAccount,
    deleteCurrentAccount,
    ensureProfile,
    fetchAdminFamilyDirectory,
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
    updateFamilyRegistrationSetting,
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

function getConfigCardElement() {
  const configHeading = screen.getByRole('heading', { level: 4, name: 'Registrierungeinstellung' });
  const configCard = configHeading.closest('article');

  if (!configCard) {
    throw new Error('Die Karte Registrierungeinstellung wurde nicht gefunden.');
  }

  return configCard as HTMLElement;
}

function getConfigCard() {
  const configCard = getConfigCardElement();

  return within(configCard);
}

function getAdminDirectoryCard() {
  const directoryHeading = screen.getByRole('heading', { level: 4, name: 'Alle Familien' });
  const directoryCard = directoryHeading.closest('article');

  if (!directoryCard) {
    throw new Error('Die Karte Alle Familien wurde nicht gefunden.');
  }

  return within(directoryCard as HTMLElement);
}

describe('App auth flow', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    acceptPendingFamilyInvite.mockReset();
    fetchRegistrationGate.mockReset();
    createFamilyInvite.mockReset();
    deleteDocument.mockReset();
    deleteFamily.mockReset();
    deleteFamilyMemberAccount.mockReset();
    ensureProfile.mockReset();
    fetchAdminFamilyDirectory.mockReset();
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
    updateFamilyRegistrationSetting.mockReset();
    updatePassword.mockReset();

    getCurrentSession.mockResolvedValue(null);
    fetchShoppingItems.mockResolvedValue([]);
    fetchTasks.mockResolvedValue([]);
    fetchNotes.mockResolvedValue([]);
    fetchCalendarEntries.mockResolvedValue([]);
    fetchMeals.mockResolvedValue([]);
    fetchDocuments.mockResolvedValue([]);
    fetchAdminFamilyDirectory.mockResolvedValue([]);
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
    deleteFamily.mockResolvedValue(undefined);
    deleteFamilyMemberAccount.mockResolvedValue(undefined);
    deleteCurrentAccount.mockResolvedValue(undefined);
    removeFamilyInvite.mockResolvedValue(undefined);
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    fetchRegistrationGate.mockResolvedValue({
      allowed: true,
      hasPendingInvite: false,
      hasOpenRegistration: true,
      hasExistingFamilies: true,
    });
    updateFamilyRegistrationSetting.mockImplementation(async (_familyId: string, allowOpenRegistration: boolean) => ({
      familyId: 'family-default',
      familyName: 'Familie Test',
      role: 'admin',
      allowOpenRegistration,
    }));
    updatePassword.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
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
      name: 'Frey Frey',
    });

    const brandImage = container.querySelector('.brand-lockup-auth .brand-mark-image');

    expect(brandImage).not.toBeNull();
    expect(brandImage?.getAttribute('src')).toBe('/freyLogo.svg');
    expect(screen.queryByText('Supabase Auth')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Melde dich an oder registriere dich. Danach legst du deine Familie an und nutzt die App als `admin` oder `familyuser`.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Gemeinsame Familienfreigabe')).not.toBeInTheDocument();
    expect(screen.queryByText('Rollen mit `admin` und `familyuser`')).not.toBeInTheDocument();
    expect(screen.queryByText('Vorbereitung für Cloud-Sync und Android')).not.toBeInTheDocument();

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

  it(
    'renders auth feedback as dismissible toasts and removes them after five seconds',
    async () => {
      const user = userEvent.setup();
      signUpWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(<App />);

      await screen.findByRole('heading', {
        level: 1,
        name: 'Frey Frey',
      });

      await user.click(screen.getByRole('button', { name: 'Registrieren' }));
      await user.type(screen.getByPlaceholderText('Anzeigename'), 'Alex');
      await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
      await user.type(screen.getByPlaceholderText('Passwort'), 'supersecret');
      await user.click(screen.getByRole('button', { name: 'Konto anlegen' }));

      const toastMessage = 'Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.';
      expect(await screen.findByText(toastMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hinweis schliessen' })).toBeInTheDocument();

      await new Promise((resolve) => window.setTimeout(resolve, 5200));

      await waitFor(() => {
        expect(screen.queryByText(toastMessage)).not.toBeInTheDocument();
      });
    },
    10000,
  );

  it('lets the user close a toast manually', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.click(screen.getByRole('button', { name: 'Passwort vergessen?' }));
    await user.click(screen.getByRole('button', { name: 'Reset-Link senden' }));

    const toastMessage = 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.';
    expect(await screen.findByText(toastMessage)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hinweis schliessen' }));

    await waitFor(() => {
      expect(screen.queryByText(toastMessage)).not.toBeInTheDocument();
    });
  });

  it('shows a branded loading overlay while the auth session is hydrating', () => {
    getCurrentSession.mockImplementation(() => new Promise(() => undefined));

    const { container } = render(<App />);

    expect(screen.getByRole('status', { name: 'Lädt deine Familiendaten' })).toBeInTheDocument();
    expect(container.querySelector('.brand-mark-loader .brand-mark-image')).not.toBeNull();
    expect(container.querySelector('.auth-loader-ring-outer')).not.toBeNull();
    expect(container.querySelector('.auth-loader-ring-inner')).not.toBeNull();
  });

  it('blocks sign-up when registration is restricted to invitations', async () => {
    const user = userEvent.setup();

    fetchRegistrationGate.mockResolvedValue({
      allowed: false,
      hasPendingInvite: false,
      hasOpenRegistration: false,
      hasExistingFamilies: true,
    });

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    await user.click(screen.getByRole('button', { name: 'Registrieren' }));
    expect(
      await screen.findByText('Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Neue Konten sind nur per Einladung moeglich.'),
    ).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Anzeigename'), 'Alex');
    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.type(screen.getByPlaceholderText('Passwort'), 'supersecret');
    await user.click(screen.getByRole('button', { name: 'Konto anlegen' }));

    expect(fetchRegistrationGate).toHaveBeenCalledWith('alex@example.com');
    expect(signUpWithPassword).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Bitte lass dir eine Einladung schicken.'),
    ).toBeInTheDocument();
  });

  it('requests a password reset email from the sign-in screen', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    await user.type(screen.getByPlaceholderText('E-Mail'), 'alex@example.com');
    await user.click(screen.getByRole('button', { name: 'Passwort vergessen?' }));
    await user.click(screen.getByRole('button', { name: 'Reset-Link senden' }));

    expect(resetPasswordForEmail).toHaveBeenCalledWith('alex@example.com');
    expect(
      await screen.findByText('Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.'),
    ).toBeInTheDocument();
  });

  it('renders auth inputs empty with autofill decoys present', async () => {
    const user = userEvent.setup();

    const { container } = render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    const emailInput = screen.getByPlaceholderText('E-Mail');
    const passwordInput = screen.getByPlaceholderText('Passwort');

    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
    expect(container.querySelector('.auth-autofill-decoys')).not.toBeNull();
    expect(emailInput).toHaveAttribute('name', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'username');
    expect(passwordInput).toHaveAttribute('name', 'frey-secret-key');
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');

    await user.click(emailInput);
    await user.type(emailInput, 'alex@example.com');
    await user.click(passwordInput);
    await user.type(passwordInput, 'supersecret');

    expect(emailInput).toHaveValue('alex@example.com');
    expect(passwordInput).toHaveValue('supersecret');
  });

  it('keeps browser email suggestions available in sign-up mode', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    await user.click(screen.getByRole('button', { name: 'Registrieren' }));

    const emailInput = screen.getByPlaceholderText('E-Mail');
    const authForm = emailInput.closest('form');

    expect(authForm).not.toBeNull();
    expect(authForm).toHaveAttribute('autocomplete', 'on');
    expect(emailInput).toHaveAttribute('name', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });

  it('toggles the auth password field visibility from the eye button', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
    });

    const passwordInput = screen.getByPlaceholderText('Passwort');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Passwort anzeigen' }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Passwort verbergen' }));

    expect(passwordInput).toHaveAttribute('type', 'password');
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
      name: 'Frey Frey',
    });

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
      isOwner: false,
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
      name: 'Frey Frey',
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
    expect(getAccountCard().getByText('Familie: Familie Test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einstellungen' })).toBeInTheDocument();
  });

  it('does not show a generic sync success toast after family data has loaded', async () => {
    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-sync',
        email: 'alex@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-sync',
      display_name: 'Alex',
      email: 'alex@example.com',
      role: 'familyuser',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-sync',
      familyName: 'Familie Sync',
      role: 'familyuser',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-sync',
        name: 'Alex',
        email: 'alex@example.com',
        role: 'familyuser',
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await waitFor(() => expect(fetchFamilyInvites).toHaveBeenCalledWith('family-sync'));
    expect(screen.queryByText('Alle Planer-Daten sind synchronisiert.')).not.toBeInTheDocument();
  });

  it('lets family owners invite members without seeing the configuration card', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-family-1',
        email: 'mia@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-family-1',
      display_name: 'Mia',
      email: 'mia@example.com',
      role: 'familyuser',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-1',
      familyName: 'Familie Test',
      role: 'familyuser',
      allowOpenRegistration: false,
      isOwner: true,
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-admin',
        name: 'Kubi',
        email: 'admin@example.com',
        role: 'admin',
      },
      {
        id: 'user-family-1',
        name: 'Mia',
        email: 'mia@example.com',
        role: 'familyuser',
      },
    ]);
    fetchFamilyInvites.mockResolvedValue([
      {
        id: 'invite-owner-1',
        familyId: 'family-1',
        email: 'open@example.com',
        role: 'familyuser',
        createdAt: '2026-04-06T10:00:00.000Z',
        acceptedAt: null,
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Familienmitglieder' })).toBeInTheDocument();
    expect(getAccountCard().getByText('Familiengründer')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: 'Registrierungeinstellung' })).not.toBeInTheDocument();
    expect(getInviteForm().queryByRole('combobox', { name: 'Familie fuer Einladung' })).not.toBeInTheDocument();
    expect(getInviteForm().getByRole('button', { name: 'Einladung senden' })).toBeEnabled();
    expect(getInviteForm().queryByRole('option', { name: 'admin' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Familiengründer').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Einladung für open@example.com zurückziehen' }));

    expect(removeFamilyInvite).toHaveBeenCalledWith('invite-owner-1');
    expect(await screen.findByText('Einladung wurde zurückgezogen.')).toBeInTheDocument();
    expect(screen.queryByText('open@example.com')).not.toBeInTheDocument();
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
    expect(getAccountCard().getByText('Familie: Familie Erfolg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einstellungen' })).toBeInTheDocument();
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
    fetchAdminFamilyDirectory.mockResolvedValue([
      {
        familyId: 'family-3',
        familyName: 'Familie Admin',
        allowOpenRegistration: true,
        ownerUserId: 'user-3',
        members: [
          {
            id: 'user-3',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin',
            isOwner: true,
          },
        ],
      },
      {
        familyId: 'family-4',
        familyName: 'Familie Zweig',
        allowOpenRegistration: false,
        ownerUserId: 'user-zweig-owner',
        members: [
          {
            id: 'user-zweig-owner',
            name: 'Lea Zweig',
            email: 'lea@example.com',
            role: 'familyuser',
            isOwner: true,
          },
          {
            id: 'user-zweig-member',
            name: 'Tom Zweig',
            email: 'tom@example.com',
            role: 'familyuser',
            isOwner: false,
          },
        ],
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();

    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Familienmitglieder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einladung senden' })).toBeInTheDocument();
    expect(getInviteForm().getByRole('combobox', { name: 'Familie fuer Einladung' })).toBeInTheDocument();
    expect(screen.queryByText('Keine offenen Einladungen')).not.toBeInTheDocument();
    expect(getConfigCard().getByRole('checkbox', { name: 'Freie Registrierung erlauben' })).toHaveClass('app-switch');

    const settingsLayout = screen.getByRole('heading', { level: 4, name: 'Familienmitglieder' }).closest('.family-settings-layout');
    const inviteForm = screen.getByRole('heading', { level: 4, name: 'Familienmitglied einladen' }).closest('form');
    const configCard = getConfigCardElement();

    expect(settingsLayout).not.toBeNull();
    expect(inviteForm?.parentElement).toBe(settingsLayout);
    expect(configCard.parentElement).toBe(settingsLayout);

    const directoryCard = getAdminDirectoryCard();
    const familySwitcherButtons = directoryCard
      .getAllByRole('button')
      .filter((button) => button.classList.contains('family-directory-button'));

    expect(familySwitcherButtons).toHaveLength(2);
    expect(familySwitcherButtons[0]).toHaveTextContent('Familie Admin');
    expect(familySwitcherButtons[1]).toHaveTextContent('Familie Zweig');
    expect(directoryCard.getByText('admin@example.com')).toBeInTheDocument();

    await user.click(familySwitcherButtons[1]);

    expect(directoryCard.getByText('lea@example.com')).toBeInTheDocument();
    expect(directoryCard.getByText('tom@example.com')).toBeInTheDocument();
    expect(directoryCard.queryByText('admin@example.com')).not.toBeInTheDocument();
  });

  it('lets admins delete a family member account from the all-families card', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-admin-delete',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-admin-delete',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-10',
      familyName: 'Familie Kern',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-admin-delete',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    fetchAdminFamilyDirectory.mockResolvedValue([
      {
        familyId: 'family-10',
        familyName: 'Familie Kern',
        allowOpenRegistration: true,
        ownerUserId: 'user-admin-delete',
        members: [
          {
            id: 'user-admin-delete',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin',
            isOwner: true,
          },
        ],
      },
      {
        familyId: 'family-11',
        familyName: 'Familie Zweig',
        allowOpenRegistration: false,
        ownerUserId: 'user-zweig-owner',
        members: [
          {
            id: 'user-zweig-owner',
            name: 'Lea Zweig',
            email: 'lea@example.com',
            role: 'familyuser',
            isOwner: true,
          },
          {
            id: 'user-zweig-member',
            name: 'Tom Zweig',
            email: 'tom@example.com',
            role: 'familyuser',
            isOwner: false,
          },
        ],
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    const directoryCard = getAdminDirectoryCard();

    await user.click(directoryCard.getByRole('button', { name: /Familie Zweig/i }));
    await user.click(
      directoryCard.getByRole('button', {
        name: 'Mitglied tom@example.com aus Familie Zweig löschen',
      }),
    );

    const deleteDialog = screen.getByRole('dialog');

    expect(within(deleteDialog).getByText(/Tom Zweig wird aus Familie Zweig entfernt/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mitglied endgültig löschen' }));

    expect(deleteFamilyMemberAccount).toHaveBeenCalledWith('family-11', 'user-zweig-member');
    expect(await screen.findByText('Tom Zweig wurde inklusive Konto gelöscht.')).toBeInTheDocument();
    expect(directoryCard.queryByText('tom@example.com')).not.toBeInTheDocument();
  });

  it('lets admins delete a family from the all-families card', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-admin-family-delete',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-admin-family-delete',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-20',
      familyName: 'Familie Kern',
      role: 'admin',
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-admin-family-delete',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    fetchAdminFamilyDirectory.mockResolvedValue([
      {
        familyId: 'family-20',
        familyName: 'Familie Kern',
        allowOpenRegistration: true,
        ownerUserId: 'user-admin-family-delete',
        members: [
          {
            id: 'user-admin-family-delete',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin',
            isOwner: true,
          },
        ],
      },
      {
        familyId: 'family-21',
        familyName: 'Familie Archiv',
        allowOpenRegistration: false,
        ownerUserId: 'user-archiv-owner',
        members: [
          {
            id: 'user-archiv-owner',
            name: 'Lea Archiv',
            email: 'lea.archiv@example.com',
            role: 'familyuser',
            isOwner: true,
          },
        ],
      },
    ]);

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    const directoryCard = getAdminDirectoryCard();

    await user.click(directoryCard.getByRole('button', { name: /Familie Archiv/i }));
    await user.click(
      directoryCard.getByRole('button', {
        name: 'Familie Familie Archiv löschen',
      }),
    );

    const deleteDialog = screen.getByRole('dialog');

    expect(within(deleteDialog).getByText(/Familie Archiv mit 1 Mitgliedern/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Familie endgültig löschen' }));

    expect(deleteFamily).toHaveBeenCalledWith('family-21');
    expect(await screen.findByText('Die Familie Familie Archiv wurde gelöscht.')).toBeInTheDocument();
    expect(directoryCard.queryByRole('button', { name: /Familie Archiv/i })).not.toBeInTheDocument();
  });

  it('lets admins switch registration between open and invite-only in the configuration card', async () => {
    const user = userEvent.setup();

    getCurrentSession.mockResolvedValue({
      user: {
        id: 'user-config',
        email: 'admin@example.com',
        user_metadata: {},
      },
    });
    ensureProfile.mockResolvedValue({
      id: 'user-config',
      display_name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    fetchFamilyContext.mockResolvedValue({
      familyId: 'family-config',
      familyName: 'Familie Konfig',
      role: 'admin',
      allowOpenRegistration: true,
    });
    fetchFamilyMembers.mockResolvedValue([
      {
        id: 'user-config',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    ]);
    updateFamilyRegistrationSetting
      .mockResolvedValueOnce({
        familyId: 'family-config',
        familyName: 'Familie Konfig',
        role: 'admin',
        allowOpenRegistration: false,
      })
      .mockResolvedValueOnce({
        familyId: 'family-config',
        familyName: 'Familie Konfig',
        role: 'admin',
        allowOpenRegistration: true,
      });

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    const configCard = getConfigCard();
    const toggle = configCard.getByRole('checkbox', { name: 'Freie Registrierung erlauben' });

    expect(toggle).toBeChecked();
    expect(configCard.getByText('Neue Nutzer koennen sich aktuell auch ohne Einladung registrieren.')).toBeInTheDocument();

    await user.click(toggle);

    expect(updateFamilyRegistrationSetting).toHaveBeenNthCalledWith(1, 'family-config', false);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(await screen.findByText('Freie Registrierung wurde deaktiviert.')).toBeInTheDocument();
    expect(configCard.queryByText('Neue Nutzer koennen sich aktuell nur per Einladung registrieren.')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(updateFamilyRegistrationSetting).toHaveBeenNthCalledWith(2, 'family-config', true);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(await screen.findByText('Freie Registrierung wurde aktiviert.')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));
    await user.click(screen.getByRole('button', { name: 'Account löschen' }));

    const deleteDialog = screen.getByRole('dialog');

    expect(deleteDialog).toBeInTheDocument();
    expect(within(deleteDialog).queryByText('Account löschen')).not.toBeInTheDocument();
    expect(screen.getByText('Bist du sicher?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(deleteCurrentAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Account löschen' }));
    await user.click(screen.getByRole('button', { name: 'Ja, Account löschen' }));

    expect(deleteCurrentAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', {
      level: 1,
      name: 'Frey Frey',
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
    fetchAdminFamilyDirectory.mockResolvedValue([
      {
        familyId: 'family-4',
        familyName: 'Familie Mail',
        allowOpenRegistration: true,
        ownerUserId: 'user-4',
        members: [
          {
            id: 'user-4',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin',
            isOwner: true,
          },
        ],
      },
      {
        familyId: 'family-9',
        familyName: 'Familie Nord',
        allowOpenRegistration: false,
        ownerUserId: 'user-9',
        members: [
          {
            id: 'user-9',
            name: 'Lea Nord',
            email: 'lea.nord@example.com',
            role: 'familyuser',
            isOwner: true,
          },
        ],
      },
    ]);
    createFamilyInvite.mockResolvedValue({
      invite: {
        id: 'invite-42',
        familyId: 'family-9',
        email: 'new@example.com',
        role: 'familyuser',
        createdAt: '2026-04-04T10:00:00.000Z',
        acceptedAt: null,
      },
      emailSent: true,
    });

    render(<App />);

    await expectPlannerShellHeading();
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    const inviteForm = getInviteForm();

    await user.selectOptions(
      inviteForm.getByRole('combobox', { name: 'Familie fuer Einladung' }),
      'family-9',
    );
    await user.type(inviteForm.getByPlaceholderText('E-Mail'), 'new@example.com');
    await user.selectOptions(inviteForm.getByRole('combobox', { name: 'Rolle fuer Einladung' }), 'familyuser');
    await user.click(inviteForm.getByRole('button', { name: 'Einladung senden' }));

    expect(createFamilyInvite).toHaveBeenCalledWith(
      'family-9',
      'new@example.com',
      'familyuser',
    );
    expect(await screen.findByText('Einladung fuer Familie Nord wurde gespeichert und per E-Mail verschickt.')).toBeInTheDocument();
    expect(screen.queryByText('new@example.com')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));
    await user.click(screen.getByRole('button', { name: 'Einladung für open@example.com zurückziehen' }));

    expect(removeFamilyInvite).toHaveBeenCalledWith('invite-open');
    expect(await screen.findByText('Einladung wurde zurückgezogen.')).toBeInTheDocument();
    expect(screen.queryByText('open@example.com')).not.toBeInTheDocument();
  });

  it('keeps document deletion feedback visible as a global toast across modules', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Einstellungen' }));

    expect(screen.getByRole('heading', { level: 4, name: 'Familienmitglieder' })).toBeInTheDocument();
    expect(screen.getByText('Dokument wurde gelöscht.')).toBeInTheDocument();
  });
});