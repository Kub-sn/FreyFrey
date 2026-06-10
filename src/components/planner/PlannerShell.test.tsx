import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PlannerShell from './PlannerShell';
import { cloudSyncFixture, plannerFixture } from './planner-test-fixtures';

function getRichTextEditor(container: ParentNode) {
  const editor = Array.from(container.querySelectorAll('[role="textbox"]')).find((element) => element.classList.contains('note-rich-text-surface'));
  if (!editor) {
    throw new Error('Rich text editor not found');
  }

  return editor as HTMLElement;
}

describe('PlannerShell', () => {
  it('renders the planner shell in local mode and allows resetting local data', async () => {
    const user = userEvent.setup();
    const setPlannerState = vi.fn();

    render(
      <PlannerShell
        activeTab="overview"
        setActiveTab={vi.fn()}
        plannerState={plannerFixture}
        setPlannerState={setPlannerState}
        familyInvites={[]}
        setFamilyInvites={vi.fn()}
        authState={{ stage: 'signed-out', session: null, profile: null, family: null, error: null, message: null }}
        cloudSync={cloudSyncFixture}
        setCloudSync={vi.fn()}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
        onDeleteAccount={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamily={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamilyMemberAccount={vi.fn().mockResolvedValue(undefined)}
        onUpdateFamilyRegistration={vi.fn().mockResolvedValue({
          familyId: 'family-1',
          familyName: 'Familie Test',
          role: 'admin',
          ownerUserId: 'member-admin',
          isOwner: true,
          allowOpenRegistration: true,
        })}
      />,
    );

    expect(screen.getAllByRole('heading', { level: 1, name: 'Frey Frey' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Lokale Daten zurücksetzen' }));
    expect(setPlannerState).toHaveBeenCalled();
  });

  it('opens a note dialog and saves local note edits', async () => {
    const user = userEvent.setup();
    const setPlannerState = vi.fn();

    render(
      <PlannerShell
        activeTab="notes"
        setActiveTab={vi.fn()}
        plannerState={plannerFixture}
        setPlannerState={setPlannerState}
        familyInvites={[]}
        setFamilyInvites={vi.fn()}
        authState={{ stage: 'signed-out', session: null, profile: null, family: null, error: null, message: null }}
        cloudSync={cloudSyncFixture}
        setCloudSync={vi.fn()}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
        onDeleteAccount={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamily={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamilyMemberAccount={vi.fn().mockResolvedValue(undefined)}
        onUpdateFamilyRegistration={vi.fn().mockResolvedValue({
          familyId: 'family-1',
          familyName: 'Familie Test',
          role: 'admin',
          ownerUserId: 'member-admin',
          isOwner: true,
          allowOpenRegistration: true,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Notiz Hinweis öffnen' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Bearbeiten' }));
  const editor = getRichTextEditor(document.body);
    editor.innerHTML = '<div>Vollständiger bearbeiteter Text</div>';
    fireEvent.input(editor);
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    expect(setPlannerState).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting a local note', async () => {
    const user = userEvent.setup();
    const setPlannerState = vi.fn();

    render(
      <PlannerShell
        activeTab="notes"
        setActiveTab={vi.fn()}
        plannerState={plannerFixture}
        setPlannerState={setPlannerState}
        familyInvites={[]}
        setFamilyInvites={vi.fn()}
        authState={{ stage: 'signed-out', session: null, profile: null, family: null, error: null, message: null }}
        cloudSync={cloudSyncFixture}
        setCloudSync={vi.fn()}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
        onDeleteAccount={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamily={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamilyMemberAccount={vi.fn().mockResolvedValue(undefined)}
        onUpdateFamilyRegistration={vi.fn().mockResolvedValue({
          familyId: 'family-1',
          familyName: 'Familie Test',
          role: 'admin',
          ownerUserId: 'member-admin',
          isOwner: true,
          allowOpenRegistration: true,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Notiz Hinweis löschen' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Löschen?' })).toBeInTheDocument();
    expect(setPlannerState).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }));
    expect(setPlannerState).toHaveBeenCalled();
  });

  it('shows the green sign-out button in settings and forwards sign-out', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <PlannerShell
        activeTab="family"
        setActiveTab={vi.fn()}
        plannerState={plannerFixture}
        setPlannerState={vi.fn()}
        familyInvites={[]}
        setFamilyInvites={vi.fn()}
        authState={{
          stage: 'authenticated',
          session: { access_token: 'token' } as never,
          profile: {
            id: 'member-admin',
            display_name: 'Alex Admin',
            email: 'alex@example.com',
            role: 'admin',
          },
          family: {
            familyId: 'family-1',
            familyName: 'Familie Test',
            role: 'admin',
            ownerUserId: 'member-admin',
            isOwner: true,
            allowOpenRegistration: true,
          },
          error: null,
          message: null,
        }}
        cloudSync={cloudSyncFixture}
        setCloudSync={vi.fn()}
        onSignOut={onSignOut}
        onDeleteAccount={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamily={vi.fn().mockResolvedValue(undefined)}
        onDeleteFamilyMemberAccount={vi.fn().mockResolvedValue(undefined)}
        onUpdateFamilyRegistration={vi.fn().mockResolvedValue({
          familyId: 'family-1',
          familyName: 'Familie Test',
          role: 'admin',
          ownerUserId: 'member-admin',
          isOwner: true,
          allowOpenRegistration: true,
        })}
      />,
    );

    const signOutButton = screen.getByRole('button', { name: 'Ausloggen' });

    expect(signOutButton).toHaveAttribute('data-app-button-variant', 'primary');

    await user.click(signOutButton);

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});