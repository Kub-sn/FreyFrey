import {
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { defaultPlannerState, tabs, type PlannerState, type TabId } from '../../lib/planner-data';
import type {
  AuthState,
  CloudSyncState,
  CloudSyncSetterValue,
} from '../../app/types';
import type { SupabaseFamilyContext, SupabaseFamilyInvite } from '../../lib/supabase';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { useNoteManager } from '../../hooks/useNoteManager';
import { useAdminDirectory } from '../../hooks/useAdminDirectory';
import { useCrudModules } from '../../hooks/useCrudModules';
import { useDeletionManager } from '../../hooks/useDeletionManager';
import { isTaskDone } from '../../lib/tasks';
import { AppButton } from '../ui/AppButton';
import { AccountCard } from './AccountCard';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DocumentsModule } from './DocumentsModule';
import { FamilyModule } from './FamilyModule';
import { MealsModule } from './MealsModule';
import { NoteDialog } from './NoteDialog';
import { NotesModule } from './NotesModule';
import { PlannerOverview } from './PlannerOverview';
import { PlannerSidebar } from './PlannerSidebar';
import { PlannerTopbar } from './PlannerTopbar';
import { ShoppingModule } from './ShoppingModule';
import { TasksModule } from './TasksModule';

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
  const activeMember = useMemo(
    () =>
      plannerState.members.find((member) => member.id === plannerState.activeUserId)
      ?? plannerState.members[0],
    [plannerState.activeUserId, plannerState.members],
  );

  const setCloudSync = (value: CloudSyncSetterValue) => {
    setCloudSyncState((current) => {
      const nextValue =
        typeof value === 'function'
          ? (value as (current: CloudSyncState) => CloudSyncState | Omit<CloudSyncState, 'scope'>)(current)
          : value;

      return 'scope' in nextValue ? nextValue : { ...nextValue, scope: activeTab };
    });
  };

  const updateState = (updater: (current: PlannerState) => PlannerState) => {
    setPlannerState((current) => updater(current));
  };

  // --- Hooks ---

  const adminDir = useAdminDirectory({
    authState,
    setCloudSync,
    familyInvites,
    setFamilyInvites,
  });

  const notes = useNoteManager({
    authState,
    plannerState,
    setCloudSync,
    updateState,
  });

  const crud = useCrudModules({
    authState,
    plannerState,
    setCloudSync,
    updateState,
  });

  const deletions = useDeletionManager({
    authState,
    setCloudSync,
    updateState,
    setAdminFamilyDirectory: adminDir.setAdminFamilyDirectory,
    setSelectedAdminFamilyId: adminDir.setSelectedAdminFamilyId,
    onDeleteAccount,
    onDeleteFamily,
    onDeleteFamilyMemberAccount,
  });

  // --- Derived values ---

  const openTasks = useMemo(
    () => plannerState.tasks.filter((task) => !isTaskDone(task)).length,
    [plannerState.tasks],
  );

  const pendingShopping = useMemo(
    () => plannerState.shoppingLists.reduce(
      (total, list) => total + list.items.filter((item) => !item.checked).length,
      0,
    ),
    [plannerState.shoppingLists],
  );

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== 'family' || adminDir.canViewFamily),
    [adminDir.canViewFamily],
  );

  // --- Effects ---

  useEffect(() => {
    if (!adminDir.canViewFamily && activeTab === 'family') {
      setActiveTab('overview');
    }
  }, [activeTab, adminDir.canViewFamily, setActiveTab]);

  useEffect(() => {
    if (!cloudSync.message || cloudSync.phase === 'loading') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCloudSyncState((current) =>
        current.message === cloudSync.message
        && current.phase === cloudSync.phase
        && current.scope === cloudSync.scope
          ? { phase: 'idle', message: null, scope: null }
          : current,
      );
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [cloudSync.message, cloudSync.phase, cloudSync.scope, setCloudSyncState]);

  // --- Handlers ---

  const handleSelectMember = (memberId: string) => {
    updateState((current) => ({ ...current, activeUserId: memberId }));
  };

  const authDriven = authState.stage === 'authenticated';

  return (
    <ActiveTabProvider activeTab={activeTab} setActiveTab={setActiveTab}>
    <div className="app-shell">
      <PlannerSidebar
        authDriven={authDriven}
        authState={authState}
        openTasks={openTasks}
        pendingShopping={pendingShopping}
        plannerState={plannerState}
        visibleTabs={visibleTabs}
        onSelectMember={handleSelectMember}
        onSignOut={onSignOut}
      />

      <main className="content">
        <PlannerTopbar visibleTabs={visibleTabs} />

        <PlannerOverview
          openTasks={openTasks}
          plannerState={plannerState}
          onToggleTask={crud.handleToggleTask}
        />

        <ShoppingModule
          lists={plannerState.shoppingLists}
          onCreateList={crud.handleCreateShoppingList}
          onDeleteList={crud.handleDeleteShoppingList}
          onToggleItem={crud.handleToggleShoppingListItem}
          onUpdateList={crud.handleUpdateShoppingList}
        />

        <TasksModule
          familyMemberOptions={plannerState.members.map((member) => member.name)}
          ownerDefaultValue={authState.profile?.display_name ?? activeMember?.name ?? ''}
          tasks={plannerState.tasks}
          onAddTask={crud.handleAddTask}
          onUpdateTask={crud.handleUpdateTask}
          onDeleteTask={crud.handleDeleteTask}
          onSetTaskStatus={crud.handleSetTaskStatus}
          onToggleTaskSubtask={crud.handleToggleTaskSubtask}
        />

        <NotesModule
          notes={plannerState.notes}
          onAddNote={notes.handleAddNote}
          onDeleteNote={notes.handleDeleteNote}
          onOpenNote={notes.handleOpenNote}
        />

        {notes.noteDialogState ? (
          <NoteDialog
            note={notes.noteDialogState}
            onClose={() => notes.setNoteDialogState(null)}
            onEdit={() => notes.setNoteDialogState((current) => (current ? { ...current, isEditing: true } : current))}
            onFieldChange={notes.handleNoteDialogFieldChange}
            onSave={notes.handleSaveNote}
          />
        ) : null}

        {notes.pendingNoteDeletion ? (
          <ConfirmationDialog
            heading="Löschen?"
            id="delete-note-title"
            actions={(
              <>
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={notes.noteDeletionBusy}
                  onClick={() => notes.setPendingNoteDeletion(null)}
                >
                  Abbrechen
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  disabled={notes.noteDeletionBusy}
                  onClick={() => void notes.handleConfirmNoteDeletion()}
                >
                  {notes.noteDeletionBusy ? 'Lösche…' : 'Löschen'}
                </AppButton>
              </>
            )}
          >
            <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
              Notiz {notes.pendingNoteDeletion.title} löschen?
            </p>
          </ConfirmationDialog>
        ) : null}

        <MealsModule
          meals={plannerState.meals}
          onAddMeal={crud.handleAddMeal}
          onToggleMealPrepared={crud.handleToggleMealPrepared}
        />

        <DocumentsModule
          authState={authState}
          plannerState={plannerState}
          setCloudSync={setCloudSync}
          updateState={updateState}
        />

        <FamilyModule
          adminFamilyDirectory={adminDir.adminFamilyDirectory}
          adminFamilyDirectoryBusy={adminDir.adminFamilyDirectoryBusy}
          adminFamilyDirectoryError={adminDir.adminFamilyDirectoryError}
          adminInviteFamilies={adminDir.adminInviteFamilies}
          allowOpenRegistration={adminDir.allowOpenRegistration}
          authFamily={authState.family}
          authProfile={authState.profile}
          canInviteFamilyMembers={adminDir.canInviteFamilyMembers}
          canManageFamily={adminDir.canManageFamily}
          familyInvites={familyInvites}
          members={plannerState.members}
          pendingInviteActionId={adminDir.pendingInviteActionId}
          registrationConfigBusy={adminDir.registrationConfigBusy}
          selectedAdminFamily={adminDir.selectedAdminFamily}
          selectedInviteFamilyId={adminDir.selectedInviteFamily?.familyId ?? null}
          onAddMember={adminDir.handleAddMember}
          onOpenDeleteAccount={() => deletions.setIsDeleteAccountDialogOpen(true)}
          onRegistrationAccessChange={(nextValue) => adminDir.handleRegistrationAccessChange(nextValue, onUpdateFamilyRegistration)}
          onRemoveInvite={adminDir.handleRemoveInvite}
          onSelectAdminFamily={adminDir.setSelectedAdminFamilyId}
          onSelectInviteFamily={adminDir.setSelectedInviteFamilyId}
          onSetPendingFamilyDeletion={deletions.setPendingFamilyDeletion}
          onSetPendingMemberDeletion={deletions.setPendingMemberDeletion}
        />

        {deletions.isDeleteAccountDialogOpen ? (
          <ConfirmationDialog
            heading="Bist du sicher?"
            id="delete-account-title"
            actions={(
              <>
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={deletions.deleteAccountBusy}
                  onClick={() => deletions.setIsDeleteAccountDialogOpen(false)}
                >
                  Abbrechen
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  disabled={deletions.deleteAccountBusy}
                  onClick={() => void deletions.handleConfirmAccountDeletion()}
                >
                  {deletions.deleteAccountBusy ? 'Wird gelöscht…' : 'Ja, Account löschen'}
                </AppButton>
              </>
            )}
          >
            <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
              Dein Konto wird dauerhaft gelöscht. Wenn dieses Konto eine Familie besitzt, können auch zugehörige Familiendaten entfernt werden.
            </p>
          </ConfirmationDialog>
        ) : null}

        {deletions.pendingMemberDeletion ? (
          <ConfirmationDialog
            heading="Mitglied wirklich löschen?"
            id="delete-member-title"
            actions={(
              <>
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={deletions.memberDeletionBusy}
                  onClick={() => deletions.setPendingMemberDeletion(null)}
                >
                  Abbrechen
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  disabled={deletions.memberDeletionBusy}
                  onClick={() => void deletions.handleConfirmMemberDeletion()}
                >
                  {deletions.memberDeletionBusy ? 'Wird gelöscht…' : 'Mitglied endgültig löschen'}
                </AppButton>
              </>
            )}
          >
            <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
              {deletions.pendingMemberDeletion.memberName} wird aus {deletions.pendingMemberDeletion.familyName} entfernt und das zugehörige Konto wird dauerhaft gelöscht.
            </p>
          </ConfirmationDialog>
        ) : null}

        {deletions.pendingFamilyDeletion ? (
          <ConfirmationDialog
            heading="Familie wirklich löschen?"
            id="delete-family-title"
            actions={(
              <>
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={deletions.familyDeletionBusy}
                  onClick={() => deletions.setPendingFamilyDeletion(null)}
                >
                  Abbrechen
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  disabled={deletions.familyDeletionBusy}
                  onClick={() => void deletions.handleConfirmFamilyDeletion()}
                >
                  {deletions.familyDeletionBusy ? 'Wird gelöscht…' : 'Familie endgültig löschen'}
                </AppButton>
              </>
            )}
          >
            <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
              {deletions.pendingFamilyDeletion.familyName} mit {deletions.pendingFamilyDeletion.memberCount} Mitgliedern, Einladungen und Familiendaten wird dauerhaft gelöscht. Bereits vorhandene Benutzerkonten bleiben bestehen.
            </p>
            {deletions.pendingFamilyDeletion.isCurrentFamily ? (
              <p className="m-0 py-[0.9rem] px-4 rounded-[18px] bg-[rgba(165,71,34,0.12)] text-[#8f3415] leading-relaxed">
                Weil dies deine aktuell geöffnete Familie ist, wirst du danach aus der App abgemeldet.
              </p>
            ) : null}
          </ConfirmationDialog>
        ) : null}

        {!authDriven ? (
          <section className="module flex justify-end is-visible">
            <AppButton
              type="button"
              variant="danger"
              className="max-[560px]:w-full"
              onClick={() => setPlannerState(defaultPlannerState)}
            >
              Lokale Daten zurücksetzen
            </AppButton>
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
    </ActiveTabProvider>
  );
}
