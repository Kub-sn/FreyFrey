import type { FormEvent } from 'react';
import type { PendingFamilyDeletionState, PendingMemberDeletionState } from '../../app/types';
import type { PlannerState, UserRole } from '../../lib/planner-data';
import type { AdminFamilyDirectoryFamily, SupabaseFamilyContext, SupabaseFamilyInvite, SupabaseProfile } from '../../lib/supabase';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appInputClassName, appSelectClassName } from '../ui/AppField';
import { FamilyStatusBadges, getRoleChipClass, getRoleLabel, isFamilyOwnerMember } from './planner-shell-utils';
import { useActiveTab } from '../../context/ActiveTabContext';

function getMemberMonogram(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'FM';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function FamilyModule({
  adminFamilyDirectory,
  adminFamilyDirectoryBusy,
  adminFamilyDirectoryError,
  adminInviteFamilies,
  allowOpenRegistration,
  authFamily,
  authProfile,
  canInviteFamilyMembers,
  canManageFamily,
  familyInvites,
  members,
  pendingInviteActionId,
  registrationConfigBusy,
  selectedAdminFamily,
  selectedInviteFamilyId,
  onAddMember,
  onOpenDeleteAccount,
  onRegistrationAccessChange,
  onRemoveInvite,
  onSelectAdminFamily,
  onSelectInviteFamily,
  onSetPendingFamilyDeletion,
  onSetPendingMemberDeletion,
}: {
  adminFamilyDirectory: AdminFamilyDirectoryFamily[];
  adminFamilyDirectoryBusy: boolean;
  adminFamilyDirectoryError: string | null;
  adminInviteFamilies: Array<{ familyId: string; familyName: string }>;
  allowOpenRegistration: boolean;
  authFamily: SupabaseFamilyContext | null;
  authProfile: SupabaseProfile | null;
  canInviteFamilyMembers: boolean;
  canManageFamily: boolean;
  familyInvites: SupabaseFamilyInvite[];
  members: PlannerState['members'];
  pendingInviteActionId: string | null;
  registrationConfigBusy: boolean;
  selectedAdminFamily: AdminFamilyDirectoryFamily | null;
  selectedInviteFamilyId: string | null;
  onAddMember: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenDeleteAccount: () => void;
  onRegistrationAccessChange: (value: boolean) => Promise<void>;
  onRemoveInvite: (inviteId: string) => Promise<void>;
  onSelectAdminFamily: (familyId: string) => void;
  onSelectInviteFamily: (familyId: string) => void;
  onSetPendingFamilyDeletion: (value: PendingFamilyDeletionState) => void;
  onSetPendingMemberDeletion: (value: PendingMemberDeletionState) => void;
}) {
  const { activeTab } = useActiveTab();
  const canViewFamily = Boolean(authFamily);
  const accountPanelClassName = 'self-start grid gap-[0.9rem] min-w-0 w-full family-account-panel [&>.danger-action]:justify-self-start';
  const invitePanel = (
    <AppCard as="form" className="form-panel family-invite-panel" onSubmit={(event) => void onAddMember(event)}>
      <h4>Familienmitglied einladen</h4>
      {canManageFamily ? (
        <label className="grid gap-[0.35rem] [&>span]:text-[0.84rem] [&>span]:font-semibold [&>span]:tracking-[0.04em] [&>span]:text-[rgba(24,52,47,0.78)]">
          <span>Familie</span>
          <select
            className={appSelectClassName()}
            name="familyId"
            aria-label="Familie fuer Einladung"
            value={selectedInviteFamilyId ?? ''}
            disabled={!canInviteFamilyMembers || adminInviteFamilies.length === 0}
            onChange={(event) => onSelectInviteFamily(event.currentTarget.value)}
          >
            {adminInviteFamilies.map((family) => (
              <option key={family.familyId} value={family.familyId}>
                {family.familyName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <input className={appInputClassName()} name="email" placeholder="E-Mail" disabled={!canInviteFamilyMembers} />
      <select className={appSelectClassName()} name="role" aria-label="Rolle fuer Einladung" defaultValue="familyuser" disabled={!canManageFamily}>
        <option value="familyuser">familyuser</option>
        {canManageFamily ? <option value="admin">admin</option> : null}
      </select>
      <AppButton type="submit" variant="primary" disabled={!canInviteFamilyMembers}>
        {canInviteFamilyMembers
          ? 'Einladung senden'
          : 'Nur Familiengruender oder Admin kann Einladungen senden'}
      </AppButton>
      <small>
        Die Einladung wird per E-Mail verschickt. Sobald sich der Nutzer mit derselben
        E-Mail registriert oder anmeldet, wird die Familienzuordnung automatisch uebernommen.
      </small>
    </AppCard>
  );
  const accountPanel = authProfile ? (
    <AppCard className={accountPanelClassName}>
      <div className="panel-heading">
        <h4>Konto</h4>
      </div>
      <p className="-mt-px m-0 text-[rgba(24,52,47,0.72)]">
      </p>
      <AppButton type="button" variant="danger" onClick={onOpenDeleteAccount}>
        Account löschen
      </AppButton>
    </AppCard>
  ) : null;
  const registrationPanel = canManageFamily && authFamily ? (
    <AppCard className="form-panel gap-4">
      <div className="panel-heading">
        <h4>Registrierungeinstellung</h4>
        <span className={allowOpenRegistration ? 'chip' : 'chip alt'}>
          {allowOpenRegistration ? 'Offen' : 'Nur Einladung'}
        </span>
      </div>
      <label className="flex items-center justify-between gap-4 py-4 px-[1.1rem] rounded-[20px] border border-[rgba(24,52,47,0.12)] bg-[rgba(246,239,226,0.56)]">
        <div className="grid gap-[0.3rem] [&>strong]:text-[0.98rem]">
          <strong>Freie Registrierung erlauben</strong>
          <small>
            Wenn du das deaktivierst, koennen neue Konten nur noch mit einer offenen
            Einladung erstellt werden.
          </small>
        </div>
        <input
          type="checkbox"
          className="app-switch"
          aria-label="Freie Registrierung erlauben"
          name="allow-open-registration"
          checked={allowOpenRegistration}
          disabled={registrationConfigBusy}
          onChange={(event) => void onRegistrationAccessChange(event.currentTarget.checked)}
        />
      </label>
      <p className="m-0 text-[rgba(24,52,47,0.82)]">
        {allowOpenRegistration ? 'Neue Nutzer koennen sich aktuell auch ohne Einladung registrieren.' : null}
      </p>
    </AppCard>
  ) : null;

  return (
    <section className={activeTab === 'family' && canViewFamily ? 'module is-visible' : 'module'}>
      <div className="role-layout flex flex-col gap-[0.65rem]">
        <div className="flex flex-wrap items-start gap-[0.65rem] max-[720px]:flex-col">
          <AppCard className="self-start flex-[1_1_620px] min-w-[min(100%,34rem)] max-[720px]:w-full max-[720px]:min-w-0">
            <div className="panel-heading items-start">
              <div className="grid gap-[0.3rem] min-w-0">
                <h4>Familienmitglieder</h4>
                <p className="-mt-px text-[rgba(24,52,47,0.72)] m-0 max-w-[42rem]">
                  Jede Person steht in einer eigenen Zeile mit Rolle, E-Mail und Status, damit du sie im Desktop-Layout sofort unterscheiden kannst.
                </p>
              </div>
              <span className="chip">{members.length}</span>
            </div>
            <ul className="list-none m-0 mt-[0.85rem] p-0 flex flex-col gap-[0.55rem]" aria-label="Familienmitglieder Liste">
              {members.length > 0 ? (
                members.map((member, index) => (
                  <li key={member.id} className="flex justify-between items-center gap-[0.85rem] w-full min-w-0 py-4 px-[1.05rem] border border-[rgba(24,52,47,0.12)] rounded-[22px] bg-[rgba(255,255,255,0.98)] shadow-[0_12px_26px_rgba(35,27,17,0.05)] max-[720px]:flex-col max-[720px]:items-start">
                    <div className="flex items-center gap-[0.9rem] min-w-0">
                      <span className="grid size-12 place-items-center rounded-[16px] shrink-0 bg-[linear-gradient(135deg,rgba(24,52,47,0.14),rgba(25,98,77,0.24))] text-[#18342f] text-[0.88rem] font-extrabold tracking-[0.08em]" aria-hidden="true">
                        {getMemberMonogram(member.name)}
                      </span>
                      <div className="gap-[0.3rem] grid min-w-0 [&>strong]:block [&>strong]:[overflow-wrap:anywhere] [&>small]:block [&>small]:[overflow-wrap:anywhere]">
                        <div className="flex flex-wrap items-center gap-[0.55rem]">
                          <strong>{member.name}</strong>
                          <span className="inline-flex items-center py-[0.28rem] px-[0.55rem] rounded-full bg-[rgba(24,52,47,0.08)] text-[rgba(24,52,47,0.76)] text-[0.72rem] font-bold tracking-[0.05em] uppercase">{authProfile?.id === member.id ? 'Du' : `Mitglied ${index + 1}`}</span>
                        </div>
                        <small>{member.email}</small>
                      </div>
                    </div>
                    <div className="flex justify-end min-w-0 ml-auto max-[720px]:justify-start">
                      <FamilyStatusBadges role={member.role} isOwner={isFamilyOwnerMember(member.id, authFamily)} />
                    </div>
                  </li>
                ))
              ) : (
                <li className="flex justify-between items-center gap-[0.85rem] w-full min-w-0 py-4 px-[1.05rem] border border-[rgba(24,52,47,0.12)] rounded-[22px] bg-[rgba(255,255,255,0.98)] shadow-[0_12px_26px_rgba(35,27,17,0.05)] grid-cols-[1fr] max-[720px]:flex-col max-[720px]:items-start">
                  <div className="grid gap-[0.2rem] min-w-0 [&>strong]:block [&>strong]:[overflow-wrap:anywhere] [&>small]:block [&>small]:[overflow-wrap:anywhere]">
                    <strong>Noch keine Mitglieder geladen</strong>
                    <small>Nach Login und Familienzuordnung werden echte Mitglieder aus Supabase angezeigt.</small>
                  </div>
                </li>
              )}
            </ul>
            <div className="panel-heading panel-heading-tight family-inline-heading">
              <h4>Offene Einladungen</h4>
              <span className="chip">{familyInvites.length}</span>
            </div>
            {familyInvites.length > 0 ? (
              <ul className="document-list [&>li]:py-[0.7rem] gap-[0.85rem] mt-[0.4rem]">
                {familyInvites.map((invite) => (
                  <li key={invite.id} className="items-stretch py-4 px-[1.05rem] border border-[rgba(24,52,47,0.09)] rounded-[20px] bg-[rgba(255,255,255,0.98)] shadow-[0_10px_22px_rgba(35,27,17,0.05)]">
                    <div className="grid gap-[0.2rem] min-w-0 content-start [&>strong]:block [&>strong]:[overflow-wrap:anywhere] [&>small]:block [&>small]:[overflow-wrap:anywhere]">
                      <strong>{invite.email}</strong>
                      <span className={`${getRoleChipClass(invite.role as UserRole)} w-fit`}>{getRoleLabel(invite.role as UserRole)}</span>
                    </div>
                    <div className="flex items-center justify-end ml-auto max-[720px]:w-full max-[720px]:ml-0 max-[720px]:justify-start">
                      {canInviteFamilyMembers ? (
                        <AppButton
                          type="button"
                          variant="ghost"
                          disabled={pendingInviteActionId === invite.id}
                          aria-label={`Einladung für ${invite.email} zurückziehen`}
                          onClick={() => void onRemoveInvite(invite.id)}
                        >
                          {pendingInviteActionId === invite.id ? 'Wird entfernt…' : 'Zurückziehen'}
                        </AppButton>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </AppCard>

          <div className="flex flex-[0_1_360px] flex-col gap-[0.6rem] min-w-[min(100%,21rem)] max-[720px]:w-full max-[720px]:min-w-0">
            {invitePanel}
          </div>
        </div>

        {!canManageFamily ? accountPanel : null}

        {canManageFamily ? (
          <AppCard className="self-start admin-directory-panel min-w-0 w-full overflow-x-clip gap-[0.75rem] max-[720px]:min-w-0">
              <div className="panel-heading family-inline-heading">
                <h4>Alle Familien</h4>
                <span className="chip">{adminFamilyDirectory.length}</span>
              </div>
              {adminFamilyDirectoryBusy ? (
                <p className="-mt-px m-0 text-[rgba(24,52,47,0.72)]">Familienliste wird geladen…</p>
              ) : null}
              {adminFamilyDirectoryError ? <p className="auth-feedback auth-error">{adminFamilyDirectoryError}</p> : null}
              {!adminFamilyDirectoryBusy && !adminFamilyDirectoryError && adminFamilyDirectory.length === 0 ? (
                <p className="-mt-px m-0 text-[rgba(24,52,47,0.72)]">Noch keine Familien für die Übersicht gefunden.</p>
              ) : null}
              {adminFamilyDirectory.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-[0.65rem] mb-[1.2rem] max-[720px]:grid max-[720px]:justify-start max-[720px]:gap-[0.55rem]" role="tablist" aria-label="Zwischen Familien wechseln">
                    {adminFamilyDirectory.map((family) => (
                      <button
                        key={family.familyId}
                        type="button"
                        className={`grid gap-[0.18rem] min-w-[10.5rem] py-[0.85rem] px-4 border border-[rgba(24,52,47,0.12)] rounded-[18px] bg-[rgba(255,252,248,0.96)] text-[#18342f] text-left shadow-[0_8px_18px_rgba(35,27,17,0.04)] transition-[transform,border-color,box-shadow,background] duration-[180ms] ease-out hover:-translate-y-px hover:border-[rgba(24,52,47,0.22)] hover:shadow-[0_12px_22px_rgba(35,27,17,0.06)] [&>strong]:block [&>strong]:[overflow-wrap:anywhere] [&>small]:block [&>small]:[overflow-wrap:anywhere] max-[720px]:w-auto max-[720px]:min-w-[min(10.5rem,100%)]${selectedAdminFamily?.familyId === family.familyId ? ' border-[rgba(24,52,47,0.26)] !bg-[rgba(232,242,238,0.96)] !shadow-[0_14px_26px_rgba(24,52,47,0.08)]' : ''}`}
                        aria-pressed={selectedAdminFamily?.familyId === family.familyId}
                        onClick={() => onSelectAdminFamily(family.familyId)}
                      >
                        <strong>{family.familyName}</strong>
                        <small>{family.members.length} Mitglieder</small>
                      </button>
                    ))}
                  </div>

                  {selectedAdminFamily ? (
                    <div className="grid min-w-0 overflow-x-clip gap-3">
                      <div className="panel-heading panel-heading-tight family-directory-summary mt-[0.1rem] min-w-0 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-[0.55rem]">
                        <div className="grid min-w-0 gap-[0.18rem] pl-[0.45rem]">
                          <strong>{selectedAdminFamily.familyName}</strong>
                          <small>
                            {selectedAdminFamily.members.filter((member) => member.role === 'admin').length} Admin · {selectedAdminFamily.members.length} Mitglieder
                          </small>
                        </div>
                        <div className="flex flex-wrap items-center justify-end min-w-0 gap-[0.65rem] pr-[0.35rem] [&>.danger-action]:[white-space:normal] [&>.danger-action]:[overflow-wrap:anywhere] max-[720px]:w-full max-[720px]:ml-0 max-[720px]:justify-start [&>.danger-action]:max-[720px]:w-full">
                          <AppButton
                            type="button"
                            variant="danger"
                            aria-label={`Familie ${selectedAdminFamily.familyName} löschen`}
                            onClick={() =>
                              onSetPendingFamilyDeletion({
                                familyId: selectedAdminFamily.familyId,
                                familyName: selectedAdminFamily.familyName,
                                memberCount: selectedAdminFamily.members.length,
                                isCurrentFamily: authFamily?.familyId === selectedAdminFamily.familyId,
                              })
                            }
                          >
                            Familie löschen
                          </AppButton>
                        </div>
                      </div>
                      <ul className="document-list grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] min-w-0 gap-[0.8rem]">
                        {selectedAdminFamily.members.map((member) => (
                          <li key={member.id} className="w-full min-w-0 overflow-hidden py-4 px-[1.2rem] border border-[rgba(24,52,47,0.26)] border-b-0 rounded-[20px] bg-[rgba(255,255,255,0.98)] shadow-[0_14px_26px_rgba(24,52,47,0.08)]">
                            <div className="family-directory-member-copy grid gap-[0.4rem] min-w-0 pl-[0.45rem] [&>strong]:block [&>strong]:[overflow-wrap:anywhere] [&>small]:block [&>small]:[overflow-wrap:anywhere]">
                              <div className="flex flex-wrap items-center min-w-0 gap-[0.85rem] max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-[0.45rem]">
                                <strong>{member.name}</strong>
                                <FamilyStatusBadges role={member.role as UserRole} isOwner={member.isOwner} />
                              </div>
                              <small>{member.email}</small>
                            </div>
                            <div className="flex flex-wrap items-center justify-end min-w-0 gap-[0.65rem] ml-auto pr-[0.35rem] [&>.ghost-toggle]:[white-space:normal] [&>.ghost-toggle]:[overflow-wrap:anywhere] max-[720px]:w-full max-[720px]:ml-0 max-[720px]:justify-start [&>.ghost-toggle]:max-[720px]:w-full">
                              {!member.isOwner && member.id !== authProfile?.id ? (
                                <AppButton
                                  type="button"
                                  variant="ghost"
                                  className="danger-action"
                                  aria-label={`Mitglied ${member.email || member.name} aus ${selectedAdminFamily.familyName} löschen`}
                                  onClick={() =>
                                    onSetPendingMemberDeletion({
                                      familyId: selectedAdminFamily.familyId,
                                      familyName: selectedAdminFamily.familyName,
                                      memberId: member.id,
                                      memberName: member.name,
                                      memberEmail: member.email,
                                    })
                                  }
                                >
                                  Mitglied löschen
                                </AppButton>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
          </AppCard>
        ) : null}

        {canManageFamily ? (
          <div className="flex flex-wrap items-start gap-[0.65rem] max-[720px]:flex-col [&>.panel]:flex-[1_1_280px] [&>.panel]:min-w-[min(100%,18rem)]">
            {registrationPanel}
            {accountPanel}
          </div>
        ) : null}
      </div>
    </section>
  );
}