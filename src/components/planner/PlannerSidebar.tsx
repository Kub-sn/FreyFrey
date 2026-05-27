import type { PlannerState, TabId } from '../../lib/planner-data';
import type { AuthState } from '../../app/types';
import { BrandHeading } from '../BrandHeading';
import { AppButton } from '../ui/AppButton';
import { AccountCard } from './AccountCard';
import { useActiveTab } from '../../context/ActiveTabContext';

export function PlannerSidebar({
  authDriven,
  authState,
  openTasks,
  pendingShopping,
  plannerState,
  onSelectMember,
  onSignOut,
  visibleTabs,
}: {
  authDriven: boolean;
  authState: AuthState;
  openTasks: number;
  pendingShopping: number;
  plannerState: PlannerState;
  onSelectMember: (memberId: string) => void;
  onSignOut: () => Promise<void>;
  visibleTabs: Array<{ id: TabId; label: string }>;
}) {
  const { activeTab, setActiveTab } = useActiveTab();
  return (
    <aside className="sidebar">
      <div className="relative z-[1]">
        <BrandHeading text="Frey Frey" className="brand-lockup-sidebar" />
      </div>

      <div className="status-card">
        <span>Heute offen</span>
        <strong>{openTasks} To-dos</strong>
        <small>{pendingShopping} Einkäufe fehlen noch</small>
      </div>

      <nav className="tab-list" aria-label="Module">
        {visibleTabs.map((tab) => (
          <AppButton
            key={tab.id}
            type="button"
            variant="secondary"
            className={[
              'w-full justify-start overflow-hidden text-left text-[0.98rem] tracking-[0.01em] shadow-none',
              activeTab === tab.id
                ? 'border-[rgba(88,104,87,0.28)] bg-[#d9e6d6] text-[#1d241f]'
                : 'border-[rgba(246,239,226,0.12)] bg-[rgba(246,239,226,0.06)] text-inherit hover:bg-[#d9e6d6] hover:border-[rgba(88,104,87,0.28)] hover:text-[#1d241f]',
            ].join(' ')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </AppButton>
        ))}
      </nav>

      <AccountCard
        authDriven={authDriven}
        authState={authState}
        className="account-card"
        plannerState={plannerState}
        onSelectMember={onSelectMember}
        onSignOut={onSignOut}
      />
    </aside>
  );
}