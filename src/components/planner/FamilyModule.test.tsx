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
            ownerUserId: 'member-admin',
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
          ownerUserId: 'member-admin',
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

  it('places the account panel directly below the invite panel for members without management rights', () => {
    render(
      <FamilyModule
        activeTab="family"
        adminFamilyDirectory={[]}
        adminFamilyDirectoryBusy={false}
        adminFamilyDirectoryError={null}
        adminInviteFamilies={[]}
        allowOpenRegistration={false}
        authFamily={{ familyId: 'family-1', familyName: 'Familie Test', role: 'familyuser' }}
        authProfile={{ id: 'member-1', display_name: 'Mia', email: 'mia@example.com', role: 'familyuser' }}
        canInviteFamilyMembers={false}
        canManageFamily={false}
        familyInvites={[]}
        members={plannerFixture.members}
        pendingInviteActionId={null}
        registrationConfigBusy={false}
        selectedAdminFamily={null}
        selectedInviteFamilyId={null}
        onAddMember={vi.fn().mockResolvedValue(undefined)}
        onOpenDeleteAccount={vi.fn()}
        onRegistrationAccessChange={vi.fn().mockResolvedValue(undefined)}
        onRemoveInvite={vi.fn().mockResolvedValue(undefined)}
        onSelectAdminFamily={vi.fn()}
        onSelectInviteFamily={vi.fn()}
        onSetPendingFamilyDeletion={vi.fn()}
        onSetPendingMemberDeletion={vi.fn()}
      />,
    );

    const settingsLayout = screen.getByRole('heading', { level: 4, name: 'Familienmitglieder' }).closest('.family-settings-layout');
    const secondaryStack = screen.getByRole('heading', { level: 4, name: 'Familienmitglied einladen' }).closest('.family-secondary-stack');
    const invitePanel = screen.getByRole('heading', { level: 4, name: 'Familienmitglied einladen' }).closest('.family-invite-panel');
    const accountPanel = screen.getByRole('heading', { level: 4, name: 'Konto' }).closest('.family-account-panel');

    expect(settingsLayout).not.toBeNull();
    expect(secondaryStack).not.toBeNull();
    expect(invitePanel).not.toBeNull();
    expect(accountPanel).not.toBeNull();
    expect(secondaryStack?.parentElement).toBe(settingsLayout);
    expect(invitePanel?.parentElement).toBe(secondaryStack);
    expect(accountPanel?.parentElement).toBe(secondaryStack);
  });

  it('renders each all-families member as a separate card with badges next to the name', () => {
    render(
      <FamilyModule
        activeTab="family"
        adminFamilyDirectory={[
          {
            familyId: 'family-1',
            familyName: 'Familie Test',
            allowOpenRegistration: true,
            ownerUserId: 'member-admin',
            members: [
              { id: 'member-admin', name: 'Alex Admin', email: 'alex@example.com', role: 'admin', isOwner: true },
              { id: 'member-2', name: 'Mia Mitglied', email: 'mia@example.com', role: 'familyuser', isOwner: false },
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
        familyInvites={[]}
        members={plannerFixture.members}
        pendingInviteActionId={null}
        registrationConfigBusy={false}
        selectedAdminFamily={{
          familyId: 'family-1',
          familyName: 'Familie Test',
          allowOpenRegistration: true,
          ownerUserId: 'member-admin',
          members: [
            { id: 'member-admin', name: 'Alex Admin', email: 'alex@example.com', role: 'admin', isOwner: true },
            { id: 'member-2', name: 'Mia Mitglied', email: 'mia@example.com', role: 'familyuser', isOwner: false },
          ],
        }}
        selectedInviteFamilyId="family-1"
        onAddMember={vi.fn().mockResolvedValue(undefined)}
        onOpenDeleteAccount={vi.fn()}
        onRegistrationAccessChange={vi.fn().mockResolvedValue(undefined)}
        onRemoveInvite={vi.fn().mockResolvedValue(undefined)}
        onSelectAdminFamily={vi.fn()}
        onSelectInviteFamily={vi.fn()}
        onSetPendingFamilyDeletion={vi.fn()}
        onSetPendingMemberDeletion={vi.fn()}
      />,
    );

    const memberName = screen.getByText('Mia Mitglied');
    const memberCard = memberName.closest('.family-directory-member-card');
    const memberHeading = memberName.closest('.family-entry-heading');

    expect(memberCard).not.toBeNull();
    expect(memberHeading?.querySelector('.family-status-badges')).not.toBeNull();
  });
});
