import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { RESET_PASSWORD_PATH } from './auth-redirect';
import { resolveSupabasePublicKey } from './supabase-config';
import type {
  CalendarItem,
  DocumentItem,
  MealItem,
  NoteItem,
  ShoppingItem,
  TaskItem,
  UserRole,
} from './planner-data';

export type SupabaseProfile = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
};

export type SupabaseFamilyContext = {
  familyId: string;
  familyName: string;
  role: UserRole;
};

export type SupabaseFamilyInvite = {
  id: string;
  familyId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  acceptedAt: string | null;
};

export type CreateFamilyInviteResult = {
  invite: SupabaseFamilyInvite;
  emailSent: boolean;
};

type ShoppingItemRow = {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
};

type TaskRow = {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
};

type NoteRow = {
  id: string;
  title: string;
  text: string;
  tag: string;
};

type CalendarRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
};

type MealRow = {
  id: string;
  day: string;
  meal: string;
  prepared: boolean;
};

type DocumentRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  link_url: string | null;
  file_path: string | null;
};

type FamilyMemberRow = {
  user_id: string;
  role: UserRole;
};

type FamilyInviteRow = {
  id: string;
  family_id: string;
  email: string;
  role: UserRole;
  created_at: string;
  accepted_at: string | null;
};

type EdgeFunctionErrorLike = Error & {
  context?: {
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = resolveSupabasePublicKey(import.meta.env);
const DOCUMENT_BUCKET = 'family-documents';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert. Bitte .env einrichten.');
  }

  return supabase;
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'dokument'
  );
}

function buildDocumentStoragePath(familyId: string, fileName: string) {
  return `${familyId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

async function createSignedDocumentUrl(client: SupabaseClient, filePath: string) {
  const { data, error } = await client.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function uploadDocumentFile(familyId: string, file: File) {
  const client = requireSupabase();
  const filePath = buildDocumentStoragePath(familyId, file.name);
  const { error } = await client.storage.from(DOCUMENT_BUCKET).upload(filePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }

  return {
    filePath,
    linkUrl: await createSignedDocumentUrl(client, filePath),
  };
}

export async function deleteDocument(documentId: string, filePath?: string) {
  const client = requireSupabase();

  if (filePath) {
    const { error: storageError } = await client.storage.from(DOCUMENT_BUCKET).remove([filePath]);

    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await client.from('documents').delete().eq('id', documentId);

  if (error) {
    throw error;
  }
}

export async function updateDocument(
  documentId: string,
  payload: Omit<DocumentItem, 'id'>,
): Promise<DocumentItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('documents')
    .update({
      name: payload.name,
      category: payload.category,
      status: payload.status,
      link_url: payload.filePath ? null : payload.linkUrl || null,
    })
    .eq('id', documentId)
    .select('id, name, category, status, link_url, file_path')
    .single();

  if (error) {
    throw error;
  }

  const document = data as DocumentRow;

  return {
    id: document.id,
    name: document.name,
    category: document.category,
    status: document.status,
    linkUrl: document.file_path
      ? await createSignedDocumentUrl(client, document.file_path)
      : document.link_url ?? '',
    filePath: document.file_path ?? '',
  };
}

function deriveDisplayName(user: User, fallbackDisplayName?: string) {
  return (
    fallbackDisplayName ||
    String(user.user_metadata.display_name || '').trim() ||
    user.email?.split('@')[0] ||
    'Familienmitglied'
  );
}

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function getAuthRedirectBaseUrl() {
  if (typeof window === 'undefined' || !window.location.origin) {
    return undefined;
  }

  return window.location.origin;
}

function getResetPasswordRedirectUrl() {
  const baseUrl = getAuthRedirectBaseUrl();

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl}${RESET_PASSWORD_PATH}`;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithPassword(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({
    email: normalizeEmailAddress(email),
    password,
  });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string,
) {
  const emailRedirectTo = getAuthRedirectBaseUrl();

  return requireSupabase().auth.signUp({
    email: normalizeEmailAddress(email),
    password,
    options: {
      data: {
        display_name: displayName,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = getResetPasswordRedirectUrl();

  return requireSupabase().auth.resetPasswordForEmail(normalizeEmailAddress(email), {
    ...(redirectTo ? { redirectTo } : {}),
  });
}

export async function updatePassword(password: string) {
  return requireSupabase().auth.updateUser({
    password,
  });
}

export async function signOutFromSupabase() {
  return requireSupabase().auth.signOut();
}

export async function ensureProfile(
  user: User,
  fallbackDisplayName?: string,
): Promise<SupabaseProfile> {
  const client = requireSupabase();
  const nextDisplayName = deriveDisplayName(user, fallbackDisplayName);
  const nextEmail = user.email ?? '';

  const { data: existingProfile, error: existingProfileError } = await client
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (!existingProfile) {
    const { error: insertError } = await client.from('profiles').insert({
      id: user.id,
      display_name: nextDisplayName,
      email: nextEmail,
      role: 'familyuser',
    });

    if (insertError) {
      throw insertError;
    }
  } else if (
    existingProfile.display_name !== nextDisplayName ||
    existingProfile.email !== nextEmail
  ) {
    const { error: updateError } = await client
      .from('profiles')
      .update({
        display_name: nextDisplayName,
        email: nextEmail,
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return data as SupabaseProfile;
}

export async function fetchFamilyContext(
  userId: string,
): Promise<SupabaseFamilyContext | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('family_members')
    .select('family_id, role, family:families(id, name)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.family) {
    return null;
  }

  const family = Array.isArray(data.family) ? data.family[0] : data.family;

  return {
    familyId: String(data.family_id),
    familyName: String(family.name),
    role: data.role as UserRole,
  };
}

export async function fetchFamilyMembers(familyId: string) {
  const client = requireSupabase();
  const { data: memberships, error: membershipError } = await client
    .from('family_members')
    .select('user_id, role')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  if (membershipError) {
    throw membershipError;
  }

  const memberRows = (memberships ?? []) as FamilyMemberRow[];

  if (memberRows.length === 0) {
    return [];
  }

  const userIds = memberRows.map((member) => member.user_id);
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds);

  if (profileError) {
    throw profileError;
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [String(profile.id), profile]),
  );

  return memberRows.map((member) => {
    const profile = profileMap.get(member.user_id);

    return {
      id: member.user_id,
      name: String(profile?.display_name ?? 'Familienmitglied'),
      email: String(profile?.email ?? ''),
      role: member.role,
    };
  });
}

export async function fetchFamilyInvites(familyId: string): Promise<SupabaseFamilyInvite[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('family_invites')
    .select('id, family_id, email, role, created_at, accepted_at')
    .eq('family_id', familyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as FamilyInviteRow[]).map((invite) => ({
    id: invite.id,
    familyId: invite.family_id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at,
    acceptedAt: invite.accepted_at,
  }));
}

export async function removeFamilyInvite(inviteId: string) {
  const client = requireSupabase();
  const normalizedInviteId = inviteId.trim();

  if (!normalizedInviteId) {
    throw new Error('Es wurde keine Einladung zum Zurueckziehen uebergeben.');
  }

  const { data, error } = await client
    .from('family_invites')
    .delete()
    .eq('id', normalizedInviteId)
    .is('accepted_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Die Einladung konnte nicht mehr gefunden werden. Bitte aktualisiere die Ansicht.');
  }
}

function mapFamilyInvite(invite: FamilyInviteRow): SupabaseFamilyInvite {
  return {
    id: invite.id,
    familyId: invite.family_id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at,
    acceptedAt: invite.accepted_at,
  };
}

async function extractEdgeFunctionErrorMessage(error: EdgeFunctionErrorLike) {
  const response = error.context;

  if (!response) {
    return error.message;
  }

  const payload = await response.json?.().catch(() => null);

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const details = 'details' in payload && typeof payload.details === 'string'
      ? ` ${payload.details}`
      : '';
    const errorMessage = typeof payload.error === 'string' ? payload.error : error.message;

    return `${errorMessage}${details}`.trim();
  }

  const text = await response.text?.().catch(() => '');

  return text || error.message;
}

async function resolveEdgeFunctionAccessToken(client: SupabaseClient) {
  const {
    data: refreshData,
    error: refreshError,
  } = await client.auth.refreshSession();

  if (refreshData.session?.access_token) {
    return refreshData.session.access_token;
  }

  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  if (refreshError || sessionError) {
    throw new Error('Die Einladungs-E-Mail konnte nicht gesendet werden, weil deine Anmeldung nicht mehr gueltig ist. Bitte einmal abmelden und erneut anmelden.');
  }

  throw new Error('Die Einladungs-E-Mail konnte nicht gesendet werden, weil keine gueltige Anmeldung gefunden wurde. Bitte erneut anmelden und noch einmal versuchen.');
}

async function triggerFamilyInviteEmail(client: SupabaseClient, inviteId: string) {
  const accessToken = await resolveEdgeFunctionAccessToken(client);

  client.functions.setAuth(accessToken);

  const { error } = await client.functions.invoke('send-family-invite', {
    body: {
      inviteId,
      appUrl: window.location.origin,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw new Error(await extractEdgeFunctionErrorMessage(error as EdgeFunctionErrorLike));
  }
}

export async function createFamilyInvite(
  familyId: string,
  email: string,
  role: UserRole,
  invitedByUserId: string,
): Promise<CreateFamilyInviteResult> {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  let invite: FamilyInviteRow | null = null;

  if (!normalizedEmail) {
    throw new Error('Bitte eine E-Mail-Adresse eingeben.');
  }

  const { data, error } = await client
    .from('family_invites')
    .insert({
      family_id: familyId,
      email: normalizedEmail,
      role,
      invited_by_user_id: invitedByUserId,
    })
    .select('id, family_id, email, role, created_at, accepted_at')
    .single();

  if (error) {
    if (error.code !== '23505') {
      throw error;
    }

    const { data: existingInvite, error: existingInviteError } = await client
      .from('family_invites')
      .select('id, family_id, email, role, created_at, accepted_at')
      .eq('family_id', familyId)
      .eq('email', normalizedEmail)
      .is('accepted_at', null)
      .single();

    if (existingInviteError || !existingInvite) {
      throw error;
    }

    invite = existingInvite as FamilyInviteRow;
  } else {
    invite = data as FamilyInviteRow;
  }

  await triggerFamilyInviteEmail(client, invite.id);

  return {
    invite: mapFamilyInvite(invite),
    emailSent: true,
  };
}

export async function acceptPendingFamilyInvite(userId: string, email: string) {
  const client = requireSupabase();
  if (!userId || !email.trim()) {
    return null;
  }

  const { data, error } = await client.rpc('accept_family_invite_for_current_user');

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const invite = Array.isArray(data) ? data[0] : data;

  if (!invite) {
    return null;
  }

  return invite;
}

export async function bootstrapFamilyForUser(user: User, familyName: string) {
  const client = requireSupabase();
  const normalizedFamilyName = familyName.trim();

  if (!normalizedFamilyName) {
    throw new Error('Bitte einen Familiennamen eingeben.');
  }

  const { data: family, error: familyError } = await client
    .from('families')
    .insert({
      name: normalizedFamilyName,
      owner_user_id: user.id,
    })
    .select('id, name')
    .single();

  if (familyError) {
    throw familyError;
  }

  const { error: membershipError } = await client.from('family_members').insert({
    family_id: family.id,
    user_id: user.id,
    role: 'admin',
  });

  if (membershipError) {
    throw membershipError;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id);

  if (profileError) {
    throw profileError;
  }

  return {
    familyId: String(family.id),
    familyName: String(family.name),
    role: 'admin' as const,
  };
}

export async function fetchShoppingItems(familyId: string): Promise<ShoppingItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shopping_items')
    .select('id, name, quantity, category, checked')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as ShoppingItemRow[]).map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    checked: item.checked,
  }));
}

export async function createShoppingItem(
  familyId: string,
  payload: Omit<ShoppingItem, 'id'>,
): Promise<ShoppingItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shopping_items')
    .insert({ family_id: familyId, ...payload })
    .select('id, name, quantity, category, checked')
    .single();

  if (error) {
    throw error;
  }

  const item = data as ShoppingItemRow;

  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    checked: item.checked,
  };
}

export async function updateShoppingItemChecked(id: string, checked: boolean) {
  const client = requireSupabase();
  const { error } = await client.from('shopping_items').update({ checked }).eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchTasks(familyId: string): Promise<TaskItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tasks')
    .select('id, title, owner, due, done')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as TaskRow[]).map((task) => ({
    id: task.id,
    title: task.title,
    owner: task.owner,
    due: task.due,
    done: task.done,
  }));
}

export async function createTask(
  familyId: string,
  payload: Omit<TaskItem, 'id'>,
): Promise<TaskItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tasks')
    .insert({ family_id: familyId, ...payload })
    .select('id, title, owner, due, done')
    .single();

  if (error) {
    throw error;
  }

  const task = data as TaskRow;

  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    due: task.due,
    done: task.done,
  };
}

export async function updateTaskDone(id: string, done: boolean) {
  const client = requireSupabase();
  const { error } = await client.from('tasks').update({ done }).eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchNotes(familyId: string): Promise<NoteItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notes')
    .select('id, title, text, tag')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as NoteRow[]).map((note) => ({
    id: note.id,
    title: note.title,
    text: note.text,
    tag: note.tag,
  }));
}

export async function createNote(
  familyId: string,
  payload: Omit<NoteItem, 'id'>,
): Promise<NoteItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notes')
    .insert({ family_id: familyId, ...payload })
    .select('id, title, text, tag')
    .single();

  if (error) {
    throw error;
  }

  const note = data as NoteRow;

  return {
    id: note.id,
    title: note.title,
    text: note.text,
    tag: note.tag,
  };
}

export async function fetchCalendarEntries(familyId: string): Promise<CalendarItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('calendar_events')
    .select('id, title, date, time, place')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as CalendarRow[]).map((entry) => ({
    id: entry.id,
    title: entry.title,
    date: entry.date,
    time: entry.time,
    place: entry.place,
  }));
}

export async function createCalendarEntry(
  familyId: string,
  payload: Omit<CalendarItem, 'id'>,
): Promise<CalendarItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('calendar_events')
    .insert({ family_id: familyId, ...payload })
    .select('id, title, date, time, place')
    .single();

  if (error) {
    throw error;
  }

  const entry = data as CalendarRow;

  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    time: entry.time,
    place: entry.place,
  };
}

export async function fetchMeals(familyId: string): Promise<MealItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('meals')
    .select('id, day, meal, prepared')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as MealRow[]).map((entry) => ({
    id: entry.id,
    day: entry.day,
    meal: entry.meal,
    prepared: entry.prepared,
  }));
}

export async function createMeal(
  familyId: string,
  payload: Omit<MealItem, 'id'>,
): Promise<MealItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('meals')
    .insert({ family_id: familyId, ...payload })
    .select('id, day, meal, prepared')
    .single();

  if (error) {
    throw error;
  }

  const entry = data as MealRow;

  return {
    id: entry.id,
    day: entry.day,
    meal: entry.meal,
    prepared: entry.prepared,
  };
}

export async function updateMealPrepared(id: string, prepared: boolean) {
  const client = requireSupabase();
  const { error } = await client.from('meals').update({ prepared }).eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchDocuments(familyId: string): Promise<DocumentItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('documents')
    .select('id, name, category, status, link_url, file_path')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all(
    (data as DocumentRow[]).map(async (document) => ({
      id: document.id,
      name: document.name,
      category: document.category,
      status: document.status,
      linkUrl: document.file_path
        ? await createSignedDocumentUrl(client, document.file_path)
        : document.link_url ?? '',
      filePath: document.file_path ?? '',
    })),
  );
}

export async function createDocument(
  familyId: string,
  payload: Omit<DocumentItem, 'id'>,
): Promise<DocumentItem> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('documents')
    .insert({
      family_id: familyId,
      name: payload.name,
      category: payload.category,
      status: payload.status,
      link_url: payload.filePath ? null : payload.linkUrl || null,
      file_path: payload.filePath || null,
    })
    .select('id, name, category, status, link_url, file_path')
    .single();

  if (error) {
    throw error;
  }

  const document = data as DocumentRow;

  return {
    id: document.id,
    name: document.name,
    category: document.category,
    status: document.status,
    linkUrl: document.file_path
      ? await createSignedDocumentUrl(client, document.file_path)
      : document.link_url ?? '',
    filePath: document.file_path ?? '',
  };
}
