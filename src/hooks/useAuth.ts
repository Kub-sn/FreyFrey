import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { humanizeAuthError } from '../lib/auth-errors';
import {
  clearAuthRedirectState,
  getAuthRedirectError,
  getAuthRedirectMessage,
  getAuthRedirectMode,
} from '../lib/auth-redirect';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../lib/storage';
import {
  acceptPendingFamilyInvite,
  bootstrapFamilyForUser,
  deleteCurrentAccount,
  deleteFamily as deleteFamilyRecord,
  deleteFamilyMemberAccount,
  ensureProfile,
  fetchFamilyContext,
  fetchRegistrationGate,
  getCurrentSession,
  resetPasswordForEmail,
  signInWithPassword,
  signOutFromSupabase,
  signUpWithPassword,
  subscribeToAuthChanges,
  supabaseConfigured,
  updateFamilyRegistrationSetting,
  updatePassword,
  type SupabaseRegistrationGate,
} from '../lib/supabase';
import {
  type AuthDraft,
  EMPTY_AUTH_DRAFT,
  INVITE_ONLY_REGISTRATION_ERROR,
  isRegistrationDisabledByAdmin,
  type AuthMode,
  type AuthState,
} from '../app/types';
import { defaultPlannerState, type PlannerState } from '../lib/planner-data';
import type { Dispatch, SetStateAction } from 'react';
import type { SupabaseFamilyInvite } from '../lib/supabase';

type UseAuthParams = {
  setPlannerState: Dispatch<SetStateAction<PlannerState>>;
  setFamilyInvites: Dispatch<SetStateAction<SupabaseFamilyInvite[]>>;
};

type PersistedAuthDraft = Pick<AuthDraft, 'displayName' | 'email'>;

const AUTH_DRAFT_STORAGE_KEY = 'auth-form';
const AUTH_DEFAULT_DRAFT: PersistedAuthDraft = {
  displayName: '',
  email: '',
};
const AUTH_MODE_STORAGE_KEY = 'auth-mode';

function toPersistedAuthDraft(draft: AuthDraft): PersistedAuthDraft {
  return {
    displayName: draft.displayName,
    email: draft.email,
  };
}

export function useAuth({ setPlannerState, setFamilyInvites }: UseAuthParams) {
  const [redirectAuthMessage] = useState(() =>
    typeof window === 'undefined' ? null : getAuthRedirectMessage(window.location.href),
  );
  const [redirectAuthError] = useState(() =>
    typeof window === 'undefined' ? null : getAuthRedirectError(window.location.href),
  );
  const [redirectAuthMode] = useState<AuthMode | null>(() =>
    typeof window === 'undefined' ? null : getAuthRedirectMode(window.location.href),
  );
  const [authDraft, setAuthDraft] = useState(() => {
    const persistedDraft = loadUiDraft<PersistedAuthDraft>(AUTH_DRAFT_STORAGE_KEY, AUTH_DEFAULT_DRAFT);

    return {
      ...EMPTY_AUTH_DRAFT,
      ...persistedDraft,
    };
  });
  const [authMode, setAuthMode] = useState<AuthMode>(() => (
    redirectAuthMode
    ?? loadUiDraft<AuthMode>(AUTH_MODE_STORAGE_KEY, 'sign-in')
  ));
  const [authBusy, setAuthBusy] = useState(false);
  const [registrationGatePreview, setRegistrationGatePreview] = useState<SupabaseRegistrationGate | null>(null);
  const blocksSessionHydrationAfterRecovery = useRef(redirectAuthMode === 'reset-password');
  const [authState, setAuthState] = useState<AuthState>({
    stage: supabaseConfigured ? 'loading' : 'disabled',
    session: null,
    profile: null,
    family: null,
    error: null,
    message: null,
  });
  const authStateRef = useRef(authState);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    if (
      authState.stage === 'authenticated'
      || authState.stage === 'onboarding'
      || authState.stage === 'disabled'
    ) {
      clearUiDraft(AUTH_DRAFT_STORAGE_KEY);
      clearUiDraft(AUTH_MODE_STORAGE_KEY);
    }
  }, [authState.stage]);

  const updateAuthDraft = (updater: (current: AuthDraft) => AuthDraft) => {
    setAuthDraft((current) => {
      const next = updater(current);

      if (authState.stage === 'signed-out') {
        saveUiDraft<PersistedAuthDraft>(AUTH_DRAFT_STORAGE_KEY, toPersistedAuthDraft(next));
      }

      return next;
    });
  };

  const replaceAuthDraft = (next: AuthDraft) => {
    setAuthDraft(next);

    if (authState.stage === 'signed-out') {
      saveUiDraft<PersistedAuthDraft>(AUTH_DRAFT_STORAGE_KEY, toPersistedAuthDraft(next));
      return;
    }

    clearUiDraft(AUTH_DRAFT_STORAGE_KEY);
  };

  const replaceAuthMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);

    if (authState.stage === 'signed-out') {
      saveUiDraft<AuthMode>(AUTH_MODE_STORAGE_KEY, nextMode);
      return;
    }

    clearUiDraft(AUTH_MODE_STORAGE_KEY);
  };

  const handleAuthDraftChange = (field: keyof AuthDraft, value: string) => {
    updateAuthDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // --- Registration gate preview ---

  useEffect(() => {
    if (!supabaseConfigured || authState.stage !== 'signed-out' || authMode !== 'sign-up') {
      setRegistrationGatePreview(null);
      return;
    }

    let cancelled = false;

    const loadRegistrationGatePreview = async () => {
      try {
        const gate = await fetchRegistrationGate(authDraft.email);

        if (!cancelled) {
          setRegistrationGatePreview(gate);
        }
      } catch {
        if (!cancelled) {
          setRegistrationGatePreview(null);
        }
      }
    };

    void loadRegistrationGatePreview();

    return () => {
      cancelled = true;
    };
  }, [authDraft.email, authMode, authState.stage]);

  // --- Redirect URL cleanup ---

  useEffect(() => {
    if (typeof window === 'undefined' || !redirectAuthMessage) {
      return;
    }

    window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
  }, [redirectAuthMessage]);

  // --- Session hydration ---

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthState({
        stage: 'disabled',
        session: null,
        profile: null,
        family: null,
        error: null,
        message: 'Die Online-Synchronisierung ist noch nicht eingerichtet. Die App läuft im lokalen Demo-Modus.',
      });
      return;
    }

    let disposed = false;

    const hydrateSession = async (
      session: Session | null,
      options: {
        showBlockingLoader: boolean;
        successMessage: string | null;
      },
    ) => {
      if (disposed) {
        return;
      }

      if (blocksSessionHydrationAfterRecovery.current) {
        setAuthState((current) => ({
          ...current,
          stage: 'signed-out',
          session,
          profile: null,
          family: null,
          error: redirectAuthError,
          message: null,
        }));
        return;
      }

      if (!session?.user) {
        setAuthState((current) => ({
          ...current,
          stage: 'signed-out',
          session: null,
          profile: null,
          family: null,
          error: redirectAuthError,
        }));
        return;
      }

      if (options.showBlockingLoader) {
        setAuthState((current) => ({
          ...current,
          stage: 'loading',
          session,
          error: null,
        }));
      } else {
        setAuthState((current) => ({
          ...current,
          session,
          error: null,
        }));
      }

      try {
        const profile = await ensureProfile(session.user);
        let family = await fetchFamilyContext(session.user.id);

        if (!family) {
          await acceptPendingFamilyInvite(session.user.id, profile.email);
          family = await fetchFamilyContext(session.user.id);
        }

        if (disposed) {
          return;
        }

        setAuthState((current) => ({
          stage: family ? 'authenticated' : 'onboarding',
          session,
          profile: family ? { ...profile, role: family.role } : profile,
          family,
          error: null,
          message: options.successMessage
            ? family
              ? options.successMessage
              : 'E-Mail bestätigt. Lege jetzt deine Familie an.'
            : current.message,
        }));
      } catch (error) {
        if (disposed) {
          return;
        }

        setAuthState((current) => ({
          ...current,
          stage: 'signed-out',
          session,
          profile: null,
          family: null,
          error: `${humanizeAuthError(error)} Bitte prüfe die Einrichtung der Online-Synchronisierung.`,
        }));
      }
    };

    void getCurrentSession()
      .then((session) => hydrateSession(session, {
        showBlockingLoader: true,
        successMessage: redirectAuthMessage,
      }))
      .catch((error) => {
        if (disposed) {
          return;
        }

        setAuthState((current) => ({
          ...current,
          stage: 'signed-out',
          error: humanizeAuthError(error),
        }));
      });

    const unsubscribe = subscribeToAuthChanges((session, event) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      const currentAuthState = authStateRef.current;
      const currentUserId = currentAuthState.session?.user?.id;
      const nextUserId = session?.user?.id ?? null;
      const keepsCurrentView = (
        nextUserId !== null
        && currentUserId === nextUserId
        && (currentAuthState.stage === 'authenticated' || currentAuthState.stage === 'onboarding')
      );

      void hydrateSession(session, {
        showBlockingLoader: !keepsCurrentView,
        successMessage: null,
      });
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [redirectAuthError, redirectAuthMessage]);

  // --- Auth form submit ---

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const email = authDraft.email.trim();
    const password = authDraft.password.trim();
    const confirmPassword = authDraft.confirmPassword.trim();
    const displayName = authDraft.displayName.trim();

    if (
      (authMode === 'sign-in' && (!email || !password))
      || (authMode === 'sign-up' && (!email || !password || !displayName))
      || (authMode === 'forgot-password' && !email)
      || (authMode === 'reset-password' && (!password || !confirmPassword))
    ) {
      setAuthState((current) => ({
        ...current,
        error: 'Bitte alle erforderlichen Felder ausfüllen.',
      }));
      return;
    }

    setAuthBusy(true);
    setAuthState((current) => ({
      ...current,
      error: null,
      message: null,
    }));

    try {
      if (authMode === 'sign-in') {
        const { error } = await signInWithPassword(email, password);

        if (error) {
          throw error;
        }
      } else if (authMode === 'sign-up') {
        const registrationGate = await fetchRegistrationGate(email);

        if (!registrationGate.allowed) {
          throw new Error(
            isRegistrationDisabledByAdmin(registrationGate)
              ? INVITE_ONLY_REGISTRATION_ERROR
              : 'Registrierung ist derzeit nur per Einladung moeglich. Bitte lass dir zuerst eine Einladung schicken.',
          );
        }

        const { data, error } = await signUpWithPassword(email, password, displayName);

        if (error) {
          throw error;
        }

        if (!data.session) {
          setAuthState((current) => ({
            ...current,
            stage: 'signed-out',
            message: 'Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.',
          }));
        }
      } else if (authMode === 'forgot-password') {
        const { error } = await resetPasswordForEmail(email);

        if (error) {
          throw error;
        }

        setAuthState((current) => ({
          ...current,
          stage: 'signed-out',
          message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.',
        }));
        replaceAuthMode('sign-in');
      } else {
        if (password !== confirmPassword) {
          throw new Error('Die neuen Passwörter stimmen nicht überein.');
        }

        const { error } = await updatePassword(password);

        if (error) {
          throw error;
        }

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
        }

        blocksSessionHydrationAfterRecovery.current = false;

        setAuthState((current) => ({
          ...current,
          error: null,
          message: 'Passwort erfolgreich aktualisiert.',
        }));
        replaceAuthMode('sign-in');
      }

      replaceAuthDraft(EMPTY_AUTH_DRAFT);
      formElement.reset();
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        error: humanizeAuthError(error),
      }));
    } finally {
      setAuthBusy(false);
    }
  };

  // --- Family creation ---

  const handleCreateFamily = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const familyName = String(form.get('familyName') || '').trim();
    const user = authState.session?.user;

    if (!user || !authState.profile) {
      return;
    }

    setAuthBusy(true);
    setAuthState((current) => ({
      ...current,
      error: null,
      message: null,
    }));

    try {
      const family = await bootstrapFamilyForUser(user, familyName);
      const profile = await ensureProfile(user);

      setAuthState({
        stage: 'authenticated',
        session: authState.session,
        profile: { ...profile, role: family.role },
        family,
        error: null,
        message: 'Familie erfolgreich angelegt.',
      });

      formElement.reset();
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        error: humanizeAuthError(error),
      }));
    } finally {
      setAuthBusy(false);
    }
  };

  // --- Sign out ---

  const handleSignOut = async () => {
    if (!supabaseConfigured) {
      return;
    }

    setAuthBusy(true);

    try {
      const { error } = await signOutFromSupabase();

      if (error) {
        throw error;
      }

      setAuthState((current) => ({
        ...current,
        message: 'Du wurdest erfolgreich abgemeldet.',
      }));
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        error: humanizeAuthError(error),
      }));
    } finally {
      setAuthBusy(false);
    }
  };

  // --- Account deletion ---

  const handleDeleteAccount = async () => {
    setAuthBusy(true);

    try {
      await deleteCurrentAccount();

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
      }

      blocksSessionHydrationAfterRecovery.current = false;
      replaceAuthMode('sign-in');
      replaceAuthDraft(EMPTY_AUTH_DRAFT);
      setAuthState({
        stage: 'signed-out',
        session: null,
        profile: null,
        family: null,
        error: null,
        message: 'Dein Konto wurde gelöscht.',
      });
    } finally {
      setAuthBusy(false);
    }
  };

  // --- Family member deletion ---

  const handleDeleteFamilyMember = async (familyId: string, memberUserId: string) => {
    await deleteFamilyMemberAccount(familyId, memberUserId);
  };

  // --- Family deletion ---

  const handleDeleteFamily = async (familyId: string) => {
    await deleteFamilyRecord(familyId);

    if (authState.family?.familyId !== familyId) {
      return;
    }

    setPlannerState(defaultPlannerState);
    setFamilyInvites([]);

    try {
      const { error } = await signOutFromSupabase();

      if (error) {
        throw error;
      }
    } catch {
      // The family is already deleted. Fall back to a local signed-out state.
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
    }

    blocksSessionHydrationAfterRecovery.current = false;
    replaceAuthMode('sign-in');
    replaceAuthDraft(EMPTY_AUTH_DRAFT);
    setAuthState({
      stage: 'signed-out',
      session: null,
      profile: null,
      family: null,
      error: null,
      message: 'Die Familie wurde gelöscht. Bitte melde dich erneut an.',
    });
  };

  // --- Registration setting ---

  const handleUpdateFamilyRegistration = async (allowOpenRegistration: boolean) => {
    if (!authState.family) {
      throw new Error('Es wurde keine Familie geladen.');
    }

    const updatedFamily = await updateFamilyRegistrationSetting(
      authState.family.familyId,
      allowOpenRegistration,
    );

    setAuthState((current) => ({
      ...current,
      family: current.family
        ? {
            ...current.family,
            allowOpenRegistration: updatedFamily.allowOpenRegistration,
          }
        : current.family,
    }));

    return updatedFamily;
  };

  // --- Mode change ---

  const handleAuthModeChange = (mode: AuthMode) => {
    if (mode !== 'reset-password' && typeof window !== 'undefined' && authMode === 'reset-password') {
      window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
      blocksSessionHydrationAfterRecovery.current = false;
    }

    replaceAuthMode(mode);
    replaceAuthDraft({
      ...EMPTY_AUTH_DRAFT,
      email:
        mode === 'forgot-password' || (mode === 'sign-in' && authMode === 'forgot-password')
          ? authDraft.email
          : '',
    });
  };

  return {
    authState,
    authDraft,
    handleAuthDraftChange,
    authMode,
    authBusy,
    registrationGatePreview,
    handleAuthSubmit,
    handleCreateFamily,
    handleSignOut,
    handleDeleteAccount,
    handleDeleteFamily,
    handleDeleteFamilyMember,
    handleUpdateFamilyRegistration,
    handleAuthModeChange,
  };
}
