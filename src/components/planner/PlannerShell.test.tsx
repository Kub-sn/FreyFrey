import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PlannerShell from './PlannerShell';
import { cloudSyncFixture, plannerFixture } from './planner-test-fixtures';

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
    expect(screen.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    await user.clear(screen.getByLabelText('Notizinhalt bearbeiten'));
    await user.type(screen.getByLabelText('Notizinhalt bearbeiten'), 'Vollständiger bearbeiteter Text');
    await user.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    expect(setPlannerState).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});