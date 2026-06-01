import type { PlannerState, DocumentItem, UserRole } from '../../lib/planner-data';
import type { SupabaseFamilyContext, SupabaseProfile } from '../../lib/supabase';
import type { DocumentFilterKind, DocumentSortOption } from '../../app/types';

type DocumentMetaPartTone = 'muted' | 'strong' | 'accent';

const IMAGE_DOCUMENT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const PDF_DOCUMENT_PATTERN = /\.pdf$/i;
const WORD_DOCUMENT_PATTERN = /\.(doc|docx)$/i;

export const DOCUMENT_SORT_OPTIONS: Array<{ value: DocumentSortOption; label: string }> = [
  { value: 'recent', label: 'Neueste zuerst' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'kind', label: 'Dateityp' },
];

export const DOCUMENT_KIND_FILTER_OPTIONS: Array<{ value: DocumentFilterKind; label: string }> = [
  { value: 'all', label: 'Alle Typen' },
  { value: 'image', label: 'Bilder' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'file', label: 'Dateien' },
];

function getDocumentReference(document: DocumentItem) {
  return document.filePath || document.name;
}

export function isPreviewableImage(document: DocumentItem) {
  return IMAGE_DOCUMENT_PATTERN.test(getDocumentReference(document));
}

export function getDocumentKind(document: DocumentItem) {
  const reference = getDocumentReference(document);

  if (IMAGE_DOCUMENT_PATTERN.test(reference)) {
    return 'image';
  }

  if (PDF_DOCUMENT_PATTERN.test(reference)) {
    return 'pdf';
  }

  if (WORD_DOCUMENT_PATTERN.test(reference)) {
    return 'word';
  }

  return 'file';
}

export function getDocumentIcon(document: DocumentItem) {
  switch (getDocumentKind(document)) {
    case 'image':
      return 'Bild';
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'Word';
    default:
      return 'Datei';
  }
}

export function getDocumentMetaParts(document: DocumentItem) {
  const type = getDocumentIcon(document).trim();
  const parts: Array<{ key: string; value: string; tone: DocumentMetaPartTone } | null> = [
    type ? { key: `type-${type}`, value: type, tone: 'strong' } : null,
  ];

  return parts.filter(
    (part): part is { key: string; value: string; tone: DocumentMetaPartTone } => part !== null,
  );
}

export function getRoleLabel(role: UserRole) {
  return role === 'admin' ? 'Admin' : 'Familienmitglied';
}

export function getRoleChipClass(role: UserRole) {
  return role === 'admin'
    ? 'chip border border-[rgba(24,52,47,0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] font-semibold tracking-[0.01em] bg-[linear-gradient(135deg,rgba(24,52,47,0.16),rgba(43,108,89,0.22))] text-[#18342f]'
    : 'chip border border-[rgba(244,111,58,0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] font-semibold tracking-[0.01em] bg-[linear-gradient(135deg,rgba(244,111,58,0.12),rgba(251,244,236,0.88))] text-[#9a4b29]';
}

export function isFamilyOwnerMember(memberId: string, family: SupabaseFamilyContext | null) {
  return Boolean(family?.ownerUserId && family.ownerUserId === memberId);
}

export function FamilyStatusBadges({
  role,
  isOwner,
}: {
  role: UserRole;
  isOwner?: boolean;
}) {
  return (
    <div className="family-status-badges gap-2 flex">
      {isOwner ? <span className="chip border border-[rgba(180,120,35,0.18)] bg-[linear-gradient(135deg,rgba(221,179,87,0.16),rgba(253,244,221,0.92))] text-[#825c18] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] font-semibold tracking-[0.01em]">Familiengründer</span> : null}
      <span className={getRoleChipClass(role)}>{getRoleLabel(role)}</span>
    </div>
  );
}

export function getFamilyPermissionNote(
  profile: SupabaseProfile | null,
  family: SupabaseFamilyContext | null,
) {
  if (!profile) {
    return null;
  }

  if (family?.isOwner && profile.role !== 'admin') {
    return 'Du bist Familiengründer. Du kannst Mitglieder einladen, aber keine Registrierungeinstellungen oder Admin-Rollen verwalten.';
  }

  if (profile.role === 'admin' && family?.isOwner) {
    return 'Du bist Familiengründer und Admin. Du verwaltest Einladungen, Admin-Rollen und die Registrierungeinstellungen der Familie.';
  }

  if (profile.role === 'admin') {
    return 'Du bist Admin. Du verwaltest Einladungen, Admin-Rollen und die Registrierungeinstellungen der Familie.';
  }

  return 'Du bist Familienmitglied ohne Verwaltungsrechte.';
}

export function canPreviewDocument(document: DocumentItem) {
  const kind = getDocumentKind(document);

  return kind === 'image' || kind === 'pdf';
}

export function compareDocumentLabels(left: string, right: string) {
  return left.localeCompare(right, 'de', { sensitivity: 'base' });
}

export function syncPlannerWithAuth(
  current: PlannerState,
  profile: SupabaseProfile,
  family: SupabaseFamilyContext | null,
): PlannerState {
  const syncedRole = family?.role ?? profile.role;
  const syncedMember = {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    role: syncedRole,
  };

  const existingMemberIndex = current.members.findIndex((member) => member.id === profile.id);
  let nextMembers = current.members;
  let changed = false;

  if (existingMemberIndex === -1) {
    nextMembers = [syncedMember, ...current.members.filter((member) => member.email !== profile.email)];
    changed = true;
  } else {
    const existingMember = current.members[existingMemberIndex];
    if (
      existingMember.name !== syncedMember.name
      || existingMember.email !== syncedMember.email
      || existingMember.role !== syncedMember.role
    ) {
      nextMembers = current.members.map((member, index) =>
        index === existingMemberIndex ? syncedMember : member,
      );
      changed = true;
    }
  }

  if (current.activeUserId !== profile.id) {
    changed = true;
  }

  if (current.storageMode !== 'supabase-ready') {
    changed = true;
  }

  if (family?.familyName && current.familyName !== family.familyName) {
    changed = true;
  }

  if (!changed) {
    return current;
  }

  return {
    ...current,
    activeUserId: profile.id,
    familyName: family?.familyName ?? current.familyName,
    storageMode: 'supabase-ready',
    members: nextMembers,
  };
}