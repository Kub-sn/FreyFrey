import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlannerTopbar } from './PlannerTopbar';

describe('PlannerTopbar', () => {
  it('changes the active tab through the mobile selector', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();

    render(
      <PlannerTopbar
        activeTab="overview"
        setActiveTab={setActiveTab}
        visibleTabs={[
          { id: 'overview', label: 'Übersicht' },
          { id: 'shopping', label: 'Einkauf' },
        ]}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Bereich wechseln'), 'shopping');

    expect(setActiveTab).toHaveBeenCalledWith('shopping');
  });
});