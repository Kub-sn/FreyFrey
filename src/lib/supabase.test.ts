import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

function buildInsertBuilder(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildExistingInviteBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildDeleteInviteBuilder(result: { data: unknown; error: unknown }) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function buildFamilyUpdateBuilder(result: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildNoteUpdateBuilder(result: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildNoteDeleteBuilder(result: { error: unknown }) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  };
}

function buildTaskListBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };
}

function buildTaskMutationBuilder(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildTaskDeleteBuilder(result: { error: unknown }) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  };
}

function buildShoppingListQueryBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };
}

function buildShoppingListMutationBuilder(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function buildShoppingItemInsertBuilder(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(result),
  };
}

describe('auth email normalization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('normalizes sign-in email addresses to lowercase', async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    createClientMock.mockReturnValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    });

    const { signInWithPassword } = await import('./supabase');

    await signInWithPassword('Kubi.Y@Example.com ', 'supersecret');

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'kubi.y@example.com',
      password: 'supersecret',
    });
  });

  it('normalizes sign-up email addresses to lowercase', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    createClientMock.mockReturnValue({
      auth: {
        signUp: signUpMock,
      },
    });

    const { signUpWithPassword } = await import('./supabase');

    await signUpWithPassword('Kubi.Y@Example.com ', 'supersecret', 'Kubi');

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'kubi.y@example.com',
      password: 'supersecret',
      options: {
        data: {
          display_name: 'Kubi',
        },
        emailRedirectTo: window.location.origin,
      },
    });
  });

  it('uses the current origin for password reset emails', async () => {
    const resetPasswordForEmailMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    createClientMock.mockReturnValue({
      auth: {
        resetPasswordForEmail: resetPasswordForEmailMock,
      },
    });

    const { resetPasswordForEmail } = await import('./supabase');

    await resetPasswordForEmail('Kubi.Y@Example.com ');

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('kubi.y@example.com', {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  });

  it('updates the current user password', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ data: {}, error: null });

    createClientMock.mockReturnValue({
      auth: {
        updateUser: updateUserMock,
      },
    });

    const { updatePassword } = await import('./supabase');

    await updatePassword('new-super-secret');

    expect(updateUserMock).toHaveBeenCalledWith({
      password: 'new-super-secret',
    });
  });

  it('invokes the delete account edge function with the refreshed auth token', async () => {
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token-delete',
        },
      },
      error: null,
    });
    const getSessionMock = vi.fn();
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
        signOut: signOutMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { deleteCurrentAccount } = await import('./supabase');

    await deleteCurrentAccount();

    expect(setAuthMock).toHaveBeenCalledWith('fresh-access-token-delete');
    expect(invokeMock).toHaveBeenCalledWith('delete-own-account', {
      headers: {
        Authorization: 'Bearer fresh-access-token-delete',
      },
    });
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('invokes the delete-family-member edge function with family and member ids', async () => {
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token-member-delete',
        },
      },
      error: null,
    });
    const getSessionMock = vi.fn();
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { deleteFamilyMemberAccount } = await import('./supabase');

    await deleteFamilyMemberAccount('family-77', 'user-77');

    expect(setAuthMock).toHaveBeenCalledWith('fresh-access-token-member-delete');
    expect(invokeMock).toHaveBeenCalledWith('delete-family-member', {
      body: {
        familyId: 'family-77',
        memberUserId: 'user-77',
      },
      headers: {
        Authorization: 'Bearer fresh-access-token-member-delete',
      },
    });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('invokes the delete-family edge function with the selected family id', async () => {
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token-family-delete',
        },
      },
      error: null,
    });
    const getSessionMock = vi.fn();
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { deleteFamily } = await import('./supabase');

    await deleteFamily('family-88');

    expect(setAuthMock).toHaveBeenCalledWith('fresh-access-token-family-delete');
    expect(invokeMock).toHaveBeenCalledWith('delete-family', {
      body: {
        familyId: 'family-88',
      },
      headers: {
        Authorization: 'Bearer fresh-access-token-family-delete',
      },
    });
    expect(getSessionMock).not.toHaveBeenCalled();
  });
});

describe('createFamilyInvite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    window.history.replaceState({}, '', '/app');
  });

  it('creates an invite and invokes the invite email function', async () => {
    const inviteRow = {
      id: 'invite-1',
      family_id: 'family-1',
      email: 'new@example.com',
      role: 'familyuser',
      created_at: '2026-04-04T10:00:00.000Z',
      accepted_at: null,
    };
    const rpcMock = vi.fn().mockResolvedValue({
      data: [inviteRow],
      error: null,
    });
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token-1',
        },
      },
      error: null,
    });
    const getSessionMock = vi.fn();
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      rpc: rpcMock,
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');
    const result = await createFamilyInvite(
      'family-1',
      'New@example.com',
      'familyuser',
    );

    expect(result).toEqual({
      invite: {
        id: 'invite-1',
        familyId: 'family-1',
        email: 'new@example.com',
        role: 'familyuser',
        createdAt: '2026-04-04T10:00:00.000Z',
        acceptedAt: null,
      },
      emailSent: true,
    });
    expect(rpcMock).toHaveBeenCalledWith('create_family_invite_for_current_user', {
      target_family_id: 'family-1',
      target_email: 'new@example.com',
      target_role: 'familyuser',
    });
    expect(setAuthMock).toHaveBeenCalledWith('fresh-access-token-1');
    expect(invokeMock).toHaveBeenCalledWith('send-family-invite', {
      body: {
        inviteId: 'invite-1',
        appUrl: window.location.origin,
      },
      headers: {
        Authorization: 'Bearer fresh-access-token-1',
      },
    });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('surfaces a clear error when the invite rpc returns no row', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-access-token-2',
        },
      },
      error: null,
    });
    const getSessionMock = vi.fn();
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      rpc: rpcMock,
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');

    await expect(
      createFamilyInvite('family-1', 'new@example.com', 'familyuser'),
    ).rejects.toThrow('Die Einladung konnte nicht gespeichert werden. Bitte versuche es erneut.');

    expect(setAuthMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('shows a clear error when no session token is available for the invite email', async () => {
    const inviteRow = {
      id: 'invite-2',
      family_id: 'family-1',
      email: 'new@example.com',
      role: 'familyuser',
      created_at: '2026-04-04T10:00:00.000Z',
      accepted_at: null,
    };
    const rpcMock = vi.fn().mockResolvedValue({
      data: [inviteRow],
      error: null,
    });
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    const getSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    const invokeMock = vi.fn();
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      rpc: rpcMock,
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');

    await expect(
      createFamilyInvite('family-1', 'new@example.com', 'familyuser'),
    ).rejects.toThrow(
      'Die Einladungs-E-Mail konnte nicht gesendet werden, weil keine gueltige Anmeldung gefunden wurde. Bitte erneut anmelden und noch einmal versuchen.',
    );

    expect(setAuthMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to the stored session when refresh does not return a new token', async () => {
    const inviteRow = {
      id: 'invite-3',
      family_id: 'family-1',
      email: 'new@example.com',
      role: 'familyuser',
      created_at: '2026-04-04T10:00:00.000Z',
      accepted_at: null,
    };
    const rpcMock = vi.fn().mockResolvedValue({
      data: [inviteRow],
      error: null,
    });
    const refreshSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    const getSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'stored-access-token-3',
        },
      },
      error: null,
    });
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const setAuthMock = vi.fn();

    createClientMock.mockReturnValue({
      rpc: rpcMock,
      auth: {
        refreshSession: refreshSessionMock,
        getSession: getSessionMock,
      },
      functions: {
        setAuth: setAuthMock,
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');

    await createFamilyInvite('family-1', 'new@example.com', 'familyuser');

    expect(setAuthMock).toHaveBeenCalledWith('stored-access-token-3');
    expect(invokeMock).toHaveBeenCalledWith('send-family-invite', {
      body: {
        inviteId: 'invite-3',
        appUrl: window.location.origin,
      },
      headers: {
        Authorization: 'Bearer stored-access-token-3',
      },
    });
  });
});

describe('bootstrapFamilyForUser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('creates a new family through the bootstrap rpc and keeps the creator as familyuser', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          family_id: 'family-boot',
          family_name: 'Familie Boot',
          role: 'familyuser',
          allow_open_registration: true,
          is_owner: true,
        },
      ],
      error: null,
    });

    createClientMock.mockReturnValue({
      rpc: rpcMock,
    });

    const { bootstrapFamilyForUser } = await import('./supabase');
    const result = await bootstrapFamilyForUser(
      {
        id: 'user-boot',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-04-06T10:00:00.000Z',
      } as never,
      'Familie Boot',
    );

    expect(rpcMock).toHaveBeenCalledWith('bootstrap_family_for_current_user', {
      target_family_name: 'Familie Boot',
    });
    expect(result).toEqual({
      familyId: 'family-boot',
      familyName: 'Familie Boot',
      role: 'familyuser',
      allowOpenRegistration: true,
      isOwner: true,
      ownerUserId: 'user-boot',
    });
  });
});

describe('shopping list persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('maps null shopping item quantities from Supabase to undefined', async () => {
    const shoppingListsBuilder = buildShoppingListQueryBuilder({
      data: [
        {
          id: 'shopping-list-1',
          title: 'Supermarkt',
          shopping_date: '2026-05-06',
        },
      ],
      error: null,
    });
    const shoppingItemsBuilder = buildShoppingListQueryBuilder({
      data: [
        {
          id: 'shopping-item-1',
          list_id: 'shopping-list-1',
          name: 'Wasser',
          quantity: null,
          checked: false,
        },
      ],
      error: null,
    });
    const fromMock = vi.fn((table: string) => {
      if (table === 'shopping_lists') {
        return shoppingListsBuilder;
      }

      if (table === 'shopping_items') {
        return shoppingItemsBuilder;
      }

      throw new Error(`unexpected table ${table}`);
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchShoppingLists } = await import('./supabase');
    const result = await fetchShoppingLists('family-1');

    expect(result).toEqual([
      {
        id: 'shopping-list-1',
        title: 'Supermarkt',
        date: '2026-05-06',
        items: [
          {
            id: 'shopping-item-1',
            name: 'Wasser',
            quantity: undefined,
            checked: false,
          },
        ],
      },
    ]);
  });

  it('stores missing shopping item quantities as an empty string for backward-compatible inserts', async () => {
    const shoppingListsBuilder = buildShoppingListMutationBuilder({
      data: {
        id: 'shopping-list-1',
        title: 'Supermarkt',
        shopping_date: '2026-05-06',
      },
      error: null,
    });
    const shoppingItemsBuilder = buildShoppingItemInsertBuilder({
      data: [
        {
          id: 'shopping-item-1',
          list_id: 'shopping-list-1',
          name: 'Wasser',
          quantity: '',
          checked: false,
        },
      ],
      error: null,
    });
    const fromMock = vi.fn((table: string) => {
      if (table === 'shopping_lists') {
        return shoppingListsBuilder;
      }

      if (table === 'shopping_items') {
        return shoppingItemsBuilder;
      }

      throw new Error(`unexpected table ${table}`);
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { createShoppingList } = await import('./supabase');
    const result = await createShoppingList('family-1', {
      title: 'Supermarkt',
      date: '2026-05-06',
      items: [
        {
          id: 'shopping-item-draft',
          name: 'Wasser',
          checked: false,
        },
      ],
    });

    expect(shoppingItemsBuilder.insert).toHaveBeenCalledWith([
      {
        family_id: 'family-1',
        list_id: 'shopping-list-1',
        name: 'Wasser',
        quantity: '',
        checked: false,
      },
    ]);
    expect(result).toEqual({
      id: 'shopping-list-1',
      title: 'Supermarkt',
      date: '2026-05-06',
      items: [
        {
          id: 'shopping-item-1',
          name: 'Wasser',
          quantity: undefined,
          checked: false,
        },
      ],
    });
  });

  it('normalizes empty-string shopping item quantities to undefined when fetching lists', async () => {
    const shoppingListsBuilder = buildShoppingListQueryBuilder({
      data: [
        {
          id: 'shopping-list-1',
          title: 'Supermarkt',
          shopping_date: '2026-05-06',
        },
      ],
      error: null,
    });
    const shoppingItemsBuilder = buildShoppingListQueryBuilder({
      data: [
        {
          id: 'shopping-item-1',
          list_id: 'shopping-list-1',
          name: 'Wasser',
          quantity: '',
          checked: false,
        },
      ],
      error: null,
    });
    const fromMock = vi.fn((table: string) => {
      if (table === 'shopping_lists') {
        return shoppingListsBuilder;
      }

      if (table === 'shopping_items') {
        return shoppingItemsBuilder;
      }

      throw new Error(`unexpected table ${table}`);
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchShoppingLists } = await import('./supabase');
    const result = await fetchShoppingLists('family-1');

    expect(result).toEqual([
      {
        id: 'shopping-list-1',
        title: 'Supermarkt',
        date: '2026-05-06',
        items: [
          {
            id: 'shopping-item-1',
            name: 'Wasser',
            quantity: undefined,
            checked: false,
          },
        ],
      },
    ]);
  });
});

describe('fetchAdminFamilyDirectory', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('groups admin family directory rows into sorted family entries', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          family_id: 'family-2',
          family_name: 'Familie Beta',
          allow_open_registration: false,
          owner_user_id: 'owner-2',
          member_user_id: 'owner-2',
          member_display_name: 'Lea',
          member_email: 'lea@example.com',
          member_role: 'familyuser',
        },
        {
          family_id: 'family-1',
          family_name: 'Familie Alpha',
          allow_open_registration: true,
          owner_user_id: 'owner-1',
          member_user_id: 'owner-1',
          member_display_name: 'Kubi',
          member_email: 'kubi@example.com',
          member_role: 'admin',
        },
        {
          family_id: 'family-1',
          family_name: 'Familie Alpha',
          allow_open_registration: true,
          owner_user_id: 'owner-1',
          member_user_id: 'member-1',
          member_display_name: 'Mia',
          member_email: 'mia@example.com',
          member_role: 'familyuser',
        },
      ],
      error: null,
    });

    createClientMock.mockReturnValue({
      rpc: rpcMock,
    });

    const { fetchAdminFamilyDirectory } = await import('./supabase');
    const result = await fetchAdminFamilyDirectory();

    expect(rpcMock).toHaveBeenCalledWith('get_admin_family_directory');
    expect(result).toEqual([
      {
        familyId: 'family-1',
        familyName: 'Familie Alpha',
        allowOpenRegistration: true,
        ownerUserId: 'owner-1',
        members: [
          {
            id: 'owner-1',
            name: 'Kubi',
            email: 'kubi@example.com',
            role: 'admin',
            isOwner: true,
          },
          {
            id: 'member-1',
            name: 'Mia',
            email: 'mia@example.com',
            role: 'familyuser',
            isOwner: false,
          },
        ],
      },
      {
        familyId: 'family-2',
        familyName: 'Familie Beta',
        allowOpenRegistration: false,
        ownerUserId: 'owner-2',
        members: [
          {
            id: 'owner-2',
            name: 'Lea',
            email: 'lea@example.com',
            role: 'familyuser',
            isOwner: true,
          },
        ],
      },
    ]);
  });
});

describe('removeFamilyInvite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('deletes a pending family invite by id', async () => {
    const deleteInviteBuilder = buildDeleteInviteBuilder({
      data: { id: 'invite-1' },
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteInviteBuilder),
    });

    const { removeFamilyInvite } = await import('./supabase');

    await expect(removeFamilyInvite('invite-1')).resolves.toBeUndefined();
  });

  it('shows a clear error when the invite no longer exists', async () => {
    const deleteInviteBuilder = buildDeleteInviteBuilder({
      data: null,
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteInviteBuilder),
    });

    const { removeFamilyInvite } = await import('./supabase');

    await expect(removeFamilyInvite('invite-missing')).rejects.toThrow(
      'Die Einladung konnte nicht mehr gefunden werden. Bitte aktualisiere die Ansicht.',
    );
  });
});

describe('registration controls', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('checks the registration gate with a normalized email address', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          registration_allowed: false,
          pending_invite: false,
          open_registration_available: false,
          has_existing_families: true,
        },
      ],
      error: null,
    });

    createClientMock.mockReturnValue({
      rpc: rpcMock,
    });

    const { fetchRegistrationGate } = await import('./supabase');
    const gate = await fetchRegistrationGate(' New.User@Example.com ');

    expect(rpcMock).toHaveBeenCalledWith('get_registration_gate', {
      target_email: 'new.user@example.com',
    });
    expect(gate).toEqual({
      allowed: false,
      hasPendingInvite: false,
      hasOpenRegistration: false,
      hasExistingFamilies: true,
    });
  });

  it('updates the family registration setting and maps the response', async () => {
    const familyUpdateBuilder = buildFamilyUpdateBuilder({
      data: {
        id: 'family-1',
        name: 'Familie Test',
        allow_open_registration: false,
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(familyUpdateBuilder),
    });

    const { updateFamilyRegistrationSetting } = await import('./supabase');
    const family = await updateFamilyRegistrationSetting('family-1', false);

    expect(family).toEqual({
      familyId: 'family-1',
      familyName: 'Familie Test',
      role: 'admin',
      allowOpenRegistration: false,
    });
  });
});

describe('note persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('updates a note and returns the normalized record', async () => {
    const noteUpdateBuilder = buildNoteUpdateBuilder({
      data: {
        id: 'note-1',
        title: 'Ferienplanung',
        text: 'Kompletter bearbeiteter Text',
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(noteUpdateBuilder),
    });

    const { updateNote } = await import('./supabase');

    await expect(
      updateNote('note-1', { title: 'Ferienplanung', text: 'Kompletter bearbeiteter Text' }),
    ).resolves.toEqual({
      id: 'note-1',
      title: 'Ferienplanung',
      text: 'Kompletter bearbeiteter Text',
    });
  });

  it('deletes a note by id', async () => {
    const noteDeleteBuilder = buildNoteDeleteBuilder({
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(noteDeleteBuilder),
    });

    const { deleteNote } = await import('./supabase');

    await expect(deleteNote('note-1')).resolves.toBeUndefined();
  });
});

describe('task persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  });

  it('fetches tasks and normalizes malformed subtasks', async () => {
    const taskListBuilder = buildTaskListBuilder({
      data: [
        {
          id: 'task-1',
          title: 'Ranzen packen',
          owner: 'Alex',
          due: '2026-05-01',
          status: 'in-progress',
          subtasks: [
            { id: 'subtask-1', title: 'Deutschheft', done: true },
            { id: 'subtask-2', title: '   ', done: false },
            null,
          ],
        },
      ],
      error: null,
    });

    const fromMock = vi.fn().mockReturnValue(taskListBuilder);
    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { fetchTasks } = await import('./supabase');

    await expect(fetchTasks('family-1')).resolves.toEqual([
      {
        id: 'task-1',
        title: 'Ranzen packen',
        owner: 'Alex',
        due: '2026-05-01',
        status: 'in-progress',
        subtasks: [{ id: 'subtask-1', title: 'Deutschheft', done: true }],
      },
    ]);

    expect(fromMock).toHaveBeenCalledWith('tasks');
    expect(taskListBuilder.eq).toHaveBeenCalledWith('family_id', 'family-1');
    expect(taskListBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('creates a task and serializes subtasks for storage', async () => {
    const taskMutationBuilder = buildTaskMutationBuilder({
      data: {
        id: 'task-2',
        title: 'Elternbrief lesen',
        owner: 'Bea',
        due: '2026-05-02',
        status: 'todo',
        subtasks: [{ id: 'subtask-1', title: 'Unterschreiben', done: false }],
      },
      error: null,
    });

    const fromMock = vi.fn().mockReturnValue(taskMutationBuilder);
    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { createTask } = await import('./supabase');

    await expect(
      createTask('family-1', {
        title: 'Elternbrief lesen',
        owner: 'Bea',
        due: '2026-05-02',
        status: 'todo',
        subtasks: [{ id: 'subtask-1', title: 'Unterschreiben', done: false }],
      }),
    ).resolves.toEqual({
      id: 'task-2',
      title: 'Elternbrief lesen',
      owner: 'Bea',
      due: '2026-05-02',
      status: 'todo',
      subtasks: [{ id: 'subtask-1', title: 'Unterschreiben', done: false }],
    });

    expect(fromMock).toHaveBeenCalledWith('tasks');
    expect(taskMutationBuilder.insert).toHaveBeenCalledWith({
      family_id: 'family-1',
      title: 'Elternbrief lesen',
      owner: 'Bea',
      due: '2026-05-02',
      status: 'todo',
      subtasks: [{ id: 'subtask-1', title: 'Unterschreiben', done: false }],
    });
  });

  it('updates a task and keeps only valid subtasks in the response', async () => {
    const taskMutationBuilder = buildTaskMutationBuilder({
      data: {
        id: 'task-3',
        title: 'Turnbeutel pruefen',
        owner: 'Alex',
        due: '2026-05-03',
        status: 'done',
        subtasks: [
          { id: 'subtask-1', title: 'Schuhe', done: true },
          { id: '', title: 'Ignorieren', done: true },
        ],
      },
      error: null,
    });

    const fromMock = vi.fn().mockReturnValue(taskMutationBuilder);
    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { updateTask } = await import('./supabase');

    await expect(
      updateTask('task-3', {
        status: 'done',
        subtasks: [{ id: 'subtask-1', title: 'Schuhe', done: true }],
      }),
    ).resolves.toEqual({
      id: 'task-3',
      title: 'Turnbeutel pruefen',
      owner: 'Alex',
      due: '2026-05-03',
      status: 'done',
      subtasks: [{ id: 'subtask-1', title: 'Schuhe', done: true }],
    });

    expect(fromMock).toHaveBeenCalledWith('tasks');
    expect(taskMutationBuilder.update).toHaveBeenCalledWith({
      status: 'done',
      subtasks: [{ id: 'subtask-1', title: 'Schuhe', done: true }],
    });
    expect(taskMutationBuilder.eq).toHaveBeenCalledWith('id', 'task-3');
  });

  it('deletes a task by id', async () => {
    const taskDeleteBuilder = buildTaskDeleteBuilder({
      error: null,
    });

    const fromMock = vi.fn().mockReturnValue(taskDeleteBuilder);
    createClientMock.mockReturnValue({
      from: fromMock,
    });

    const { deleteTask } = await import('./supabase');

    await expect(deleteTask('task-4')).resolves.toBeUndefined();

    expect(fromMock).toHaveBeenCalledWith('tasks');
    expect(taskDeleteBuilder.eq).toHaveBeenCalledWith('id', 'task-4');
  });
});