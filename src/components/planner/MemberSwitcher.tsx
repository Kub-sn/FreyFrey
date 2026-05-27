import type { PlannerState } from '../../lib/planner-data';
import { AppButton } from '../ui/AppButton';

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
        <AppButton
          key={member.id}
          type="button"
          variant="secondary"
          className={[
            activeUserId === member.id ? 'active' : '',
            'w-full justify-between gap-4 text-left shadow-none',
            activeUserId === member.id
              ? 'border-[rgba(88,104,87,0.28)] bg-[#d9e6d6] text-[#1d241f]'
              : 'border-[rgba(246,239,226,0.12)] bg-[rgba(246,239,226,0.05)] text-inherit hover:bg-[#d9e6d6] hover:border-[rgba(88,104,87,0.28)] hover:text-[#1d241f]',
          ].filter(Boolean).join(' ')}
          onClick={() => onSelectMember(member.id)}
        >
          <strong className="relative z-[1]">{member.name}</strong>
          <span className="text-[0.8rem] uppercase opacity-80">{member.role}</span>
        </AppButton>
      ))}
    </div>
  );
}