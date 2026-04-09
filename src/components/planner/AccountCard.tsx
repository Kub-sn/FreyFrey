import type { PlannerState } from '../../lib/planner-data';
import type { AuthState } from '../../app/types';
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
      <div className="account-family-summary">
        <strong>Familie: {authState.family?.familyName ?? plannerState.familyName}</strong>
        <div className="account-meta-row">
          {authState.profile ? (
            <FamilyStatusBadges role={authState.profile.role} isOwner={authState.family?.isOwner} />
          ) : null}
        </div>
        {showPermissionNote && permissionNote ? (
          <small className="family-permission-note">{permissionNote}</small>
        ) : null}
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
        <MemberSwitcher
          activeUserId={plannerState.activeUserId}
          members={plannerState.members}
          onSelectMember={onSelectMember}
        />
      ) : null}
    </div>
  );
}