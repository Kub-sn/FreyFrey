import type { PlannerState } from '../../lib/planner-data';

export function MemberSwitcher({
  activeUserId,
  members,
  onSelectMember,
}: {
  activeUserId: string;
  members: PlannerState['members'];
  onSelectMember: (memberId: string) => void;
}) {
  return (
    <div className="member-switcher">
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          className={activeUserId === member.id ? 'member-pill active' : 'member-pill'}
          onClick={() => onSelectMember(member.id)}
        >
          <strong>{member.name}</strong>
          <span>{member.role}</span>
        </button>
      ))}
    </div>
  );
}