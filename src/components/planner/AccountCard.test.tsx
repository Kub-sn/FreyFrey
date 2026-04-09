import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authFixture, plannerFixture } from './planner-test-fixtures';
import { AccountCard } from './AccountCard';

describe('AccountCard', () => {
  it('renders authenticated account information and allows sign-out', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <AccountCard
        authDriven
        authState={authFixture}
        className="account-card"
        plannerState={plannerFixture}
        onSelectMember={vi.fn()}
        onSignOut={onSignOut}
        showPermissionNote
      />,
    );

    expect(screen.getByText('Familie: Familie Test')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('shows the demo member switcher when auth is disabled', () => {
    render(
      <AccountCard
        authDriven={false}
        authState={{ stage: 'signed-out', session: null, profile: null, family: null, error: null, message: null }}
        className="account-card"
        plannerState={plannerFixture}
        onSelectMember={vi.fn()}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Demo-Modus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alex Admin/i })).toBeInTheDocument();
  });
});