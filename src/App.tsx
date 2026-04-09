import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { defaultPlannerState, type TabId } from './lib/planner-data';
import { humanizeAuthError } from './lib/auth-errors';
import {
  clearAuthRedirectState,
  getAuthRedirectError,
  getAuthRedirectMessage,
  getAuthRedirectMode,
} from './lib/auth-redirect';
import { loadPlannerState, savePlannerState } from './lib/storage';
import {
  acceptPendingFamilyInvite,
  bootstrapFamilyForUser,
  deleteCurrentAccount,
  deleteFamily as deleteFamilyRecord,
  deleteFamilyMemberAccount,
  ensureProfile,
  fetchCalendarEntries,
  fetchDocuments,
  fetchFamilyContext,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMeals,
  fetchNotes,
  fetchRegistrationGate,
  fetchShoppingItems,
  fetchTasks,
  getCurrentSession,
  resetPasswordForEmail,
  signInWithPassword,
  signOutFromSupabase,
  signUpWithPassword,
  subscribeToAuthChanges,
  supabaseConfigured,
  updateFamilyRegistrationSetting,
  updatePassword,
  type SupabaseFamilyInvite,
  type SupabaseRegistrationGate,
} from './lib/supabase';
import { applyCloudCollections } from './lib/cloud-sync';
import {
  EMPTY_AUTH_DRAFT,
  INVITE_ONLY_REGISTRATION_BANNER,
  INVITE_ONLY_REGISTRATION_ERROR,
  isRegistrationDisabledByAdmin,
  type AuthMode,
  type AuthState,
  type CloudSyncState,
  type ToastItem,
  type ToastTone,
} from './app/types';
import { nextStringId } from './lib/id';
import { AuthLoadingScreen, AuthScreen, OnboardingScreen } from './components/auth/AuthScreens';
import PlannerShell from './components/planner/PlannerShell';
import { syncPlannerWithAuth } from './components/planner/planner-shell-utils';
import { ToastViewport } from './components/toast/ToastViewport';

export default function App() {
  const [redirectAuthMessage] = useState(() =>
    typeof window === 'undefined' ? null : getAuthRedirectMessage(window.location.href),
  );
  const [redirectAuthError] = useState(() =>
    typeof window === 'undefined' ? null : getAuthRedirectError(window.location.href),
  );
  const [redirectAuthMode] = useState<AuthMode | null>(() =>
    typeof window === 'undefined' ? null : getAuthRedirectMode(window.location.href),
  );
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [plannerState, setPlannerState] = useState(() => loadPlannerState());
  const [familyInvites, setFamilyInvites] = useState<SupabaseFamilyInvite[]>([]);
  const [authDraft, setAuthDraft] = useState(EMPTY_AUTH_DRAFT);
  const [authMode, setAuthMode] = useState<AuthMode>(redirectAuthMode ?? 'sign-in');
  const [authBusy, setAuthBusy] = useState(false);
  const [registrationGatePreview, setRegistrationGatePreview] = useState<SupabaseRegistrationGate | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const blocksSessionHydrationAfterRecovery = useRef(redirectAuthMode === 'reset-password');
  const registrationBlockedToastVisible = useRef(false);
  const [authState, setAuthState] = useState<AuthState>({
    stage: supabaseConfigured ? 'loading' : 'disabled',
    session: null,
    profile: null,
    family: null,
    error: null,
    message: null,
  });
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    phase: 'idle',
    message: null,
    scope: null,
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: ToastTone) => {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      return;
    }

    setToasts((current) => {
      if (current.some((toast) => toast.message === normalizedMessage && toast.tone === tone)) {
        return current;
      }

      return [
        ...current,
        {
          id: nextStringId(),
          message: normalizedMessage,
          tone,
        },
      ];
    });
  }, []);

  useEffect(() => {
    savePlannerState(plannerState);
  }, [plannerState]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !redirectAuthMessage) {
      return;
    }

    window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
  }, [redirectAuthMessage]);

  useEffect(() => {
    if (!authState.message) {
      return;
    }

    pushToast(authState.message, 'success');
  }, [authState.message, pushToast]);

  useEffect(() => {
    if (!authState.error) {
      return;
    }

    pushToast(authState.error, 'error');
  }, [authState.error, pushToast]);

  useEffect(() => {
    if (!cloudSync.message || cloudSync.phase === 'loading') {
      return;
    }

    if (cloudSync.scope === 'global' && cloudSync.phase === 'ready') {
      return;
    }

    pushToast(cloudSync.message, cloudSync.phase === 'error' ? 'error' : 'success');
  }, [cloudSync.message, cloudSync.phase, cloudSync.scope, pushToast]);

  useEffect(() => {
    const isBlocked = authState.stage === 'signed-out'
      && authMode === 'sign-up'
      && isRegistrationDisabledByAdmin(registrationGatePreview);

    if (isBlocked && !registrationBlockedToastVisible.current) {
      pushToast(INVITE_ONLY_REGISTRATION_BANNER, 'warning');
    }

    registrationBlockedToastVisible.current = isBlocked;
  }, [authMode, authState.stage, pushToast, registrationGatePreview]);

  useEffect(() => {
    const profile = authState.profile;

    if (!profile) {
      return;
    }

    setPlannerState((current) => syncPlannerWithAuth(current, profile, authState.family));
  }, [authState.family, authState.profile]);

  useEffect(() => {
    if (authState.stage !== 'authenticated' || !authState.family) {
      setFamilyInvites([]);
      setCloudSync({
        phase: 'idle',
        message: null,
        scope: null,
      });
      return;
    }

    let cancelled = false;
    const familyId = authState.family.familyId;

    const loadCloudCollections = async () => {
      setCloudSync({
        phase: 'loading',
        message: 'Alle Planer-Module werden aus Supabase geladen.',
        scope: 'global',
      });

      try {
        const [shoppingItems, tasks, notes, calendar, meals, documents, members, invites] = await Promise.all([
          fetchShoppingItems(familyId),
          fetchTasks(familyId),
          fetchNotes(familyId),
          fetchCalendarEntries(familyId),
          fetchMeals(familyId),
          fetchDocuments(familyId),
          fetchFamilyMembers(familyId),
          fetchFamilyInvites(familyId),
        ]);

        if (cancelled) {
          return;
        }

        setPlannerState((current) => {
          const nextState = applyCloudCollections(current, {
            shoppingItems,
            tasks,
            notes,
            calendar,
            meals,
            documents,
          });

          return {
            ...nextState,
            members,
            activeUserId: authState.profile?.id ?? nextState.activeUserId,
          };
        });
        setFamilyInvites(invites);
        setCloudSync({
          phase: 'ready',
          message: 'Alle Planer-Module sind mit Supabase synchronisiert.',
          scope: 'global',
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCloudSync({
          phase: 'error',
          message: humanizeAuthError(error),
          scope: 'global',
        });
      }
    };

    void loadCloudCollections();

    return () => {
      cancelled = true;
    };
  }, [authState.family, authState.profile?.id, authState.stage]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthState({
        stage: 'disabled',
        session: null,
        profile: null,
        family: null,
        error: null,
        message: 'Supabase ist noch nicht konfiguriert. Die App läuft im lokalen Demo-Modus.',
      });
      return;
    }

    let disposed = false;

    const hydrateSession = async (session: Session | null) => {
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

      setAuthState((current) => ({
        ...current,
        stage: 'loading',
        session,
        error: null,
      }));

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

        setAuthState({
          stage: family ? 'authenticated' : 'onboarding',
          session,
          profile: family ? { ...profile, role: family.role } : profile,
          family,
          error: null,
          message: redirectAuthMessage
            ? family
              ? redirectAuthMessage
              : 'E-Mail bestätigt. Lege jetzt deine Familie an.'
            : null,
        });
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
          error: `${humanizeAuthError(error)} Prüfe bitte .env und das SQL-Schema in Supabase.`,
        }));
      }
    };

    void getCurrentSession()
      .then((session) => hydrateSession(session))
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

    const unsubscribe = subscribeToAuthChanges((session) => {
      void hydrateSession(session);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [redirectAuthError, redirectAuthMessage]);

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
        setAuthMode('sign-in');
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
        setAuthMode('sign-in');
      }

      setAuthDraft(EMPTY_AUTH_DRAFT);
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

  const handleDeleteAccount = async () => {
    setAuthBusy(true);

    try {
      await deleteCurrentAccount();

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
      }

      blocksSessionHydrationAfterRecovery.current = false;
      setAuthMode('sign-in');
      setAuthDraft(EMPTY_AUTH_DRAFT);
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

  const handleDeleteFamilyMember = async (familyId: string, memberUserId: string) => {
    await deleteFamilyMemberAccount(familyId, memberUserId);
  };

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
    setAuthMode('sign-in');
    setAuthDraft(EMPTY_AUTH_DRAFT);
    setAuthState({
      stage: 'signed-out',
      session: null,
      profile: null,
      family: null,
      error: null,
      message: 'Die Familie wurde gelöscht. Bitte melde dich erneut an.',
    });
  };

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

  const handleAuthModeChange = (mode: AuthMode) => {
    if (mode !== 'reset-password' && typeof window !== 'undefined' && authMode === 'reset-password') {
      window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
      blocksSessionHydrationAfterRecovery.current = false;
    }

    setAuthMode(mode);
    setAuthDraft((current) => ({
      ...EMPTY_AUTH_DRAFT,
      email:
        mode === 'forgot-password' || (mode === 'sign-in' && authMode === 'forgot-password')
          ? current.email
          : '',
    }));
  };

  if (authState.stage === 'loading') {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <AuthLoadingScreen />
      </>
    );
  }

  if (authState.stage === 'signed-out') {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen
          mode={authMode}
          busy={authBusy}
          authDraft={authDraft}
          onDraftChange={(field, value) =>
            setAuthDraft((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onSubmit={handleAuthSubmit}
          onModeChange={handleAuthModeChange}
        />
      </>
    );
  }

  if (authState.stage === 'onboarding' && authState.profile) {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <OnboardingScreen
          profile={authState.profile}
          busy={authBusy}
          onSubmit={handleCreateFamily}
          onSignOut={handleSignOut}
        />
      </>
    );
  }

  return (
    <>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <PlannerShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        plannerState={plannerState}
        setPlannerState={setPlannerState}
        familyInvites={familyInvites}
        setFamilyInvites={setFamilyInvites}
        authState={authState}
        cloudSync={cloudSync}
        setCloudSync={setCloudSync}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
        onDeleteFamily={handleDeleteFamily}
        onDeleteFamilyMemberAccount={handleDeleteFamilyMember}
        onUpdateFamilyRegistration={handleUpdateFamilyRegistration}
      />
    </>
  );
}