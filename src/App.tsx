import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  defaultPlannerState,
  tabs,
  type DocumentItem,
  type PlannerState,
  type TabId,
  type UserRole,
} from './lib/planner-data';
import { humanizeAuthError } from './lib/auth-errors';
import {
  clearAuthRedirectState,
  getAuthRedirectError,
  getAuthRedirectMessage,
  getAuthRedirectMode,
} from './lib/auth-redirect';
import {
  buildCalendarMonth,
  CALENDAR_WEEKDAY_LABELS,
  formatCalendarDateLabel,
  formatCalendarEntrySchedule,
  formatCalendarMonthLabel,
  getCalendarDayButtonLabel,
  getCalendarEntryDateKey,
  getMonthStart,
  parseCalendarDateKey,
  shiftMonth,
  sortCalendarEntries,
  toCalendarDateKey,
} from './lib/calendar-view';
import {
  getDocumentNameFromFile,
  mergeDocumentFiles,
  resolveDocumentMetadata,
  validateSelectedDocumentFiles,
} from './lib/document-upload';
import { loadPlannerState, savePlannerState } from './lib/storage';
import {
  acceptPendingFamilyInvite,
  createCalendarEntry,
  createDocument,
  createFamilyInvite,
  createMeal,
  createNote,
  createShoppingItem,
  createTask,
  deleteDocument,
  bootstrapFamilyForUser,
  fetchCalendarEntries,
  fetchDocuments,
  fetchFamilyInvites,
  fetchFamilyMembers,
  fetchMeals,
  ensureProfile,
  fetchNotes,
  fetchShoppingItems,
  fetchTasks,
  fetchFamilyContext,
  getCurrentSession,
  resetPasswordForEmail,
  uploadDocumentFile,
  signInWithPassword,
  signOutFromSupabase,
  signUpWithPassword,
  subscribeToAuthChanges,
  supabaseConfigured,
  removeFamilyInvite,
  updatePassword,
  updateDocument,
  updateMealPrepared,
  updateShoppingItemChecked,
  updateTaskDone,
  type SupabaseFamilyInvite,
  type SupabaseFamilyContext,
  type SupabaseProfile,
} from './lib/supabase';
import { applyCloudCollections } from './lib/cloud-sync';

type AuthStage = 'disabled' | 'loading' | 'signed-out' | 'onboarding' | 'authenticated';
type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

type AuthDraft = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_AUTH_DRAFT: AuthDraft = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

type AuthState = {
  stage: AuthStage;
  session: Session | null;
  profile: SupabaseProfile | null;
  family: SupabaseFamilyContext | null;
  error: string | null;
  message: string | null;
};

type CloudSyncState = {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  message: string | null;
};

type DocumentSortOption = 'recent' | 'name' | 'category' | 'status' | 'kind';
type DocumentFilterKind = 'all' | 'image' | 'pdf' | 'word' | 'link' | 'file';

type DocumentEditState = {
  id: string;
  name: string;
  category: string;
  status: string;
  linkUrl: string;
  filePath: string;
};

type DocumentPreviewState = {
  id: string;
  name: string;
  url: string;
  kind: 'image' | 'pdf';
};

const DOCUMENT_SORT_OPTIONS: Array<{ value: DocumentSortOption; label: string }> = [
  { value: 'recent', label: 'Neueste zuerst' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'category', label: 'Kategorie A-Z' },
  { value: 'status', label: 'Status A-Z' },
  { value: 'kind', label: 'Dateityp' },
];

const DOCUMENT_KIND_FILTER_OPTIONS: Array<{ value: DocumentFilterKind; label: string }> = [
  { value: 'all', label: 'Alle Typen' },
  { value: 'image', label: 'Bilder' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'link', label: 'Links' },
  { value: 'file', label: 'Dateien' },
];

const formatProgress = (done: number, total: number) => `${done}/${total}`;

function nextId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function nextStringId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const IMAGE_DOCUMENT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const PDF_DOCUMENT_PATTERN = /\.pdf$/i;
const WORD_DOCUMENT_PATTERN = /\.(doc|docx)$/i;

function getDocumentReference(document: DocumentItem) {
  return document.filePath || document.linkUrl || document.name;
}

function isPreviewableImage(document: DocumentItem) {
  return IMAGE_DOCUMENT_PATTERN.test(getDocumentReference(document));
}

function getDocumentKind(document: DocumentItem) {
  const reference = getDocumentReference(document);

  if (IMAGE_DOCUMENT_PATTERN.test(reference)) {
    return 'image';
  }

  if (PDF_DOCUMENT_PATTERN.test(reference)) {
    return 'pdf';
  }

  if (WORD_DOCUMENT_PATTERN.test(reference)) {
    return 'word';
  }

  if (document.linkUrl && !document.filePath) {
    return 'link';
  }

  return 'file';
}

function getDocumentIcon(document: DocumentItem) {
  switch (getDocumentKind(document)) {
    case 'image':
      return 'Bild';
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'Word';
    case 'link':
      return 'Link';
    default:
      return 'Datei';
  }
}

function getDocumentMetaParts(document: DocumentItem) {
  const category = document.category.trim();
  const type = getDocumentIcon(document).trim();
  const status = document.status.trim();
  const parts: Array<{ key: string; value: string; tone: 'muted' | 'strong' | 'accent' } | null> = [
    category && category.toLowerCase() !== 'dokument'
      ? { key: `category-${category}`, value: category, tone: 'muted' as const }
      : null,
    type ? { key: `type-${type}`, value: type, tone: 'strong' as const } : null,
    status ? { key: `status-${status}`, value: status, tone: 'accent' as const } : null,
  ];

  return parts.filter(
    (part): part is { key: string; value: string; tone: 'muted' | 'strong' | 'accent' } =>
      part !== null,
  );
}

function canPreviewDocument(document: DocumentItem) {
  const kind = getDocumentKind(document);

  return kind === 'image' || kind === 'pdf';
}

function compareDocumentLabels(left: string, right: string) {
  return left.localeCompare(right, 'de', { sensitivity: 'base' });
}

function getCalendarMetaParts(entry: { time: string; place: string }) {
  return [entry.time.trim(), entry.place.trim()].filter(Boolean).join(' · ');
}

function getFooterSyncMessage(params: {
  authDriven: boolean;
  supabaseConfigured: boolean;
  storageMode: PlannerState['storageMode'];
  cloudSyncPhase: CloudSyncState['phase'];
}) {
  if (!params.supabaseConfigured) {
    return 'Demo-Modus ohne Supabase-Synchronisierung.';
  }

  if (!params.authDriven || params.storageMode !== 'supabase-ready') {
    return 'Lokal aktiv. Für Synchronisierung bitte mit Supabase anmelden.';
  }

  if (params.cloudSyncPhase === 'loading') {
    return 'Synchronisierung mit Supabase läuft.';
  }

  if (params.cloudSyncPhase === 'error') {
    return 'Synchronisierung mit Supabase fehlgeschlagen.';
  }

  return 'Synchronisiert mit Supabase.';
}

function syncPlannerWithAuth(
  current: PlannerState,
  profile: SupabaseProfile,
  family: SupabaseFamilyContext | null,
): PlannerState {
  const syncedRole = family?.role ?? profile.role;
  const syncedMember = {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    role: syncedRole,
  };

  const existingMemberIndex = current.members.findIndex((member) => member.id === profile.id);
  let nextMembers = current.members;
  let changed = false;

  if (existingMemberIndex === -1) {
    nextMembers = [syncedMember, ...current.members.filter((member) => member.email !== profile.email)];
    changed = true;
  } else {
    const existingMember = current.members[existingMemberIndex];
    if (
      existingMember.name !== syncedMember.name ||
      existingMember.email !== syncedMember.email ||
      existingMember.role !== syncedMember.role
    ) {
      nextMembers = current.members.map((member, index) =>
        index === existingMemberIndex ? syncedMember : member,
      );
      changed = true;
    }
  }

  if (current.activeUserId !== profile.id) {
    changed = true;
  }

  if (current.storageMode !== 'supabase-ready') {
    changed = true;
  }

  if (family?.familyName && current.familyName !== family.familyName) {
    changed = true;
  }

  if (!changed) {
    return current;
  }

  return {
    ...current,
    activeUserId: profile.id,
    familyName: family?.familyName ?? current.familyName,
    storageMode: 'supabase-ready',
    members: nextMembers,
  };
}

function AuthScreen({
  mode,
  busy,
  error,
  message,
  authDraft,
  onDraftChange,
  onSubmit,
  onModeChange,
}: {
  mode: AuthMode;
  busy: boolean;
  error: string | null;
  message: string | null;
  authDraft: AuthDraft;
  onDraftChange: (field: keyof AuthDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onModeChange: (mode: AuthMode) => void;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card auth-card-wide">
        <div className="auth-copy">
          <p className="eyebrow">Supabase Auth</p>
          <h1>Familienplaner mit echten Benutzerkonten</h1>
          <p>
            {mode === 'forgot-password'
              ? 'Fordere einen sicheren Link an, um dein Passwort zurückzusetzen.'
              : mode === 'reset-password'
                ? 'Lege jetzt ein neues Passwort für dein Konto fest.'
                : 'Melde dich an oder registriere dich. Danach legst du deine Familie an und nutzt die App als `admin` oder `familyuser`.'}
          </p>
          <div className="auth-benefits">
            <span>Gemeinsame Familienfreigabe</span>
            <span>Rollen mit `admin` und `familyuser`</span>
            <span>Vorbereitung für Cloud-Sync und Android</span>
          </div>
        </div>

        <form className="auth-panel" autoComplete="off" onSubmit={(event) => void onSubmit(event)}>
          {mode === 'sign-in' || mode === 'sign-up' ? (
            <div className="mode-switch auth-mode-switch">
              <button
                type="button"
                className={mode === 'sign-in' ? 'mode-button active' : 'mode-button'}
                onClick={() => onModeChange('sign-in')}
              >
                Anmelden
              </button>
              <button
                type="button"
                className={mode === 'sign-up' ? 'mode-button active' : 'mode-button'}
                onClick={() => onModeChange('sign-up')}
              >
                Registrieren
              </button>
            </div>
          ) : null}

          {mode === 'sign-up' ? (
            <input
              name="displayName"
              placeholder="Anzeigename"
              autoComplete="off"
              value={authDraft.displayName}
              onChange={(event) => onDraftChange('displayName', event.currentTarget.value)}
            />
          ) : null}
          {mode !== 'reset-password' ? (
            <input
              name="email"
              type="email"
              placeholder="E-Mail"
              autoComplete="off"
              value={authDraft.email}
              onChange={(event) => onDraftChange('email', event.currentTarget.value)}
            />
          ) : null}
          {mode !== 'forgot-password' ? (
            <input
              name="password"
              type="password"
              placeholder={mode === 'reset-password' ? 'Neues Passwort' : 'Passwort'}
              autoComplete="new-password"
              value={authDraft.password}
              onChange={(event) => onDraftChange('password', event.currentTarget.value)}
            />
          ) : null}
          {mode === 'reset-password' ? (
            <input
              name="confirmPassword"
              type="password"
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
              value={authDraft.confirmPassword}
              onChange={(event) => onDraftChange('confirmPassword', event.currentTarget.value)}
            />
          ) : null}

          {error ? <p className="auth-feedback auth-error">{error}</p> : null}
          {message ? <p className="auth-feedback auth-message">{message}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? 'Bitte warten…'
              : mode === 'sign-in'
                ? 'Jetzt anmelden'
                : mode === 'sign-up'
                  ? 'Konto anlegen'
                  : mode === 'forgot-password'
                    ? 'Reset-Link senden'
                    : 'Passwort speichern'}
          </button>

          {mode === 'sign-in' ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => onModeChange('forgot-password')}
            >
              Passwort vergessen?
            </button>
          ) : null}
          {mode === 'forgot-password' || mode === 'reset-password' ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() => onModeChange('sign-in')}
            >
              Zurück zur Anmeldung
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}

function OnboardingScreen({
  profile,
  busy,
  error,
  message,
  onSubmit,
  onSignOut,
}: {
  profile: SupabaseProfile;
  busy: boolean;
  error: string | null;
  message: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Familie anlegen</p>
          <h1>Willkommen, {profile.display_name}</h1>
          <p>
            Dein Konto ist angelegt. Lege jetzt deine Familie an. Der erste Nutzer wird dabei
            automatisch `admin`.
          </p>
          <div className="account-summary">
            <span>{profile.email}</span>
            <span>Startrolle: {profile.role}</span>
          </div>
        </div>

        <form className="auth-panel" onSubmit={(event) => void onSubmit(event)}>
          <input name="familyName" placeholder="Name deiner Familie" autoComplete="organization" />
          {error ? <p className="auth-feedback auth-error">{error}</p> : null}
          {message ? <p className="auth-feedback auth-message">{message}</p> : null}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Familie wird angelegt…' : 'Familie erstellen und als Admin starten'}
          </button>
          <button type="button" className="secondary-action" onClick={() => void onSignOut()}>
            Abmelden
          </button>
        </form>
      </section>
    </div>
  );
}

function PlannerShell({
  activeTab,
  setActiveTab,
  plannerState,
  setPlannerState,
  familyInvites,
  setFamilyInvites,
  authState,
  cloudSync,
  setCloudSync,
  onSignOut,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  plannerState: PlannerState;
  setPlannerState: React.Dispatch<React.SetStateAction<PlannerState>>;
  familyInvites: SupabaseFamilyInvite[];
  setFamilyInvites: React.Dispatch<React.SetStateAction<SupabaseFamilyInvite[]>>;
  authState: AuthState;
  cloudSync: CloudSyncState;
  setCloudSync: React.Dispatch<React.SetStateAction<CloudSyncState>>;
  onSignOut: () => Promise<void>;
}) {
  const [selectedDocumentFiles, setSelectedDocumentFiles] = useState<File[]>([]);
  const [documentSelectionErrors, setDocumentSelectionErrors] = useState<string[]>([]);
  const [isDocumentDropActive, setIsDocumentDropActive] = useState(false);
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [documentStatusFilter, setDocumentStatusFilter] = useState('all');
  const [documentKindFilter, setDocumentKindFilter] = useState<DocumentFilterKind>('all');
  const [documentSort, setDocumentSort] = useState<DocumentSortOption>('recent');
  const [documentEditState, setDocumentEditState] = useState<DocumentEditState | null>(null);
  const [documentPreviewState, setDocumentPreviewState] = useState<DocumentPreviewState | null>(null);
  const [documentUploadProgress, setDocumentUploadProgress] = useState<{
    completed: number;
    total: number;
    currentName: string;
  } | null>(null);
  const [pendingInviteActionId, setPendingInviteActionId] = useState<string | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(() => getMonthStart(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toCalendarDateKey(new Date()));

  const activeMember = useMemo(
    () =>
      plannerState.members.find((member) => member.id === plannerState.activeUserId) ??
      plannerState.members[0],
    [plannerState.activeUserId, plannerState.members],
  );

  const effectiveRole = authState.profile?.role ?? activeMember?.role ?? 'familyuser';
  const canManageFamily = effectiveRole === 'admin';
  const openTasks = useMemo(
    () => plannerState.tasks.filter((task) => !task.done).length,
    [plannerState.tasks],
  );
  const pendingShopping = useMemo(
    () => plannerState.shoppingItems.filter((item) => !item.checked).length,
    [plannerState.shoppingItems],
  );
  const preparedMeals = useMemo(
    () => plannerState.meals.filter((meal) => meal.prepared).length,
    [plannerState.meals],
  );
  const adminCount = useMemo(
    () => plannerState.members.filter((member) => member.role === 'admin').length,
    [plannerState.members],
  );
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'family' || canManageFamily),
    [canManageFamily],
  );
  const documentStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(plannerState.documents.map((document) => document.status.trim()).filter(Boolean)),
      ).sort(compareDocumentLabels),
    [plannerState.documents],
  );
  const visibleDocuments = useMemo(() => {
    const normalizedSearchTerm = documentSearchTerm.trim().toLowerCase();

    return [...plannerState.documents]
      .filter((document) => {
        if (
          normalizedSearchTerm &&
          ![document.name, document.category, document.status]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearchTerm)
        ) {
          return false;
        }

        if (documentStatusFilter !== 'all' && document.status !== documentStatusFilter) {
          return false;
        }

        if (documentKindFilter !== 'all' && getDocumentKind(document) !== documentKindFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        switch (documentSort) {
          case 'name':
            return compareDocumentLabels(left.name, right.name);
          case 'category':
            return compareDocumentLabels(left.category, right.category);
          case 'status':
            return compareDocumentLabels(left.status, right.status);
          case 'kind':
            return compareDocumentLabels(getDocumentKind(left), getDocumentKind(right));
          case 'recent':
          default:
            return 0;
        }
      });
  }, [documentKindFilter, documentSearchTerm, documentSort, documentStatusFilter, plannerState.documents]);
  const sortedCalendarEntries = useMemo(
    () => sortCalendarEntries(plannerState.calendar),
    [plannerState.calendar],
  );
  const scheduledCalendarEntries = useMemo(
    () => sortedCalendarEntries.filter((entry) => Boolean(getCalendarEntryDateKey(entry))),
    [sortedCalendarEntries],
  );
  const unscheduledCalendarEntries = useMemo(
    () => sortedCalendarEntries.filter((entry) => !getCalendarEntryDateKey(entry)),
    [sortedCalendarEntries],
  );
  const calendarMonth = useMemo(
    () => buildCalendarMonth(calendarViewDate, scheduledCalendarEntries, selectedCalendarDate),
    [calendarViewDate, scheduledCalendarEntries, selectedCalendarDate],
  );
  const visibleMonthEventCount = useMemo(
    () =>
      scheduledCalendarEntries.filter((entry) => {
        const entryDate = parseCalendarDateKey(getCalendarEntryDateKey(entry) ?? '');

        return (
          entryDate?.getFullYear() === calendarViewDate.getFullYear() &&
          entryDate.getMonth() === calendarViewDate.getMonth()
        );
      }).length,
    [calendarViewDate, scheduledCalendarEntries],
  );
  const selectedDayEntries = useMemo(
    () =>
      scheduledCalendarEntries.filter((entry) => getCalendarEntryDateKey(entry) === selectedCalendarDate),
    [scheduledCalendarEntries, selectedCalendarDate],
  );

  useEffect(() => {
    if (!canManageFamily && activeTab === 'family') {
      setActiveTab('overview');
    }
  }, [activeTab, canManageFamily, setActiveTab]);

  const updateState = (updater: (current: PlannerState) => PlannerState) => {
    setPlannerState((current) => updater(current));
  };

  const validateDocumentFiles = (files: File[]) => {
    const validationErrors = validateSelectedDocumentFiles(files);

    if (validationErrors.length > 0) {
      setDocumentSelectionErrors(validationErrors);
      return false;
    }

    setDocumentSelectionErrors([]);
    return true;
  };

  const handleDocumentFileSelection = (files: File[]) => {
    const nextFiles = mergeDocumentFiles(selectedDocumentFiles, files);

    if (nextFiles.length > 0 && !validateDocumentFiles(nextFiles)) {
      return;
    }

    setCloudSync((current) =>
      current.phase === 'error'
        ? {
            phase: 'idle',
            message: null,
          }
        : current,
    );
    setSelectedDocumentFiles(nextFiles);
    setIsDocumentDropActive(false);
        {cloudSync.message ? (
          <p
            className={
              cloudSync.phase === 'error'
                ? 'auth-feedback auth-error module-feedback'
                : 'auth-feedback auth-message module-feedback'
            }
          >
            {cloudSync.message}
          </p>
        ) : null}
  };

  const handleDocumentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleDocumentFileSelection(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  };

  const handleDocumentDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleDocumentFileSelection(Array.from(event.dataTransfer.files ?? []));
  };

  const handleDocumentDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDocumentDropActive(true);
  };

  const handleDocumentDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDocumentDropActive(false);
  };

  const handleClearSelectedDocumentFiles = () => {
    setSelectedDocumentFiles([]);
    setDocumentSelectionErrors([]);
  };

  const handleRemoveSelectedDocumentFile = (fileToRemove: File) => {
    setSelectedDocumentFiles((current) =>
      current.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          ),
      ),
    );
  };

  const handleStartDocumentEdit = (document: DocumentItem) => {
    setDocumentEditState({
      id: document.id,
      name: document.name,
      category: document.category,
      status: document.status,
      linkUrl: document.filePath ? '' : document.linkUrl,
      filePath: document.filePath,
    });
  };

  const handleDocumentEditFieldChange = (field: keyof Omit<DocumentEditState, 'id' | 'filePath'>, value: string) => {
    setDocumentEditState((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveDocumentEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!documentEditState) {
      return;
    }

    const metadata = resolveDocumentMetadata({
      name: documentEditState.name,
      category: documentEditState.category,
      status: documentEditState.status,
    });
    const nextLinkUrl = documentEditState.filePath ? '' : documentEditState.linkUrl.trim();

    try {
      if (authState.family) {
        const updatedDocument = await updateDocument(documentEditState.id, {
          name: metadata.name,
          category: metadata.category,
          status: metadata.status,
          linkUrl: nextLinkUrl,
          filePath: documentEditState.filePath,
        });

        updateState((current) => ({
          ...current,
          documents: current.documents.map((document) =>
            document.id === updatedDocument.id ? updatedDocument : document,
          ),
        }));
      } else {
        updateState((current) => ({
          ...current,
          documents: current.documents.map((document) =>
            document.id === documentEditState.id
              ? {
                  ...document,
                  name: metadata.name,
                  category: metadata.category,
                  status: metadata.status,
                  linkUrl: document.filePath ? document.linkUrl : nextLinkUrl,
                }
              : document,
          ),
        }));
      }

      setDocumentEditState(null);
      setCloudSync({
        phase: 'ready',
        message: 'Dokument-Metadaten wurden aktualisiert.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleOpenDocumentPreview = (document: DocumentItem) => {
    if (!document.linkUrl || !canPreviewDocument(document)) {
      return;
    }

    setDocumentPreviewState({
      id: document.id,
      name: document.name,
      url: document.linkUrl,
      kind: getDocumentKind(document) === 'image' ? 'image' : 'pdf',
    });
  };

  const handleDeleteDocument = async (document: DocumentItem) => {
    try {
      if (authState.family) {
        await deleteDocument(document.id, document.filePath || undefined);
      }

      updateState((current) => ({
        ...current,
        documents: current.documents.filter((entry) => entry.id !== document.id),
      }));

      setDocumentEditState((current) => (current?.id === document.id ? null : current));
      setDocumentPreviewState((current) => (current?.id === document.id ? null : current));

      setCloudSync({
        phase: 'ready',
        message: 'Dokument wurde gelöscht.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get('email') || '').trim();
    const role = String(form.get('role') || 'familyuser').trim() as UserRole;

    if (
      !authState.family ||
      !authState.profile ||
      !email ||
      (role !== 'admin' && role !== 'familyuser')
    ) {
      return;
    }

    try {
      const result = await createFamilyInvite(
        authState.family.familyId,
        email,
        role,
        authState.profile.id,
      );

      setFamilyInvites((current) => [
        result.invite,
        ...current.filter((entry) => entry.id !== result.invite.id),
      ]);
      formElement.reset();
      setCloudSync({
        phase: 'ready',
        message: result.emailSent
          ? 'Einladung wurde gespeichert und per E-Mail verschickt.'
          : 'Einladung wurde gespeichert.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleRemoveInvite = async (inviteId: string) => {
    if (!canManageFamily) {
      return;
    }

    setPendingInviteActionId(inviteId);

    try {
      await removeFamilyInvite(inviteId);
      setFamilyInvites((current) => current.filter((invite) => invite.id !== inviteId));
      setCloudSync({
        phase: 'ready',
        message: 'Einladung wurde zurückgezogen.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setPendingInviteActionId((current) => (current === inviteId ? null : current));
    }
  };

  const handleAddShopping = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') || '').trim();
    const quantity = String(form.get('quantity') || '').trim();
    const category = String(form.get('category') || '').trim();

    if (!name || !quantity || !category) {
      return;
    }

    try {
      if (authState.family) {
        const createdItem = await createShoppingItem(authState.family.familyId, {
          name,
          quantity,
          category,
          checked: false,
        });

        updateState((current) => ({
          ...current,
          shoppingItems: [createdItem, ...current.shoppingItems],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Neuer Einkaufsartikel wurde in Supabase gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          shoppingItems: [
            { id: nextStringId(), name, quantity, category, checked: false },
            ...current.shoppingItems,
          ],
        }));
      }

      formElement.reset();
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleToggleShopping = async (id: string, checked: boolean) => {
    try {
      if (authState.family) {
        await updateShoppingItemChecked(id, checked);
      }

      updateState((current) => ({
        ...current,
        shoppingItems: current.shoppingItems.map((entry) =>
          entry.id === id ? { ...entry, checked } : entry,
        ),
      }));
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleAddTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') || '').trim();
    const owner = String(form.get('owner') || '').trim();
    const due = String(form.get('due') || '').trim();

    if (!title || !owner || !due) {
      return;
    }

    try {
      if (authState.family) {
        const createdTask = await createTask(authState.family.familyId, {
          title,
          owner,
          due,
          done: false,
        });

        updateState((current) => ({
          ...current,
          tasks: [createdTask, ...current.tasks],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Neue Aufgabe wurde in Supabase gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          tasks: [{ id: nextStringId(), title, owner, due, done: false }, ...current.tasks],
        }));
      }

      formElement.reset();
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleToggleTask = async (id: string, done: boolean) => {
    try {
      if (authState.family) {
        await updateTaskDone(id, done);
      }

      updateState((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (entry.id === id ? { ...entry, done } : entry)),
      }));
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleAddNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') || '').trim();
    const tag = String(form.get('tag') || '').trim();
    const text = String(form.get('text') || '').trim();

    if (!title || !tag || !text) {
      return;
    }

    try {
      if (authState.family) {
        const createdNote = await createNote(authState.family.familyId, {
          title,
          text,
          tag,
        });

        updateState((current) => ({
          ...current,
          notes: [createdNote, ...current.notes],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Notiz wurde in Supabase gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          notes: [{ id: nextStringId(), title, text, tag }, ...current.notes],
        }));
      }

      formElement.reset();
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleAddCalendar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') || '').trim();
    const date = String(form.get('date') || '').trim();
    const time = String(form.get('time') || '').trim();
    const place = String(form.get('place') || '').trim();

    if (!title || !date || !time || !place) {
      return;
    }

    try {
      if (authState.family) {
        const createdEntry = await createCalendarEntry(authState.family.familyId, {
          title,
          date,
          time,
          place,
        });

        updateState((current) => ({
          ...current,
          calendar: [createdEntry, ...current.calendar],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Kalendereintrag wurde in Supabase gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          calendar: [{ id: nextStringId(), title, date, time, place }, ...current.calendar],
        }));
      }

      const structuredDate = parseCalendarDateKey(date);

      if (structuredDate) {
        setCalendarViewDate(getMonthStart(structuredDate));
        setSelectedCalendarDate(toCalendarDateKey(structuredDate));
      }

      formElement.reset();
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleShowTodayInCalendar = () => {
    const today = new Date();
    setCalendarViewDate(getMonthStart(today));
    setSelectedCalendarDate(toCalendarDateKey(today));
  };

  const handleChangeCalendarMonth = (amount: number) => {
    const nextMonth = shiftMonth(calendarViewDate, amount);
    setCalendarViewDate(nextMonth);
    setSelectedCalendarDate(toCalendarDateKey(nextMonth));
  };

  const handleAddMeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const day = String(form.get('day') || '').trim();
    const meal = String(form.get('meal') || '').trim();

    if (!day || !meal) {
      return;
    }

    try {
      if (authState.family) {
        const createdMeal = await createMeal(authState.family.familyId, {
          day,
          meal,
          prepared: false,
        });

        updateState((current) => ({
          ...current,
          meals: [createdMeal, ...current.meals],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Gericht wurde in Supabase gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          meals: [{ id: nextStringId(), day, meal, prepared: false }, ...current.meals],
        }));
      }

      formElement.reset();
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleToggleMealPrepared = async (id: string, prepared: boolean) => {
    try {
      if (authState.family) {
        await updateMealPrepared(id, prepared);
      }

      updateState((current) => ({
        ...current,
        meals: current.meals.map((entry) => (entry.id === id ? { ...entry, prepared } : entry)),
      }));
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleAddDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') || '').trim();
    const category = String(form.get('category') || '').trim();
    const status = String(form.get('status') || '').trim();
    const linkUrl = String(form.get('linkUrl') || '').trim();
    const fileInput = form.get('file');
    const selectedFiles =
      selectedDocumentFiles.length > 0
        ? selectedDocumentFiles
        : fileInput instanceof File && fileInput.size > 0
          ? [fileInput]
          : [];

    if (!name && !linkUrl && selectedFiles.length === 0) {
      setCloudSync({
        phase: 'error',
        message: 'Bitte einen Dokumentnamen, einen Link oder mindestens eine Datei angeben.',
      });
      return;
    }

    if (linkUrl && selectedFiles.length > 0) {
      setCloudSync({
        phase: 'error',
        message: 'Bitte entweder einen Link oder eine Datei angeben, nicht beides gleichzeitig.',
      });
      return;
    }

    if (selectedFiles.length > 0 && !authState.family) {
      setCloudSync({
        phase: 'error',
        message: 'Datei-Uploads sind nur mit Supabase-Anmeldung und Familienkonto verfügbar.',
      });
      return;
    }

    if (selectedFiles.length > 0 && !validateDocumentFiles(selectedFiles)) {
      return;
    }

    try {
      if (authState.family) {
        if (selectedFiles.length > 0) {
          const createdDocuments: DocumentItem[] = [];

          for (const [index, file] of selectedFiles.entries()) {
            setDocumentUploadProgress({
              completed: index,
              total: selectedFiles.length,
              currentName: file.name,
            });

            const uploadedFile = await uploadDocumentFile(authState.family.familyId, file);
            const metadata = resolveDocumentMetadata({
              name: selectedFiles.length === 1 ? name : '',
              category,
              status,
              file,
            });
            const createdDocument = await createDocument(authState.family.familyId, {
              name: metadata.name,
              category: metadata.category,
              status: metadata.status,
              linkUrl: '',
              filePath: uploadedFile.filePath,
            });

            createdDocuments.push(createdDocument);
          }

          updateState((current) => ({
            ...current,
            documents: [...createdDocuments.reverse(), ...current.documents],
          }));
        } else {
          const metadata = resolveDocumentMetadata({
            name,
            category,
            status,
          });
          const createdDocument = await createDocument(authState.family.familyId, {
            name: metadata.name,
            category: metadata.category,
            status: metadata.status,
            linkUrl,
            filePath: '',
          });

          updateState((current) => ({
            ...current,
            documents: [createdDocument, ...current.documents],
          }));
        }

        setCloudSync({
          phase: 'ready',
          message:
            selectedFiles.length > 1
              ? `${selectedFiles.length} Dokumente wurden in Supabase gespeichert.`
              : 'Dokument wurde in Supabase gespeichert.',
        });
      } else {
        const metadata = resolveDocumentMetadata({
          name,
          category,
          status,
        });
        updateState((current) => ({
          ...current,
          documents: [
            {
              id: nextStringId(),
              name: metadata.name,
              category: metadata.category,
              status: metadata.status,
              linkUrl,
              filePath: '',
            },
            ...current.documents,
          ],
        }));
      }

      formElement.reset();
      setSelectedDocumentFiles([]);
      setDocumentSelectionErrors([]);
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setDocumentUploadProgress(null);
    }
  };

  const authDriven = authState.stage === 'authenticated';
  const footerSyncMessage = getFooterSyncMessage({
    authDriven,
    supabaseConfigured,
    storageMode: plannerState.storageMode,
    cloudSyncPhase: cloudSync.phase,
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Family OS</p>
          <h1>Familienplaner</h1>
          <p className="sidebar-copy">
            Ein gemeinsamer Ort für Erledigungen, Termine, Essen und wichtige Unterlagen.
          </p>
        </div>

        <div className="status-card">
          <span>Heute offen</span>
          <strong>{openTasks} To-dos</strong>
          <small>{pendingShopping} Einkäufe fehlen noch</small>
        </div>

        <nav className="tab-list" aria-label="Module">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="account-card">
          <p className="eyebrow">Konto</p>
          <div className="account-family-summary">
            <strong>{authState.family?.familyName ?? plannerState.familyName}</strong>
            <div className="account-meta-row">
              <span className="chip">{adminCount} Admin</span>
              {authState.profile ? <span className="chip alt">{authState.profile.role}</span> : null}
            </div>
          </div>
          {authState.profile ? (
            <div className="account-identity">
              <strong>{authState.profile.display_name}</strong>
              <small>{authState.profile.email}</small>
              <button type="button" className="secondary-action" onClick={() => void onSignOut()}>
                Abmelden
              </button>
            </div>
          ) : (
            <div className="account-identity">
              <strong>Demo-Modus</strong>
              <small>Supabase ist noch nicht verbunden. Die Daten bleiben lokal im Browser.</small>
            </div>
          )}
          {!authDriven && plannerState.members.length > 0 ? (
            <div className="member-switcher">
              {plannerState.members.map((member) => {
                const locked = authDriven && member.id !== authState.profile?.id;

                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={locked}
                    className={plannerState.activeUserId === member.id ? 'member-pill active' : 'member-pill'}
                    onClick={() => updateState((current) => ({ ...current, activeUserId: member.id }))}
                  >
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="content">
        {authState.message ? <p className="auth-feedback auth-message planner-feedback">{authState.message}</p> : null}
        {authState.error ? <p className="auth-feedback auth-error planner-feedback">{authState.error}</p> : null}

        <section className={activeTab === 'overview' ? 'overview-stack is-visible' : 'overview-stack'}>
          <article className="panel overview-row-panel">
            <div className="panel-heading">
              <h3>To-dos</h3>
              <span className="chip alt">{openTasks} offen</span>
            </div>
            {plannerState.tasks.length > 0 ? (
              <ul className="task-list compact">
                {plannerState.tasks.slice(0, 5).map((task) => (
                  <li key={task.id} className={task.done ? 'done' : ''}>
                    <button
                      type="button"
                      className="ghost-toggle"
                      onClick={() => void handleToggleTask(task.id, !task.done)}
                    >
                      {task.done ? 'Erledigt' : 'Offen'}
                    </button>
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        {task.owner} · {task.due}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overview-empty-state">
                <strong>Keine offenen To-dos</strong>
                <small>Neue Aufgaben tauchen hier automatisch auf.</small>
              </div>
            )}
          </article>

          <article className="panel overview-row-panel">
            <div className="panel-heading">
              <h3>Kalender</h3>
              <span className="chip">{plannerState.calendar.length} Termine</span>
            </div>
            {plannerState.calendar.length > 0 ? (
              <ul className="agenda-list compact">
                {sortedCalendarEntries.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.title}</strong>
                      <small>{formatCalendarEntrySchedule(entry)}</small>
                    </div>
                    <span>{entry.place}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overview-empty-state">
                <strong>Keine Termine geplant</strong>
                <small>Neue Termine erscheinen hier als Nächstes.</small>
              </div>
            )}
          </article>

        </section>

        <section className={activeTab === 'shopping' ? 'module is-visible' : 'module'}>
          <div className="section-header">
            <h3>Einkaufsliste</h3>
            <p>Praktisch für den Wocheneinkauf oder spontane Besorgungen.</p>
          </div>
          <div className="module-layout">
            <form className="panel form-panel" onSubmit={(event) => void handleAddShopping(event)}>
              <h4>Neuen Artikel hinzufügen</h4>
              <input name="name" placeholder="Artikel" />
              <input name="quantity" placeholder="Menge" />
              <input name="category" placeholder="Kategorie" />
              <button type="submit">Artikel speichern</button>
            </form>
            <article className="panel list-panel">
              <ul className="check-list">
                {plannerState.shoppingItems.map((item) => (
                  <li key={item.id} className={item.checked ? 'done' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => void handleToggleShopping(item.id, !item.checked)}
                      />
                      <span>{item.name}</span>
                    </label>
                    <small>
                      {item.quantity} · {item.category}
                    </small>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={activeTab === 'tasks' ? 'module is-visible' : 'module'}>
          <div className="section-header">
            <h3>To-do-Listen</h3>
            <p>Aufgaben lassen sich der Familie zuweisen und schnell abhaken.</p>
          </div>
          <div className="module-layout">
            <form className="panel form-panel" onSubmit={(event) => void handleAddTask(event)}>
              <h4>Neue Aufgabe</h4>
              <input name="title" placeholder="Aufgabe" />
              <input
                name="owner"
                placeholder="Verantwortlich"
                defaultValue={authState.profile?.display_name ?? activeMember?.name ?? ''}
              />
              <input name="due" placeholder="Fällig am" />
              <button type="submit">Aufgabe speichern</button>
            </form>
            <article className="panel list-panel">
              <ul className="task-list">
                {plannerState.tasks.map((task) => (
                  <li key={task.id} className={task.done ? 'done' : ''}>
                    <button
                      type="button"
                      className="ghost-toggle"
                      onClick={() => void handleToggleTask(task.id, !task.done)}
                    >
                      {task.done ? 'Erledigt' : 'Offen'}
                    </button>
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        {task.owner} · {task.due}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={activeTab === 'notes' ? 'module is-visible' : 'module'}>
          <div className="section-header">
            <h3>Notizen</h3>
            <p>Für spontane Ideen, Absprachen und Familieninfos.</p>
          </div>
          <div className="module-layout">
            <form className="panel form-panel" onSubmit={(event) => void handleAddNote(event)}>
              <h4>Neue Notiz</h4>
              <input name="title" placeholder="Titel" />
              <input name="tag" placeholder="Kategorie" />
              <textarea name="text" placeholder="Inhalt" rows={5} />
              <button type="submit">Notiz speichern</button>
            </form>
            <article className="panel masonry-panel">
              <div className="notes-grid">
                {plannerState.notes.map((note) => (
                  <article key={note.id} className="note-card">
                    <span className="chip alt">{note.tag}</span>
                    <h4>{note.title}</h4>
                    <p>{note.text}</p>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className={activeTab === 'calendar' ? 'module is-visible' : 'module'}>
          <div className="section-header">
            <h3>Kalender</h3>
            <p>Wichtige Termine für Schule, Freizeit und Familie.</p>
          </div>
          <div className="module-layout calendar-module-layout">
            <form className="panel form-panel" onSubmit={(event) => void handleAddCalendar(event)}>
              <h4>Termin anlegen</h4>
              <input name="title" placeholder="Titel" />
              <input name="date" type="date" aria-label="Datum" />
              <input name="time" type="time" aria-label="Uhrzeit" />
              <input name="place" placeholder="Ort" />
              <small className="calendar-form-hint">
                Monatsansicht und Tagesdetails aktualisieren sich sofort nach dem Speichern.
              </small>
              <button type="submit">Termin speichern</button>
            </form>
            <article className="panel list-panel calendar-panel">
              <div className="calendar-shell">
                <div className="calendar-toolbar">
                  <div>
                    <h4>{formatCalendarMonthLabel(calendarViewDate)}</h4>
                    <small>{visibleMonthEventCount} Termine im sichtbaren Monat</small>
                  </div>
                  <div className="calendar-toolbar-actions">
                    <button type="button" className="secondary-action" onClick={handleShowTodayInCalendar}>
                      Heute
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      aria-label="Vorheriger Monat"
                      onClick={() => handleChangeCalendarMonth(-1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      aria-label="Nächster Monat"
                      onClick={() => handleChangeCalendarMonth(1)}
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="calendar-weekday-row" aria-hidden="true">
                  {CALENDAR_WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="calendar-grid" role="grid" aria-label="Monatskalender">
                  {calendarMonth.flat().map((day) => (
                    <button
                      key={day.dateKey}
                      type="button"
                      role="gridcell"
                      className={[
                        'calendar-day-cell',
                        day.isCurrentMonth ? '' : 'is-outside-month',
                        day.isToday ? 'is-today' : '',
                        day.isSelected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={getCalendarDayButtonLabel(day.date, day.entries.length)}
                      onClick={() => setSelectedCalendarDate(day.dateKey)}
                    >
                      <span className="calendar-day-number">{day.dayNumber}</span>
                      <div className="calendar-day-events">
                        {day.entries.slice(0, 3).map((entry) => (
                          <span key={entry.id} className="calendar-event-pill">
                            {entry.time.trim() ? `${entry.time} ${entry.title}` : entry.title}
                          </span>
                        ))}
                        {day.entries.length > 3 ? (
                          <span className="calendar-more-events">+{day.entries.length - 3} weitere</span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="calendar-detail-grid">
                  <section className="calendar-day-panel">
                    <div className="panel-heading panel-heading-tight">
                      <div>
                        <h4>{formatCalendarDateLabel(selectedCalendarDate)}</h4>
                        <small>{selectedDayEntries.length} Termine ausgewählt</small>
                      </div>
                    </div>
                    {selectedDayEntries.length > 0 ? (
                      <ul className="agenda-list calendar-day-list">
                        {selectedDayEntries.map((entry) => (
                          <li key={entry.id}>
                            <div>
                              <strong>{entry.title}</strong>
                              <small>{getCalendarMetaParts(entry)}</small>
                            </div>
                            <span>{formatCalendarEntrySchedule(entry)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="overview-empty-state calendar-empty-state">
                        <strong>Kein Termin an diesem Tag</strong>
                        <small>Wähle einen anderen Tag oder lege links einen neuen Termin an.</small>
                      </div>
                    )}
                  </section>

                  {unscheduledCalendarEntries.length > 0 ? (
                    <section className="calendar-day-panel calendar-unscheduled-panel">
                      <div className="panel-heading panel-heading-tight">
                        <div>
                          <h4>Ohne klares Datum</h4>
                          <small>Ältere Einträge mit Freitext bleiben sichtbar, bis du sie neu anlegst.</small>
                        </div>
                      </div>
                      <ul className="agenda-list calendar-day-list">
                        {unscheduledCalendarEntries.map((entry) => (
                          <li key={entry.id}>
                            <div>
                              <strong>{entry.title}</strong>
                              <small>{[entry.date.trim(), getCalendarMetaParts(entry)].filter(Boolean).join(' · ')}</small>
                            </div>
                            <span>{entry.place}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className={activeTab === 'meals' ? 'module is-visible' : 'module'}>
          <div className="section-header">
            <h3>Essensplan</h3>
            <p>Plant Mahlzeiten für die Woche und haltet den Überblick über Vorbereitungen.</p>
          </div>
          <div className="module-layout">
            <form className="panel form-panel" onSubmit={(event) => void handleAddMeal(event)}>
              <h4>Gericht eintragen</h4>
              <input name="day" placeholder="Wochentag" />
              <input name="meal" placeholder="Gericht" />
              <button type="submit">Gericht speichern</button>
            </form>
            <article className="panel list-panel">
              <ul className="meal-list">
                {plannerState.meals.map((meal) => (
                  <li key={meal.id} className={meal.prepared ? 'done' : ''}>
                    <button
                      type="button"
                      className="ghost-toggle"
                      onClick={() => void handleToggleMealPrepared(meal.id, !meal.prepared)}
                    >
                      {meal.prepared ? 'Bereit' : 'Planen'}
                    </button>
                    <div>
                      <strong>{meal.day}</strong>
                      <small>{meal.meal}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={activeTab === 'documents' ? 'module is-visible' : 'module'}>
          {cloudSync.phase === 'error' && cloudSync.message ? (
            <p
              className={
                cloudSync.phase === 'error'
                  ? 'auth-feedback auth-error module-feedback'
                  : 'auth-feedback auth-message module-feedback'
              }
            >
              {cloudSync.message}
            </p>
          ) : null}
          {documentSelectionErrors.length > 0 ? (
            <div className="auth-feedback auth-error module-feedback" aria-live="polite">
              <strong>Dateiauswahl prüfen</strong>
              <ul className="document-error-list">
                {documentSelectionErrors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="module-layout document-module-layout">
            <form className="panel form-panel document-form-panel" onSubmit={(event) => void handleAddDocument(event)}>
              <h4>Dokument erfassen</h4>
              <div className="document-form-grid">
                <input name="name" placeholder="Dokument" />
                <input name="category" placeholder="Kategorie" />
                <input name="status" placeholder="Status" />
                <input name="linkUrl" type="url" placeholder="Link zum Dokument (optional)" />
              </div>
              <label
                className={isDocumentDropActive ? 'file-input-label is-drag-active' : 'file-input-label'}
                onDrop={handleDocumentDrop}
                onDragOver={handleDocumentDragOver}
                onDragLeave={handleDocumentDragLeave}
              >
                <span>Datei hochladen (optional)</span>
                <small>
                  PDF, Bilder, Word-Dateien oder mehrere Dateien hier hineinziehen. Maximal
                  erlaubt sind 15 MB pro Datei.
                </small>
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleDocumentInputChange}
                />
              </label>
              {selectedDocumentFiles.length > 0 ? (
                <div className="selected-file-list">
                  <div className="selected-file-summary">
                    <strong>{selectedDocumentFiles.length} Datei(en) ausgewählt</strong>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={handleClearSelectedDocumentFiles}
                    >
                      Auswahl leeren
                    </button>
                  </div>
                  {selectedDocumentFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="selected-file-card">
                      <div>
                        <strong>{file.name}</strong>
                        <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                      </div>
                      <button
                        type="button"
                        className="secondary-action selected-file-remove"
                        onClick={() => handleRemoveSelectedDocumentFile(file)}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              {documentUploadProgress ? (
                <div className="upload-progress-card" aria-live="polite">
                  <strong>
                    Upload {documentUploadProgress.completed + 1} von {documentUploadProgress.total}
                  </strong>
                  <small>{documentUploadProgress.currentName}</small>
                  <div className="upload-progress-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            (documentUploadProgress.completed / documentUploadProgress.total) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
              <button type="submit">Dokument speichern</button>
            </form>
            <article className="panel list-panel">
              <div className="document-toolbar">
                <div className="document-toolbar-copy">
                  <strong>{visibleDocuments.length} Dokumente sichtbar</strong>
                  <small>{plannerState.documents.length} insgesamt</small>
                </div>
                <div className="document-filter-grid">
                  <input
                    aria-label="Dokumente suchen"
                    placeholder="Dokumente suchen"
                    value={documentSearchTerm}
                    onChange={(event) => setDocumentSearchTerm(event.currentTarget.value)}
                  />
                  <select
                    aria-label="Dokumentstatus filtern"
                    value={documentStatusFilter}
                    onChange={(event) => setDocumentStatusFilter(event.currentTarget.value)}
                  >
                    <option value="all">Alle Status</option>
                    {documentStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Dokumenttyp filtern"
                    value={documentKindFilter}
                    onChange={(event) => setDocumentKindFilter(event.currentTarget.value as DocumentFilterKind)}
                  >
                    {DOCUMENT_KIND_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Dokumente sortieren"
                    value={documentSort}
                    onChange={(event) => setDocumentSort(event.currentTarget.value as DocumentSortOption)}
                  >
                    {DOCUMENT_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="document-list document-grid">
                {visibleDocuments.length > 0 ? (
                  visibleDocuments.map((document) => (
                    <li key={document.id}>
                      <div>
                        <div className="document-entry-head">
                          {isPreviewableImage(document) ? (
                            <img
                              className="document-preview"
                              src={document.linkUrl}
                              alt={`Vorschau für ${document.name}`}
                            />
                          ) : (
                            <span className="document-icon" aria-hidden="true">
                              {getDocumentIcon(document)}
                            </span>
                          )}
                          <div className="document-entry-copy">
                            <strong>{document.name}</strong>
                            <small className="document-meta-line">
                              {getDocumentMetaParts(document).map((part, index) => (
                                <span key={part.key} className={`document-meta-part document-meta-part-${part.tone}`}>
                                  {index > 0 ? <span className="document-meta-separator"> · </span> : null}
                                  <span>{part.value}</span>
                                </span>
                              ))}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="document-actions">
                        {document.linkUrl ? (
                          <a
                            className="secondary-action document-action-button document-link-button document-open-button"
                            href={document.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {document.filePath ? 'Datei öffnen' : 'Link öffnen'}
                          </a>
                        ) : null}
                        {canPreviewDocument(document) && document.linkUrl ? (
                          <button
                            type="button"
                            className="secondary-action document-action-button document-preview-button"
                            aria-label={`Dokument ${document.name} in Vorschau öffnen`}
                            onClick={() => handleOpenDocumentPreview(document)}
                          >
                            Vorschau
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="secondary-action document-action-button document-edit-button"
                          aria-label={`Dokument ${document.name} bearbeiten`}
                          onClick={() => handleStartDocumentEdit(document)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="secondary-action document-delete-button"
                          aria-label={`Dokument ${document.name} löschen`}
                          onClick={() => void handleDeleteDocument(document)}
                        >
                          Löschen
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="document-empty-state">
                    <div>
                      <strong>Keine Dokumente gefunden</strong>
                      <small>Prüfe Suche, Filter oder lege ein neues Dokument an.</small>
                    </div>
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>

        {documentEditState ? (
          <div className="modal-backdrop" role="presentation">
            <section
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-edit-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Dokument bearbeiten</p>
                  <h3 id="document-edit-title">{documentEditState.name}</h3>
                </div>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setDocumentEditState(null)}
                >
                  Schließen
                </button>
              </div>
              <form className="modal-form" onSubmit={(event) => void handleSaveDocumentEdit(event)}>
                <input
                  aria-label="Dokumentname bearbeiten"
                  value={documentEditState.name}
                  onChange={(event) => handleDocumentEditFieldChange('name', event.currentTarget.value)}
                />
                <input
                  aria-label="Dokumentkategorie bearbeiten"
                  value={documentEditState.category}
                  onChange={(event) => handleDocumentEditFieldChange('category', event.currentTarget.value)}
                />
                <input
                  aria-label="Dokumentstatus bearbeiten"
                  value={documentEditState.status}
                  onChange={(event) => handleDocumentEditFieldChange('status', event.currentTarget.value)}
                />
                {documentEditState.filePath ? (
                  <p className="modal-note">Datei-Uploads behalten ihren Storage-Link. Nur die Metadaten werden geändert.</p>
                ) : (
                  <input
                    aria-label="Dokumentlink bearbeiten"
                    type="url"
                    placeholder="Link zum Dokument"
                    value={documentEditState.linkUrl}
                    onChange={(event) => handleDocumentEditFieldChange('linkUrl', event.currentTarget.value)}
                  />
                )}
                <div className="modal-actions">
                  <button type="button" className="secondary-action" onClick={() => setDocumentEditState(null)}>
                    Abbrechen
                  </button>
                  <button type="submit">Änderungen speichern</button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {documentPreviewState ? (
          <div className="modal-backdrop" role="presentation">
            <section
              className="modal-card modal-card-wide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-preview-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Dokument-Vorschau</p>
                  <h3 id="document-preview-title">{documentPreviewState.name}</h3>
                </div>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setDocumentPreviewState(null)}
                >
                  Schließen
                </button>
              </div>
              <div className="document-preview-modal-body">
                {documentPreviewState.kind === 'image' ? (
                  <img
                    className="document-preview-full"
                    src={documentPreviewState.url}
                    alt={`Vorschau für ${documentPreviewState.name}`}
                  />
                ) : (
                  <iframe
                    className="document-preview-frame"
                    src={documentPreviewState.url}
                    title={`PDF-Vorschau für ${documentPreviewState.name}`}
                  />
                )}
              </div>
              <div className="modal-actions">
                <a
                  className="secondary-action modal-link-button"
                  href={documentPreviewState.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  In neuem Tab öffnen
                </a>
              </div>
            </section>
          </div>
        ) : null}

        <section className={activeTab === 'family' && canManageFamily ? 'module is-visible' : 'module'}>
          {cloudSync.message ? (
            <p
              className={
                cloudSync.phase === 'error'
                  ? 'auth-feedback auth-error module-feedback'
                  : 'auth-feedback auth-message module-feedback'
              }
            >
              {cloudSync.message}
            </p>
          ) : null}
          <div className="section-header">
            <h3>Familie & Rollen</h3>
            <p>Admin verwaltet Mitglieder und Familyuser arbeitet im Alltag mit.</p>
          </div>
          <div className="module-layout role-layout">
            <article className="panel list-panel">
              <div className="panel-heading">
                <h4>Mitglieder & Rollen</h4>
                <span className="chip alt">{effectiveRole}</span>
              </div>
              <ul className="document-list">
                {plannerState.members.length > 0 ? (
                  plannerState.members.map((member) => (
                    <li key={member.id}>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </div>
                      <span className="chip alt">{member.role}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <div>
                      <strong>Noch keine Mitglieder geladen</strong>
                      <small>Nach Login und Familienzuordnung werden echte Mitglieder aus Supabase angezeigt.</small>
                    </div>
                  </li>
                )}
              </ul>
              <div className="panel-heading panel-heading-tight">
                <h4>Offene Einladungen</h4>
                <span className="chip">{familyInvites.length}</span>
              </div>
              <ul className="document-list compact">
                {familyInvites.length > 0 ? (
                  familyInvites.map((invite) => (
                    <li key={invite.id}>
                      <div>
                        <strong>{invite.email}</strong>
                        <small>Wartet auf Registrierung oder nächsten Login</small>
                      </div>
                      <div className="invite-actions">
                        <span className="chip alt">{invite.role}</span>
                        {canManageFamily ? (
                          <button
                            type="button"
                            className="ghost-toggle"
                            disabled={pendingInviteActionId === invite.id}
                            aria-label={`Einladung für ${invite.email} zurückziehen`}
                            onClick={() => void handleRemoveInvite(invite.id)}
                          >
                            {pendingInviteActionId === invite.id ? 'Wird entfernt…' : 'Zurückziehen'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div>
                      <strong>Keine offenen Einladungen</strong>
                      <small>Neue Familienmitglieder erscheinen hier, bis sie die Einladung annehmen.</small>
                    </div>
                  </li>
                )}
              </ul>
            </article>

            <form className="panel form-panel" onSubmit={(event) => void handleAddMember(event)}>
              <h4>Familienmitglied einladen</h4>
              <input name="email" placeholder="E-Mail" disabled={!canManageFamily} />
              <select name="role" defaultValue="familyuser" disabled={!canManageFamily}>
                <option value="familyuser">familyuser</option>
                <option value="admin">admin</option>
              </select>
              <button type="submit" disabled={!canManageFamily}>
                {canManageFamily ? 'Einladung senden' : 'Nur Admin kann Einladungen senden'}
              </button>
              <small>
                Die Einladung wird per E-Mail verschickt. Sobald sich der Nutzer mit derselben
                E-Mail registriert oder anmeldet, wird die Familienzuordnung automatisch uebernommen.
              </small>
            </form>
          </div>
        </section>

        {!authDriven ? <section className="module reset-panel is-visible">
          <button
            type="button"
            className="reset-button"
            onClick={() => setPlannerState(defaultPlannerState)}
          >
            Lokale Daten zurücksetzen
          </button>
        </section> : null}

        <footer className="planner-footer-status" aria-live="polite">
          <small>{footerSyncMessage}</small>
        </footer>
      </main>
    </div>
  );
}

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
  const [plannerState, setPlannerState] = useState<PlannerState>(() => loadPlannerState());
  const [familyInvites, setFamilyInvites] = useState<SupabaseFamilyInvite[]>([]);
  const [authDraft, setAuthDraft] = useState<AuthDraft>(EMPTY_AUTH_DRAFT);
  const [authMode, setAuthMode] = useState<AuthMode>(redirectAuthMode ?? 'sign-in');
  const [authBusy, setAuthBusy] = useState(false);
  const blocksSessionHydrationAfterRecovery = useRef(redirectAuthMode === 'reset-password');
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
  });

  useEffect(() => {
    savePlannerState(plannerState);
  }, [plannerState]);

  useEffect(() => {
    if (typeof window === 'undefined' || !redirectAuthMessage) {
      return;
    }

    window.history.replaceState({}, document.title, clearAuthRedirectState(window.location.href));
  }, [redirectAuthMessage]);

  useEffect(() => {
    if (!authState.profile) {
      return;
    }

    setPlannerState((current) => syncPlannerWithAuth(current, authState.profile!, authState.family));
  }, [authState.profile, authState.family]);

  useEffect(() => {
    if (authState.stage !== 'authenticated' || !authState.family) {
      setFamilyInvites([]);
      setCloudSync({
        phase: 'idle',
        message: null,
      });
      return;
    }

    let cancelled = false;

    const loadCloudCollections = async () => {
      setCloudSync({
        phase: 'loading',
        message: 'Alle Planer-Module werden aus Supabase geladen.',
      });

      try {
        const [shoppingItems, tasks, notes, calendar, meals, documents, members, invites] = await Promise.all([
          fetchShoppingItems(authState.family!.familyId),
          fetchTasks(authState.family!.familyId),
          fetchNotes(authState.family!.familyId),
          fetchCalendarEntries(authState.family!.familyId),
          fetchMeals(authState.family!.familyId),
          fetchDocuments(authState.family!.familyId),
          fetchFamilyMembers(authState.family!.familyId),
          fetchFamilyInvites(authState.family!.familyId),
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
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCloudSync({
          phase: 'error',
          message: humanizeAuthError(error),
        });
      }
    };

    void loadCloudCollections();

    return () => {
      cancelled = true;
    };
  }, [authState.stage, authState.family, authState.profile?.id]);

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
      <div className="auth-shell">
        <section className="auth-card auth-card-compact">
          <p className="eyebrow">Wird geladen</p>
          <h1>Supabase Session wird geprüft</h1>
          <p>Die App lädt Profil, Rolle und Familienzuordnung.</p>
        </section>
      </div>
    );
  }

  if (authState.stage === 'signed-out') {
    return (
      <AuthScreen
        mode={authMode}
        busy={authBusy}
        error={authState.error}
        message={authState.message}
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
    );
  }

  if (authState.stage === 'onboarding' && authState.profile) {
    return (
      <OnboardingScreen
        profile={authState.profile}
        busy={authBusy}
        error={authState.error}
        message={authState.message}
        onSubmit={handleCreateFamily}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
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
    />
  );
}