import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authFixture, plannerFixture } from './planner-test-fixtures';
import { FamilyModule } from './FamilyModule';

describe('FamilyModule', () => {
  it('renders family management data and forwards key actions', async () => {
    const user = userEvent.setup();
    const onRemoveInvite = vi.fn().mockResolvedValue(undefined);
    const onRegistrationAccessChange = vi.fn().mockResolvedValue(undefined);
    const onOpenDeleteAccount = vi.fn();
    const onSetPendingFamilyDeletion = vi.fn();

    render(
      <FamilyModule
        activeTab="family"
        adminFamilyDirectory={[
          {
            familyId: 'family-1',
            familyName: 'Familie Test',
            allowOpenRegistration: true,
            members: [
              { id: 'member-admin', name: 'Alex Admin', email: 'alex@example.com', role: 'admin', isOwner: true },
            ],
          },
        ]}
        adminFamilyDirectoryBusy={false}
        adminFamilyDirectoryError={null}
        adminInviteFamilies={[{ familyId: 'family-1', familyName: 'Familie Test' }]}
        allowOpenRegistration
        authFamily={authFixture.family}
        authProfile={authFixture.profile}
        canInviteFamilyMembers
        canManageFamily
        familyInvites={[
          {
            id: 'invite-1',
            familyId: 'family-1',
            email: 'neu@example.com',
            role: 'familyuser',
            createdAt: '2026-04-09T10:00:00.000Z',
            acceptedAt: null,
          },
        ]}
        members={plannerFixture.members}
        pendingInviteActionId={null}
        registrationConfigBusy={false}
        selectedAdminFamily={{
          familyId: 'family-1',
          familyName: 'Familie Test',
          allowOpenRegistration: true,
          members: [
            { id: 'member-admin', name: 'Alex Admin', email: 'alex@example.com', role: 'admin', isOwner: true },
          ],
        }}
        selectedInviteFamilyId="family-1"
        onAddMember={vi.fn().mockResolvedValue(undefined)}
        onOpenDeleteAccount={onOpenDeleteAccount}
        onRegistrationAccessChange={onRegistrationAccessChange}
        onRemoveInvite={onRemoveInvite}
        onSelectAdminFamily={vi.fn()}
        onSelectInviteFamily={vi.fn()}
        onSetPendingFamilyDeletion={onSetPendingFamilyDeletion}
        onSetPendingMemberDeletion={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Alex Admin')).toHaveLength(2);
    expect(screen.getByText('neu@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /zurückziehen/i }));
    await user.click(screen.getByLabelText('Freie Registrierung erlauben'));
    await user.click(screen.getByRole('button', { name: 'Account löschen' }));
    await user.click(screen.getByRole('button', { name: /Familie Familie Test löschen/i }));

    expect(onRemoveInvite).toHaveBeenCalledWith('invite-1');
    expect(onRegistrationAccessChange).toHaveBeenCalledWith(false);
    expect(onOpenDeleteAccount).toHaveBeenCalled();
    expect(onSetPendingFamilyDeletion).toHaveBeenCalled();
  });
});