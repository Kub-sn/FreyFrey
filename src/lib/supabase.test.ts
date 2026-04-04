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
      },
    });
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
    const familyInviteBuilder = buildInsertBuilder({
      data: inviteRow,
      error: null,
    });
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(familyInviteBuilder),
      functions: {
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');
    const result = await createFamilyInvite(
      'family-1',
      'New@example.com',
      'familyuser',
      'user-1',
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
    expect(invokeMock).toHaveBeenCalledWith('send-family-invite', {
      body: {
        inviteId: 'invite-1',
        appUrl: window.location.origin,
      },
    });
  });

  it('reuses an existing pending invite when the email is already invited', async () => {
    const duplicateError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    };
    const existingInvite = {
      id: 'invite-existing',
      family_id: 'family-1',
      email: 'new@example.com',
      role: 'familyuser',
      created_at: '2026-04-04T09:00:00.000Z',
      accepted_at: null,
    };
    const insertBuilder = buildInsertBuilder({
      data: null,
      error: duplicateError,
    });
    const existingInviteBuilder = buildExistingInviteBuilder({
      data: existingInvite,
      error: null,
    });
    const fromMock = vi.fn()
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(existingInviteBuilder);
    const invokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

    createClientMock.mockReturnValue({
      from: fromMock,
      functions: {
        invoke: invokeMock,
      },
    });

    const { createFamilyInvite } = await import('./supabase');
    const result = await createFamilyInvite(
      'family-1',
      'new@example.com',
      'familyuser',
      'user-1',
    );

    expect(result.invite.id).toBe('invite-existing');
    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenCalledWith('send-family-invite', {
      body: {
        inviteId: 'invite-existing',
        appUrl: window.location.origin,
      },
    });
  });
});