import { useEffect, useState } from 'react';
import { type TabId } from './lib/planner-data';
import { loadActiveTab, loadPlannerState, saveActiveTab, savePlannerState } from './lib/storage';
import type { SupabaseFamilyInvite } from './lib/supabase';
import {
  INVITE_ONLY_REGISTRATION_BANNER,
  isRegistrationDisabledByAdmin,
  type CloudSyncState,
} from './app/types';
import { useAuth } from './hooks/useAuth';
import { useCloudDataSync } from './hooks/useCloudDataSync';
import { useToasts } from './hooks/useToasts';
import { syncPlannerWithAuth } from './components/planner/planner-shell-utils';
import { AuthLoadingScreen, AuthScreen, OnboardingScreen } from './components/auth/AuthScreens';
import PlannerShell from './components/planner/PlannerShell';
import { ToastViewport } from './components/toast/ToastViewport';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>(() => loadActiveTab() ?? 'overview');
  const [plannerState, setPlannerState] = useState(() => loadPlannerState());
  const [familyInvites, setFamilyInvites] = useState<SupabaseFamilyInvite[]>([]);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    phase: 'idle',
    message: null,
    scope: null,
  });

  const { toasts, pushToast, dismissToast } = useToasts();

  const auth = useAuth({ setPlannerState, setFamilyInvites });

  useCloudDataSync({
    authState: auth.authState,
    setPlannerState,
    setFamilyInvites,
    setCloudSync,
  });

  // --- Persistence ---

  useEffect(() => {
    savePlannerState(plannerState);
  }, [plannerState]);

  useEffect(() => {
    saveActiveTab(activeTab);
  }, [activeTab]);

  // --- Sync auth profile into planner state ---

  useEffect(() => {
    const profile = auth.authState.profile;

    if (!profile) {
      return;
    }

    setPlannerState((current) => syncPlannerWithAuth(current, profile, auth.authState.family));
  }, [auth.authState.family, auth.authState.profile]);

  // --- Forward auth/cloud messages to toasts ---

  useEffect(() => {
    if (!auth.authState.message) {
      return;
    }

    pushToast(auth.authState.message, 'success');
  }, [auth.authState.message, pushToast]);

  useEffect(() => {
    if (!auth.authState.error) {
      return;
    }

    pushToast(auth.authState.error, 'error');
  }, [auth.authState.error, pushToast]);

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
    const isBlocked = auth.authState.stage === 'signed-out'
      && auth.authMode === 'sign-up'
      && isRegistrationDisabledByAdmin(auth.registrationGatePreview);

    if (isBlocked) {
      pushToast(INVITE_ONLY_REGISTRATION_BANNER, 'warning');
    }
  }, [auth.authMode, auth.authState.stage, auth.registrationGatePreview, pushToast]);

  // --- Render ---

  if (auth.authState.stage === 'loading') {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <AuthLoadingScreen />
      </>
    );
  }

  if (auth.authState.stage === 'signed-out') {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen
          mode={auth.authMode}
          busy={auth.authBusy}
          authDraft={auth.authDraft}
          onDraftChange={auth.handleAuthDraftChange}
          onSubmit={auth.handleAuthSubmit}
          onModeChange={auth.handleAuthModeChange}
        />
      </>
    );
  }

  if (auth.authState.stage === 'onboarding' && auth.authState.profile) {
    return (
      <>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <OnboardingScreen
          profile={auth.authState.profile}
          busy={auth.authBusy}
          onSubmit={auth.handleCreateFamily}
          onSignOut={auth.handleSignOut}
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
        authState={auth.authState}
        cloudSync={cloudSync}
        setCloudSync={setCloudSync}
        onSignOut={auth.handleSignOut}
        onDeleteAccount={auth.handleDeleteAccount}
        onDeleteFamily={auth.handleDeleteFamily}
        onDeleteFamilyMemberAccount={auth.handleDeleteFamilyMember}
        onUpdateFamilyRegistration={auth.handleUpdateFamilyRegistration}
      />
    </>
  );
}