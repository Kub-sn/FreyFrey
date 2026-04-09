import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { MemberSwitcher } from './MemberSwitcher';

describe('MemberSwitcher', () => {
  it('renders members and notifies when a member is selected', async () => {
    const user = userEvent.setup();
    const onSelectMember = vi.fn();

    render(
      <MemberSwitcher
        activeUserId="member-admin"
        members={plannerFixture.members}
        onSelectMember={onSelectMember}
      />,
    );

    expect(screen.getByRole('button', { name: /Alex Admin/i })).toHaveClass('active');
    await user.click(screen.getByRole('button', { name: /Bea User/i }));

    expect(onSelectMember).toHaveBeenCalledWith('member-user');
  });
});