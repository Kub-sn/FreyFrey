import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  canPreviewDocument,
  compareDocumentLabels,
  FamilyStatusBadges,
  getDocumentKind,
  getDocumentMetaParts,
  getFamilyPermissionNote,
  syncPlannerWithAuth,
} from './planner-shell-utils';
import { authFixture, plannerFixture } from './planner-test-fixtures';

describe('planner-shell-utils', () => {
  it('derives document kind and preview capability', () => {
    expect(getDocumentKind(plannerFixture.documents[0])).toBe('pdf');
    expect(canPreviewDocument(plannerFixture.documents[0])).toBe(true);
    expect(getDocumentMetaParts(plannerFixture.documents[0]).length).toBeGreaterThan(0);
    expect(compareDocumentLabels('Äpfel', 'Birnen')).toBeLessThan(0);
  });

  it('renders family status badges and permission notes', () => {
    render(<FamilyStatusBadges role="admin" isOwner />);

    expect(screen.getByText('Gründerstatus')).toBeInTheDocument();
    expect(getFamilyPermissionNote(authFixture.profile, authFixture.family)).toContain('Familiengründer');
  });

  it('syncs local planner state with authenticated profile data', () => {
    const nextState = syncPlannerWithAuth(
      { ...plannerFixture, members: plannerFixture.members.filter((member) => member.id !== 'member-admin') },
      authFixture.profile!,
      authFixture.family,
    );

    expect(nextState.activeUserId).toBe('member-admin');
    expect(nextState.storageMode).toBe('supabase-ready');
    expect(nextState.members[0]?.email).toBe('alex@example.com');
  });
});