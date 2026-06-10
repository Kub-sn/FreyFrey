import type { PlannerState } from '../../lib/planner-data';
import type { AuthState } from '../../app/types';
import { AppButton } from '../ui/AppButton';
import { getFamilyPermissionNote, FamilyStatusBadges } from './planner-shell-utils';
import { MemberSwitcher } from './MemberSwitcher';

export function AccountCard({
  authDriven,
  authState,
  className,
  plannerState,
  onSelectMember,
  onSignOut,
  showPermissionNote = false,
}: {
  authDriven: boolean;
  authState: AuthState;
  className: string;
  plannerState: PlannerState;
  onSelectMember: (memberId: string) => void;
  onSignOut: () => Promise<void>;
  showPermissionNote?: boolean;
}) {
  const permissionNote = getFamilyPermissionNote(authState.profile, authState.family);

  return (
    <div className={className}>
      <div className="grid gap-[0.25rem] pb-1 border-b border-[rgba(246,239,226,0.1)]">
        <strong className="max-mobile:text-[1.3rem]">Familie: {authState.family?.familyName ?? plannerState.familyName}</strong>
        <div className="flex flex-wrap gap-[0.45rem]">
          {authState.profile ? (
            <FamilyStatusBadges role={authState.profile.role} isOwner={authState.family?.isOwner} />
          ) : null}
        </div>
        {showPermissionNote && permissionNote ? (
          <small className="block mt-[0.1rem] text-[rgba(251,244,236,0.76)] leading-[1.5]" data-permission-note>{permissionNote}</small>
        ) : null}
      </div>
      {authState.profile ? (
        <div className="grid gap-[0.3rem]">
          <strong>{authState.profile.display_name}</strong>
          <small>{authState.profile.email}</small>
          <AppButton type="button" variant="secondary" onClick={() => void onSignOut()}>
            Abmelden
          </AppButton>
        </div>
      ) : (
        <div className="grid gap-[0.3rem]">
          <strong>Demo-Modus</strong>
          <small>Supabase ist noch nicht verbunden. Die Daten bleiben lokal im Browser.</small>
        </div>
      )}
      {!authDriven && plannerState.members.length > 0 ? (
        <MemberSwitcher
          activeUserId={plannerState.activeUserId}
          members={plannerState.members}
          onSelectMember={onSelectMember}
        />
      ) : null}
    </div>
  );
}