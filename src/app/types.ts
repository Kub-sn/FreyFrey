import type { Session } from '@supabase/supabase-js';
import type { TabId } from '../lib/planner-data';
import type {
  SupabaseFamilyContext,
  SupabaseProfile,
  SupabaseRegistrationGate,
} from '../lib/supabase';

export type AuthStage = 'disabled' | 'loading' | 'signed-out' | 'onboarding' | 'authenticated';
export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

export type AuthDraft = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const EMPTY_AUTH_DRAFT: AuthDraft = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export const INVITE_ONLY_REGISTRATION_BANNER =
  'Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Neue Konten sind nur per Einladung moeglich.';

export const INVITE_ONLY_REGISTRATION_ERROR =
  'Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Bitte lass dir eine Einladung schicken.';

export type AuthState = {
  stage: AuthStage;
  session: Session | null;
  profile: SupabaseProfile | null;
  family: SupabaseFamilyContext | null;
  error: string | null;
  message: string | null;
};

export type CloudSyncState = {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  message: string | null;
  scope: TabId | 'global' | null;
};

export type CloudSyncUpdate = CloudSyncState | Omit<CloudSyncState, 'scope'>;
export type CloudSyncSetterValue = CloudSyncUpdate | ((current: CloudSyncState) => CloudSyncUpdate);

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

export type DocumentSortOption = 'recent' | 'name' | 'category' | 'status' | 'kind';
export type DocumentFilterKind = 'all' | 'image' | 'pdf' | 'word' | 'link' | 'file';

export type DocumentEditState = {
  id: string;
  name: string;
  category: string;
  status: string;
  linkUrl: string;
  filePath: string;
};

export type DocumentPreviewState = {
  id: string;
  name: string;
  url: string;
  kind: 'image' | 'pdf';
};

export type PendingMemberDeletionState = {
  familyId: string;
  familyName: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
};

export type PendingFamilyDeletionState = {
  familyId: string;
  familyName: string;
  memberCount: number;
  isCurrentFamily: boolean;
};

export function isRegistrationDisabledByAdmin(registrationGate: SupabaseRegistrationGate | null) {
  return Boolean(
    registrationGate
    && registrationGate.hasExistingFamilies
    && !registrationGate.hasOpenRegistration
    && !registrationGate.hasPendingInvite,
  );
}