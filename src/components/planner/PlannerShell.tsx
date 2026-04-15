import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { defaultPlannerState, tabs, type DocumentItem, type PlannerState, type TabId, type UserRole } from '../../lib/planner-data';
import { humanizeAuthError } from '../../lib/auth-errors';
import {
  buildCalendarMonth,
  getCalendarEntryDateKey,
  getMonthStart,
  parseCalendarDateKey,
  shiftMonth,
  sortCalendarEntries,
  toCalendarDateKey,
} from '../../lib/calendar-view';
import {
  mergeDocumentFiles,
  resolveDocumentMetadata,
  validateSelectedDocumentFiles,
} from '../../lib/document-upload';
import {
  createCalendarEntry,
  createDocument,
  createFamilyInvite,
  createMeal,
  createNote,
  createShoppingItem,
  createTask,
  deleteDocument,
  fetchAdminFamilyDirectory,
  removeFamilyInvite,
  updateDocument,
  updateMealPrepared,
  updateShoppingItemChecked,
  updateTaskDone,
  uploadDocumentFile,
  type AdminFamilyDirectoryFamily,
  type SupabaseFamilyContext,
  type SupabaseFamilyInvite,
} from '../../lib/supabase';
import type {
  AuthState,
  CloudSyncSetterValue,
  CloudSyncState,
  DocumentEditState,
  DocumentFilterKind,
  DocumentPreviewState,
  DocumentSortOption,
  PendingFamilyDeletionState,
  PendingMemberDeletionState,
} from '../../app/types';
import { AccountCard } from './AccountCard';
import { CalendarModule } from './CalendarModule';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DocumentEditModal } from './DocumentEditModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentsModule } from './DocumentsModule';
import { FamilyModule } from './FamilyModule';
import { MealsModule } from './MealsModule';
import { NotesModule } from './NotesModule';
import { PlannerOverview } from './PlannerOverview';
import { PlannerSidebar } from './PlannerSidebar';
import { PlannerTopbar } from './PlannerTopbar';
import { ShoppingModule } from './ShoppingModule';
import { TasksModule } from './TasksModule';
import {
  canPreviewDocument,
  compareDocumentLabels,
  getDocumentKind,
} from './planner-shell-utils';
import { nextStringId } from '../../lib/id';

type PlannerShellProps = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  plannerState: PlannerState;
  setPlannerState: Dispatch<SetStateAction<PlannerState>>;
  familyInvites: SupabaseFamilyInvite[];
  setFamilyInvites: Dispatch<SetStateAction<SupabaseFamilyInvite[]>>;
  authState: AuthState;
  cloudSync: CloudSyncState;
  setCloudSync: Dispatch<SetStateAction<CloudSyncState>>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onDeleteFamily: (familyId: string) => Promise<void>;
  onDeleteFamilyMemberAccount: (familyId: string, memberUserId: string) => Promise<void>;
  onUpdateFamilyRegistration: (allowOpenRegistration: boolean) => Promise<SupabaseFamilyContext>;
};

type InviteTargetFamily = {
  familyId: string;
  familyName: string;
};

function createLocalDocumentLink(file: File) {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file);
  }

  return file.name;
}

function revokeLocalDocumentLink(document: DocumentItem) {
  if (
    document.filePath
    && document.linkUrl.startsWith('blob:')
    && typeof URL !== 'undefined'
    && typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(document.linkUrl);
  }
}

export default function PlannerShell({
  activeTab,
  setActiveTab,
  plannerState,
  setPlannerState,
  familyInvites,
  setFamilyInvites,
  authState,
  cloudSync,
  setCloudSync: setCloudSyncState,
  onSignOut,
  onDeleteAccount,
  onDeleteFamily,
  onDeleteFamilyMemberAccount,
  onUpdateFamilyRegistration,
}: PlannerShellProps) {
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
  const [registrationConfigBusy, setRegistrationConfigBusy] = useState(false);
  const [adminFamilyDirectory, setAdminFamilyDirectory] = useState<AdminFamilyDirectoryFamily[]>([]);
  const [adminFamilyDirectoryBusy, setAdminFamilyDirectoryBusy] = useState(false);
  const [adminFamilyDirectoryError, setAdminFamilyDirectoryError] = useState<string | null>(null);
  const [selectedAdminFamilyId, setSelectedAdminFamilyId] = useState<string | null>(null);
  const [selectedInviteFamilyId, setSelectedInviteFamilyId] = useState<string | null>(null);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const [pendingMemberDeletion, setPendingMemberDeletion] = useState<PendingMemberDeletionState | null>(null);
  const [memberDeletionBusy, setMemberDeletionBusy] = useState(false);
  const [pendingFamilyDeletion, setPendingFamilyDeletion] = useState<PendingFamilyDeletionState | null>(null);
  const [familyDeletionBusy, setFamilyDeletionBusy] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => getMonthStart(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toCalendarDateKey(new Date()));

  const activeMember = useMemo(
    () =>
      plannerState.members.find((member) => member.id === plannerState.activeUserId)
      ?? plannerState.members[0],
    [plannerState.activeUserId, plannerState.members],
  );

  const effectiveRole = authState.profile?.role ?? activeMember?.role ?? 'familyuser';
  const canManageFamily = effectiveRole === 'admin';
  const canViewFamily = Boolean(authState.family);
  const canInviteFamilyMembers = canManageFamily || authState.family?.isOwner === true;
  const allowOpenRegistration = authState.family?.allowOpenRegistration ?? true;
  const adminInviteFamilies = useMemo<InviteTargetFamily[]>(() => {
    if (!canManageFamily) {
      return [];
    }

    if (adminFamilyDirectory.length > 0) {
      return adminFamilyDirectory.map((family) => ({
        familyId: family.familyId,
        familyName: family.familyName,
      }));
    }

    if (!authState.family) {
      return [];
    }

    return [
      {
        familyId: authState.family.familyId,
        familyName: authState.family.familyName,
      },
    ];
  }, [adminFamilyDirectory, authState.family, canManageFamily]);
  const selectedAdminFamily = useMemo(
    () =>
      adminFamilyDirectory.find((family) => family.familyId === selectedAdminFamilyId)
      ?? adminFamilyDirectory[0]
      ?? null,
    [adminFamilyDirectory, selectedAdminFamilyId],
  );
  const selectedInviteFamily = useMemo(
    () =>
      adminInviteFamilies.find((family) => family.familyId === selectedInviteFamilyId)
      ?? adminInviteFamilies[0]
      ?? null,
    [adminInviteFamilies, selectedInviteFamilyId],
  );
  const openTasks = useMemo(
    () => plannerState.tasks.filter((task) => !task.done).length,
    [plannerState.tasks],
  );
  const pendingShopping = useMemo(
    () => plannerState.shoppingItems.filter((item) => !item.checked).length,
    [plannerState.shoppingItems],
  );
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'family' || canViewFamily),
    [canViewFamily],
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
          normalizedSearchTerm
          && ![document.name, document.category, document.status]
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
          entryDate?.getFullYear() === calendarViewDate.getFullYear()
          && entryDate.getMonth() === calendarViewDate.getMonth()
        );
      }).length,
    [calendarViewDate, scheduledCalendarEntries],
  );
  const selectedDayEntries = useMemo(
    () =>
      scheduledCalendarEntries.filter((entry) => getCalendarEntryDateKey(entry) === selectedCalendarDate),
    [scheduledCalendarEntries, selectedCalendarDate],
  );
  const documentSelectionSummary = documentSelectionErrors.join(' · ');

  const setCloudSync = (value: CloudSyncSetterValue) => {
    setCloudSyncState((current) => {
      const nextValue =
        typeof value === 'function'
          ? (value as (current: CloudSyncState) => CloudSyncState | Omit<CloudSyncState, 'scope'>)(current)
          : value;

      return 'scope' in nextValue ? nextValue : { ...nextValue, scope: activeTab };
    });
  };

  useEffect(() => {
    if (!canViewFamily && activeTab === 'family') {
      setActiveTab('overview');
    }
  }, [activeTab, canViewFamily, setActiveTab]);

  useEffect(() => {
    if (authState.stage !== 'authenticated' || authState.profile?.role !== 'admin') {
      setAdminFamilyDirectory([]);
      setAdminFamilyDirectoryBusy(false);
      setAdminFamilyDirectoryError(null);
      setSelectedAdminFamilyId(null);
      return;
    }

    let cancelled = false;

    const loadAdminFamilyDirectory = async () => {
      setAdminFamilyDirectoryBusy(true);
      setAdminFamilyDirectoryError(null);

      try {
        const families = await fetchAdminFamilyDirectory();

        if (cancelled) {
          return;
        }

        setAdminFamilyDirectory(families);
        setSelectedAdminFamilyId((current) => {
          if (current && families.some((family) => family.familyId === current)) {
            return current;
          }

          const currentFamilyId = authState.family?.familyId;
          return families.find((family) => family.familyId === currentFamilyId)?.familyId ?? families[0]?.familyId ?? null;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAdminFamilyDirectory([]);
        setSelectedAdminFamilyId(null);
        setAdminFamilyDirectoryError(humanizeAuthError(error));
      } finally {
        if (!cancelled) {
          setAdminFamilyDirectoryBusy(false);
        }
      }
    };

    void loadAdminFamilyDirectory();

    return () => {
      cancelled = true;
    };
  }, [authState.family?.familyId, authState.profile?.role, authState.stage]);

  useEffect(() => {
    if (!canManageFamily) {
      setSelectedInviteFamilyId(null);
      return;
    }

    setSelectedInviteFamilyId((current) => {
      if (current && adminInviteFamilies.some((family) => family.familyId === current)) {
        return current;
      }

      const currentFamilyId = authState.family?.familyId;
      return adminInviteFamilies.find((family) => family.familyId === currentFamilyId)?.familyId
        ?? adminInviteFamilies[0]?.familyId
        ?? null;
    });
  }, [adminInviteFamilies, authState.family?.familyId, canManageFamily]);

  useEffect(() => {
    if (!cloudSync.message || cloudSync.phase === 'loading') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCloudSyncState((current) =>
        current.message === cloudSync.message
        && current.phase === cloudSync.phase
        && current.scope === cloudSync.scope
          ? {
              phase: 'idle',
              message: null,
              scope: null,
            }
          : current,
      );
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [cloudSync.message, cloudSync.phase, cloudSync.scope, setCloudSyncState]);

  const updateState = (updater: (current: PlannerState) => PlannerState) => {
    setPlannerState((current) => updater(current));
  };

  const handleSelectMember = (memberId: string) => {
    updateState((current) => ({ ...current, activeUserId: memberId }));
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
      current.phase === 'error' && current.scope === activeTab
        ? {
            phase: 'idle',
            message: null,
            scope: null,
          }
        : current,
    );
    setSelectedDocumentFiles(nextFiles);
    setIsDocumentDropActive(false);
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
            file.name === fileToRemove.name
            && file.size === fileToRemove.size
            && file.lastModified === fileToRemove.lastModified
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

  const handleDocumentEditFieldChange = (
    field: keyof Omit<DocumentEditState, 'id' | 'filePath'>,
    value: string,
  ) => {
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
      } else {
        revokeLocalDocumentLink(document);
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
    const targetFamilyId = canManageFamily
      ? String(form.get('familyId') || selectedInviteFamily?.familyId || '').trim()
      : authState.family?.familyId ?? '';
    const targetFamilyName = canManageFamily
      ? selectedInviteFamily?.familyName ?? authState.family?.familyName ?? 'die gewaehlte Familie'
      : authState.family?.familyName ?? 'deine Familie';

    if (
      !authState.family
      || !authState.profile
      || !canInviteFamilyMembers
      || !email
      || (role !== 'admin' && role !== 'familyuser')
      || !targetFamilyId
      || (canManageFamily && !adminInviteFamilies.some((family) => family.familyId === targetFamilyId))
    ) {
      return;
    }

    const inviteRole = canManageFamily ? role : 'familyuser';

    try {
      const result = await createFamilyInvite(targetFamilyId, email, inviteRole);

      if (result.invite.familyId === authState.family.familyId) {
        setFamilyInvites((current) => [
          result.invite,
          ...current.filter((entry) => entry.id !== result.invite.id),
        ]);
      }

      formElement.reset();
      setCloudSync({
        phase: 'ready',
        message:
          result.invite.familyId === authState.family.familyId
            ? result.emailSent
              ? 'Einladung wurde gespeichert und per E-Mail verschickt.'
              : 'Einladung wurde gespeichert.'
            : result.emailSent
              ? `Einladung fuer ${targetFamilyName} wurde gespeichert und per E-Mail verschickt.`
              : `Einladung fuer ${targetFamilyName} wurde gespeichert.`,
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    }
  };

  const handleRemoveInvite = async (inviteId: string) => {
    if (!canInviteFamilyMembers) {
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

  const handleRegistrationAccessChange = async (nextValue: boolean) => {
    if (!authState.family || !canManageFamily) {
      return;
    }

    setRegistrationConfigBusy(true);

    try {
      await onUpdateFamilyRegistration(nextValue);
      setCloudSync({
        phase: 'ready',
        message: nextValue
          ? 'Freie Registrierung wurde aktiviert.'
          : 'Freie Registrierung wurde deaktiviert.',
      });
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setRegistrationConfigBusy(false);
    }
  };

  const handleConfirmAccountDeletion = async () => {
    setDeleteAccountBusy(true);

    try {
      await onDeleteAccount();
      setIsDeleteAccountDialogOpen(false);
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setDeleteAccountBusy(false);
    }
  };

  const handleConfirmMemberDeletion = async () => {
    if (!pendingMemberDeletion) {
      return;
    }

    setMemberDeletionBusy(true);

    try {
      await onDeleteFamilyMemberAccount(pendingMemberDeletion.familyId, pendingMemberDeletion.memberId);

      setAdminFamilyDirectory((current) =>
        current.map((family) =>
          family.familyId === pendingMemberDeletion.familyId
            ? {
                ...family,
                members: family.members.filter((member) => member.id !== pendingMemberDeletion.memberId),
              }
            : family,
        ),
      );
      setSelectedAdminFamilyId(pendingMemberDeletion.familyId);

      if (authState.family?.familyId === pendingMemberDeletion.familyId) {
        updateState((current) => ({
          ...current,
          members: current.members.filter((member) => member.id !== pendingMemberDeletion.memberId),
        }));
      }

      setCloudSync({
        phase: 'ready',
        message: `${pendingMemberDeletion.memberName} wurde inklusive Konto gelöscht.`,
      });
      setPendingMemberDeletion(null);
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setMemberDeletionBusy(false);
    }
  };

  const handleConfirmFamilyDeletion = async () => {
    if (!pendingFamilyDeletion) {
      return;
    }

    setFamilyDeletionBusy(true);

    try {
      await onDeleteFamily(pendingFamilyDeletion.familyId);

      setAdminFamilyDirectory((current) =>
        current.filter((family) => family.familyId !== pendingFamilyDeletion.familyId),
      );
      setSelectedAdminFamilyId((current) =>
        current === pendingFamilyDeletion.familyId ? null : current,
      );
      setCloudSync({
        phase: 'ready',
        message: pendingFamilyDeletion.isCurrentFamily
          ? `Die Familie ${pendingFamilyDeletion.familyName} wurde gelöscht. Deine Sitzung wurde beendet.`
          : `Die Familie ${pendingFamilyDeletion.familyName} wurde gelöscht.`,
      });
      setPendingFamilyDeletion(null);
    } catch (error) {
      setCloudSync({
        phase: 'error',
        message: humanizeAuthError(error),
      });
    } finally {
      setFamilyDeletionBusy(false);
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
          message: 'Neuer Einkaufsartikel wurde gespeichert.',
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
          message: 'Neue Aufgabe wurde gespeichert.',
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
    const text = String(form.get('text') || '').trim();

    if (!title || !text) {
      return;
    }

    try {
      if (authState.family) {
        const createdNote = await createNote(authState.family.familyId, {
          title,
          text,
        });

        updateState((current) => ({
          ...current,
          notes: [createdNote, ...current.notes],
        }));
        setCloudSync({
          phase: 'ready',
          message: 'Notiz wurde gespeichert.',
        });
      } else {
        updateState((current) => ({
          ...current,
          notes: [{ id: nextStringId(), title, text }, ...current.notes],
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
          message: 'Kalendereintrag wurde gespeichert.',
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
          message: 'Gericht wurde gespeichert.',
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
    const fileInput = form.get('file');
    const selectedFiles =
      selectedDocumentFiles.length > 0
        ? selectedDocumentFiles
        : fileInput instanceof File && fileInput.size > 0
          ? [fileInput]
          : [];

    if (selectedFiles.length === 0) {
      setCloudSync({
        phase: 'error',
        message: 'Bitte mindestens eine Datei angeben.',
      });
      return;
    }

    if (selectedFiles.length > 0 && !authState.family && plannerState.storageMode !== 'local') {
      setCloudSync({
        phase: 'error',
        message: 'Datei-Uploads sind nur verfügbar, wenn du angemeldet bist und zu einer Familie gehörst.',
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
              name: '',
              category: '',
              status: '',
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
        }

        setCloudSync({
          phase: 'ready',
          message:
            selectedFiles.length > 1
              ? `${selectedFiles.length} Dokumente wurden gespeichert.`
              : 'Dokument wurde gespeichert.',
        });
      } else {
        const createdDocuments = selectedFiles.map((file) => {
          const metadata = resolveDocumentMetadata({
            name: '',
            category: '',
            status: '',
            file,
          });

          return {
            id: nextStringId(),
            name: metadata.name,
            category: metadata.category,
            status: metadata.status,
            linkUrl: createLocalDocumentLink(file),
            filePath: file.name,
          } satisfies DocumentItem;
        });

        updateState((current) => ({
          ...current,
          documents: [...createdDocuments.reverse(), ...current.documents],
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

  return (
    <div className="app-shell">
      <PlannerSidebar
        activeTab={activeTab}
        authDriven={authDriven}
        authState={authState}
        openTasks={openTasks}
        pendingShopping={pendingShopping}
        plannerState={plannerState}
        setActiveTab={setActiveTab}
        visibleTabs={visibleTabs}
        onSelectMember={handleSelectMember}
        onSignOut={onSignOut}
      />

      <main className="content">
        <PlannerTopbar activeTab={activeTab} setActiveTab={setActiveTab} visibleTabs={visibleTabs} />

        <PlannerOverview
          activeTab={activeTab}
          openTasks={openTasks}
          plannerState={plannerState}
          sortedCalendarEntries={sortedCalendarEntries}
          onToggleTask={handleToggleTask}
        />

        <ShoppingModule
          activeTab={activeTab}
          items={plannerState.shoppingItems}
          onAddShopping={handleAddShopping}
          onToggleShopping={handleToggleShopping}
        />

        <TasksModule
          activeTab={activeTab}
          ownerDefaultValue={authState.profile?.display_name ?? activeMember?.name ?? ''}
          tasks={plannerState.tasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
        />

        <NotesModule activeTab={activeTab} notes={plannerState.notes} onAddNote={handleAddNote} />

        <CalendarModule
          activeTab={activeTab}
          calendarMonth={calendarMonth}
          calendarViewDate={calendarViewDate}
          selectedCalendarDate={selectedCalendarDate}
          selectedDayEntries={selectedDayEntries}
          unscheduledCalendarEntries={unscheduledCalendarEntries}
          visibleMonthEventCount={visibleMonthEventCount}
          onAddCalendar={handleAddCalendar}
          onChangeCalendarMonth={handleChangeCalendarMonth}
          onSelectCalendarDate={setSelectedCalendarDate}
          onShowToday={handleShowTodayInCalendar}
        />

        <MealsModule
          activeTab={activeTab}
          meals={plannerState.meals}
          onAddMeal={handleAddMeal}
          onToggleMealPrepared={handleToggleMealPrepared}
        />

        <DocumentsModule
          activeTab={activeTab}
          documentKindFilter={documentKindFilter}
          documentSearchTerm={documentSearchTerm}
          documentSelectionErrors={documentSelectionErrors}
          documentSelectionSummary={documentSelectionSummary}
          documentSort={documentSort}
          documentStatusFilter={documentStatusFilter}
          documentStatusOptions={documentStatusOptions}
          documentUploadProgress={documentUploadProgress}
          isDocumentDropActive={isDocumentDropActive}
          selectedDocumentFiles={selectedDocumentFiles}
          totalDocumentCount={plannerState.documents.length}
          visibleDocuments={visibleDocuments}
          onClearSelectedDocumentFiles={handleClearSelectedDocumentFiles}
          onDeleteDocument={handleDeleteDocument}
          onDocumentDragLeave={handleDocumentDragLeave}
          onDocumentDragOver={handleDocumentDragOver}
          onDocumentDrop={handleDocumentDrop}
          onDocumentInputChange={handleDocumentInputChange}
          onDocumentKindFilterChange={setDocumentKindFilter}
          onDocumentSearchTermChange={setDocumentSearchTerm}
          onDocumentSortChange={setDocumentSort}
          onDocumentStatusFilterChange={setDocumentStatusFilter}
          onOpenDocumentPreview={handleOpenDocumentPreview}
          onRemoveSelectedDocumentFile={handleRemoveSelectedDocumentFile}
          onStartDocumentEdit={handleStartDocumentEdit}
          onSubmit={handleAddDocument}
        />

        {documentEditState ? (
          <DocumentEditModal
            documentEditState={documentEditState}
            onClose={() => setDocumentEditState(null)}
            onFieldChange={handleDocumentEditFieldChange}
            onSave={handleSaveDocumentEdit}
          />
        ) : null}

        {documentPreviewState ? (
          <DocumentPreviewModal
            documentPreviewState={documentPreviewState}
            onClose={() => setDocumentPreviewState(null)}
          />
        ) : null}

        <FamilyModule
          activeTab={activeTab}
          adminFamilyDirectory={adminFamilyDirectory}
          adminFamilyDirectoryBusy={adminFamilyDirectoryBusy}
          adminFamilyDirectoryError={adminFamilyDirectoryError}
          adminInviteFamilies={adminInviteFamilies}
          allowOpenRegistration={allowOpenRegistration}
          authFamily={authState.family}
          authProfile={authState.profile}
          canInviteFamilyMembers={canInviteFamilyMembers}
          canManageFamily={canManageFamily}
          familyInvites={familyInvites}
          members={plannerState.members}
          pendingInviteActionId={pendingInviteActionId}
          registrationConfigBusy={registrationConfigBusy}
          selectedAdminFamily={selectedAdminFamily}
          selectedInviteFamilyId={selectedInviteFamily?.familyId ?? null}
          onAddMember={handleAddMember}
          onOpenDeleteAccount={() => setIsDeleteAccountDialogOpen(true)}
          onRegistrationAccessChange={handleRegistrationAccessChange}
          onRemoveInvite={handleRemoveInvite}
          onSelectAdminFamily={setSelectedAdminFamilyId}
          onSelectInviteFamily={setSelectedInviteFamilyId}
          onSetPendingFamilyDeletion={setPendingFamilyDeletion}
          onSetPendingMemberDeletion={setPendingMemberDeletion}
        />

        {isDeleteAccountDialogOpen ? (
          <ConfirmationDialog
            heading="Bist du sicher?"
            id="delete-account-title"
            actions={(
              <>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={deleteAccountBusy}
                  onClick={() => setIsDeleteAccountDialogOpen(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="secondary-action danger-action"
                  disabled={deleteAccountBusy}
                  onClick={() => void handleConfirmAccountDeletion()}
                >
                  {deleteAccountBusy ? 'Wird gelöscht…' : 'Ja, Account löschen'}
                </button>
              </>
            )}
          >
            <p className="modal-note danger-note">
              Dein Konto wird dauerhaft gelöscht. Wenn dieses Konto eine Familie besitzt, können auch zugehörige Familiendaten entfernt werden.
            </p>
          </ConfirmationDialog>
        ) : null}

        {pendingMemberDeletion ? (
          <ConfirmationDialog
            heading="Mitglied wirklich löschen?"
            id="delete-member-title"
            actions={(
              <>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={memberDeletionBusy}
                  onClick={() => setPendingMemberDeletion(null)}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="secondary-action danger-action"
                  disabled={memberDeletionBusy}
                  onClick={() => void handleConfirmMemberDeletion()}
                >
                  {memberDeletionBusy ? 'Wird gelöscht…' : 'Mitglied endgültig löschen'}
                </button>
              </>
            )}
          >
            <p className="modal-note danger-note">
              {pendingMemberDeletion.memberName} wird aus {pendingMemberDeletion.familyName} entfernt und das zugehörige Konto wird dauerhaft gelöscht.
            </p>
          </ConfirmationDialog>
        ) : null}

        {pendingFamilyDeletion ? (
          <ConfirmationDialog
            heading="Familie wirklich löschen?"
            id="delete-family-title"
            actions={(
              <>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={familyDeletionBusy}
                  onClick={() => setPendingFamilyDeletion(null)}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="secondary-action danger-action"
                  disabled={familyDeletionBusy}
                  onClick={() => void handleConfirmFamilyDeletion()}
                >
                  {familyDeletionBusy ? 'Wird gelöscht…' : 'Familie endgültig löschen'}
                </button>
              </>
            )}
          >
            <p className="modal-note danger-note">
              {pendingFamilyDeletion.familyName} mit {pendingFamilyDeletion.memberCount} Mitgliedern, Einladungen und Familiendaten wird dauerhaft gelöscht. Bereits vorhandene Benutzerkonten bleiben bestehen.
            </p>
            {pendingFamilyDeletion.isCurrentFamily ? (
              <p className="modal-note danger-note">
                Weil dies deine aktuell geöffnete Familie ist, wirst du danach aus der App abgemeldet.
              </p>
            ) : null}
          </ConfirmationDialog>
        ) : null}

        {!authDriven ? (
          <section className="module reset-panel is-visible">
            <button
              type="button"
              className="reset-button"
              onClick={() => setPlannerState(defaultPlannerState)}
            >
              Lokale Daten zurücksetzen
            </button>
          </section>
        ) : null}

        <AccountCard
          authDriven={authDriven}
          authState={authState}
          className="account-card mobile-account-card"
          plannerState={plannerState}
          onSelectMember={handleSelectMember}
          onSignOut={onSignOut}
          showPermissionNote
        />
      </main>
    </div>
  );
}