import type { PlannerState, TabId } from '../../lib/planner-data';
import type { AuthState } from '../../app/types';
import { BrandHeading } from '../BrandHeading';
import { AccountCard } from './AccountCard';

export function PlannerSidebar({
  activeTab,
  authDriven,
  authState,
  openTasks,
  pendingShopping,
  plannerState,
  setActiveTab,
  onSelectMember,
  onSignOut,
  visibleTabs,
}: {
  activeTab: TabId;
  authDriven: boolean;
  authState: AuthState;
  openTasks: number;
  pendingShopping: number;
  plannerState: PlannerState;
  setActiveTab: (tab: TabId) => void;
  onSelectMember: (memberId: string) => void;
  onSignOut: () => Promise<void>;
  visibleTabs: Array<{ id: TabId; label: string }>;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandHeading text="Frey Frey" className="brand-lockup-sidebar" />
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