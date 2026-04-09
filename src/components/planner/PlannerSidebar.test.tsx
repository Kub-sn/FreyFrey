import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authFixture, plannerFixture, visibleTabsFixture } from './planner-test-fixtures';
import { PlannerSidebar } from './PlannerSidebar';

describe('PlannerSidebar', () => {
  it('renders module navigation and forwards tab changes', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();

    render(
      <PlannerSidebar
        activeTab="overview"
        authDriven
        authState={authFixture}
        openTasks={1}
        pendingShopping={2}
        plannerState={plannerFixture}
        setActiveTab={setActiveTab}
        visibleTabs={visibleTabsFixture}
        onSelectMember={vi.fn()}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('1 To-dos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Einkauf' }));
    expect(setActiveTab).toHaveBeenCalledWith('shopping');
  });
});