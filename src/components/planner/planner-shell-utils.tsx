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
  { value: 'category', label: 'Kategorie A-Z' },
  { value: 'status', label: 'Status A-Z' },
  { value: 'kind', label: 'Dateityp' },
];

export const DOCUMENT_KIND_FILTER_OPTIONS: Array<{ value: DocumentFilterKind; label: string }> = [
  { value: 'all', label: 'Alle Typen' },
  { value: 'image', label: 'Bilder' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'link', label: 'Links' },
  { value: 'file', label: 'Dateien' },
];

function getDocumentReference(document: DocumentItem) {
  return document.filePath || document.linkUrl || document.name;
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

  if (document.linkUrl && !document.filePath) {
    return 'link';
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
    case 'link':
      return 'Link';
    default:
      return 'Datei';
  }
}

export function getDocumentMetaParts(document: DocumentItem) {
  const category = document.category.trim();
  const type = getDocumentIcon(document).trim();
  const status = document.status.trim();
  const parts: Array<{ key: string; value: string; tone: DocumentMetaPartTone } | null> = [
    category && category.toLowerCase() !== 'dokument'
      ? { key: `category-${category}`, value: category, tone: 'muted' }
      : null,
    type ? { key: `type-${type}`, value: type, tone: 'strong' } : null,
    status ? { key: `status-${status}`, value: status, tone: 'accent' } : null,
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
    ? 'chip role-chip role-chip-admin'
    : 'chip role-chip role-chip-member';
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
    <div className="family-status-badges">
      {isOwner ? <span className="chip owner-status-badge">Gründerstatus</span> : null}
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
    return 'Du bist Familiengründer. Du kannst Mitglieder einladen, aber keine Konfiguration oder Admin-Rollen verwalten.';
  }

  if (profile.role === 'admin' && family?.isOwner) {
    return 'Du bist Familiengründer und Admin. Du verwaltest Einladungen, Admin-Rollen und die Familien-Konfiguration.';
  }

  if (profile.role === 'admin') {
    return 'Du bist Admin. Du verwaltest Einladungen, Admin-Rollen und die Familien-Konfiguration.';
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

export function getCalendarMetaParts(entry: { time: string; place: string }) {
  return [entry.time.trim(), entry.place.trim()].filter(Boolean).join(' · ');
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