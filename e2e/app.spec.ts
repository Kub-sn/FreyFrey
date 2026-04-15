import { expect, test, type Page, type Route } from '@playwright/test';

const supabaseBaseUrl = 'https://aachyijzixdeupeqcdvk.supabase.co';
const recoverySession = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXJlY292ZXJ5IiwiZW1haWwiOiJhbGV4QGV4YW1wbGUuY29tIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
  refresh_token: 'refresh-token-recovery',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-recovery',
    email: 'alex@example.com',
    user_metadata: {},
  },
};

async function mockSupabaseAuth(page: Page) {
  const state = {
    pendingInvites: [
      {
        id: 'invite-open',
        family_id: 'family-1',
        email: 'open@example.com',
        role: 'familyuser',
        created_at: '2026-04-06T10:00:00.000Z',
        accepted_at: null,
      },
    ],
  };

  await page.route(`${supabaseBaseUrl}/auth/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(recoverySession.user),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      const grantType = url.searchParams.get('grant_type');

      if (grantType === 'password' || grantType === 'refresh_token') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(recoverySession),
        });
        return;
      }
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route(`${supabaseBaseUrl}/rest/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const select = url.searchParams.get('select') ?? '';
    const acceptsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json');

    let body: unknown = [];

    if (table === 'profiles' && acceptsObject) {
      body = {
        id: 'user-recovery',
        display_name: 'Alex',
        email: 'alex@example.com',
        role: 'familyuser',
      };
    } else if (table === 'profiles') {
      body = [
        {
          id: 'user-recovery',
          display_name: 'Alex',
          email: 'alex@example.com',
        },
      ];
    } else if (table === 'family_members' && (acceptsObject || select.includes('family:families'))) {
      body = {
        family_id: 'family-1',
        role: 'familyuser',
        family: {
          id: 'family-1',
          name: 'Familie Test',
          owner_user_id: 'user-recovery',
        },
      };
    } else if (table === 'family_members') {
      body = [
        {
          user_id: 'user-recovery',
          role: 'familyuser',
        },
      ];
    } else if (table === 'family_invites' && request.method() === 'DELETE') {
      const inviteFilter = url.searchParams.get('id') ?? '';
      const inviteId = inviteFilter.startsWith('eq.') ? inviteFilter.slice(3) : inviteFilter;
      const removedInvite = state.pendingInvites.find((invite) => invite.id === inviteId) ?? null;

      state.pendingInvites = state.pendingInvites.filter((invite) => invite.id !== inviteId);
      body = removedInvite ? { id: removedInvite.id } : null;
    } else if (table === 'family_invites') {
      body = state.pendingInvites;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route(`${supabaseBaseUrl}/functions/v1/**`, async (route: Route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/functions/v1/delete-own-account')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function mockSupabasePasswordRecovery(page: Page) {
  await page.route(`${supabaseBaseUrl}/auth/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/v1/recover')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function mockSupabaseRegistrationControls(page: Page) {
  const adminSession = {
    access_token: 'admin-access-token',
    refresh_token: 'admin-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-admin',
      email: 'admin@example.com',
      user_metadata: {},
    },
  };
  const state = {
    allowOpenRegistration: true,
    currentSession: null as typeof adminSession | null,
    families: [
      {
        family_id: 'family-2',
        family_name: 'Familie Abendrot',
        allow_open_registration: false,
        owner_user_id: 'user-evening',
        members: [
          {
            member_user_id: 'user-evening',
            member_display_name: 'Lea Abendrot',
            member_email: 'lea@example.com',
            member_role: 'familyuser' as const,
          },
          {
            member_user_id: 'user-evening-child',
            member_display_name: 'Tom Abendrot',
            member_email: 'tom.abendrot@example.com',
            member_role: 'familyuser' as const,
          },
        ],
      },
      {
        family_id: 'family-1',
        family_name: 'Familie Test',
        allow_open_registration: true,
        owner_user_id: 'user-admin',
        members: [
          {
            member_user_id: 'user-admin',
            member_display_name: 'Admin',
            member_email: 'admin@example.com',
            member_role: 'admin' as const,
          },
          {
            member_user_id: 'user-member',
            member_display_name: 'Mia Test',
            member_email: 'mia@example.com',
            member_role: 'familyuser' as const,
          },
        ],
      },
    ],
    lastCreatedInvite: null as null | {
      id: string;
      family_id: string;
      email: string;
      role: 'admin' | 'familyuser';
      created_at: string;
      accepted_at: string | null;
      invited_by_user_id: string;
    },
  };

  const parseRequestJson = (route: Route) => {
    const rawBody = route.request().postData();

    if (!rawBody) {
      return {} as Record<string, unknown>;
    }

    return JSON.parse(rawBody) as Record<string, unknown>;
  };

  await page.route(`${supabaseBaseUrl}/auth/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: state.currentSession ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(state.currentSession?.user ?? { error: 'Unauthorized' }),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      const grantType = url.searchParams.get('grant_type');

      if (grantType === 'password') {
        const payload = parseRequestJson(route);

        if (String(payload.email || '').toLowerCase() === 'admin@example.com') {
          state.currentSession = adminSession;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(adminSession),
          });
          return;
        }
      }

      if (grantType === 'refresh_token' && state.currentSession) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(state.currentSession),
        });
        return;
      }
    }

    if (url.pathname.endsWith('/auth/v1/signup')) {
      const payload = parseRequestJson(route);
      const email = String(payload.email || '').toLowerCase();

      if (!state.allowOpenRegistration && email !== 'invited@example.com') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 400,
            error_code: 'registration_blocked',
            msg: 'Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Bitte lass dir eine Einladung schicken.',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-signup',
            email,
            user_metadata: payload.data ?? {},
          },
          session: null,
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      state.currentSession = null;
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route(`${supabaseBaseUrl}/rest/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const select = url.searchParams.get('select') ?? '';
    const acceptsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json');

    if (path.endsWith('/rpc/get_registration_gate')) {
      const payload = parseRequestJson(route);
      const targetEmail = String(payload.target_email || '').toLowerCase();
      const allowed = state.allowOpenRegistration || targetEmail === 'invited@example.com';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            registration_allowed: allowed,
            pending_invite: targetEmail === 'invited@example.com',
            open_registration_available: state.allowOpenRegistration,
            has_existing_families: true,
          },
        ]),
      });
      return;
    }

    if (path.endsWith('/rpc/get_admin_family_directory')) {
      const directoryRows = state.families.flatMap((family) =>
        family.members.map((member) => ({
          family_id: family.family_id,
          family_name: family.family_name,
          allow_open_registration:
            family.family_id === 'family-1' ? state.allowOpenRegistration : family.allow_open_registration,
          owner_user_id: family.owner_user_id,
          member_user_id: member.member_user_id,
          member_display_name: member.member_display_name,
          member_email: member.member_email,
          member_role: member.member_role,
        })),
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(directoryRows),
      });
      return;
    }

    if (path.endsWith('/rpc/create_family_invite_for_current_user')) {
      const payload = parseRequestJson(route);
      state.lastCreatedInvite = {
        id: 'invite-created',
        family_id: String(payload.target_family_id || 'family-1'),
        email: String(payload.target_email || '').toLowerCase(),
        role: String(payload.target_role || 'familyuser') === 'admin' ? 'admin' : 'familyuser',
        created_at: '2026-04-07T12:00:00.000Z',
        accepted_at: null,
        invited_by_user_id: 'user-admin',
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([state.lastCreatedInvite]),
      });
      return;
    }

    const table = path.split('/').pop();
    let body: unknown = [];

    if (table === 'profiles' && acceptsObject) {
      body = {
        id: 'user-admin',
        display_name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
      };
    } else if (table === 'profiles') {
      body = [
        {
          id: 'user-admin',
          display_name: 'Admin',
          email: 'admin@example.com',
        },
      ];
    } else if (table === 'family_members' && (acceptsObject || select.includes('family:families'))) {
      body = {
        family_id: 'family-1',
        role: 'admin',
        family: {
          id: 'family-1',
          name: 'Familie Test',
          allow_open_registration: state.allowOpenRegistration,
        },
      };
    } else if (table === 'family_members') {
      body = [
        {
          user_id: 'user-admin',
          role: 'admin',
        },
      ];
    } else if (table === 'families' && request.method() === 'PATCH') {
      const payload = parseRequestJson(route);

      state.allowOpenRegistration = Boolean(payload.allow_open_registration);
      body = {
        id: 'family-1',
        name: 'Familie Test',
        allow_open_registration: state.allowOpenRegistration,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route(`${supabaseBaseUrl}/functions/v1/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const payload = parseRequestJson(route);

    if (url.pathname.endsWith('/functions/v1/delete-family-member')) {
      state.families = state.families.map((family) =>
        family.family_id === String(payload.familyId || '')
          ? {
              ...family,
              members: family.members.filter(
                (member) => member.member_user_id !== String(payload.memberUserId || ''),
              ),
            }
          : family,
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (url.pathname.endsWith('/functions/v1/delete-family')) {
      state.families = state.families.filter(
        (family) => family.family_id !== String(payload.familyId || ''),
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  return state;
}

test('shows the planner shell and lets the user open the shopping module', async ({ page }) => {
  await page.goto('/');

  const brandHeading = page.getByRole('heading', { name: 'Frey Frey' }).first();

  await expect(brandHeading).toBeVisible();

  if (await page.getByRole('button', { name: 'Jetzt anmelden' }).isVisible()) {
    await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrieren' })).toBeVisible();
    return;
  }

  await expect(page.getByText('Demo-Modus')).toBeVisible();
  await page.getByRole('button', { name: 'Einkauf' }).click();
  await expect(page.getByRole('heading', { name: 'Neuen Artikel hinzufügen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Artikel speichern' })).toBeVisible();
  await page.getByRole('button', { name: 'Notizen' }).click();
  await expect(page.getByRole('heading', { name: 'Neue Notiz' })).toBeVisible();
  await expect(page.getByPlaceholder('Kategorie')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Notiz speichern' })).toBeVisible();
  await page.getByRole('button', { name: 'Notiz Hinweis öffnen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Nicht vergessen.')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: 'Essensplan' }).click();
  await expect(page.getByRole('heading', { name: 'Gericht eintragen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gericht speichern' })).toBeVisible();
});

test('shows the upload-only documents module in a vertical stack', async ({ page }) => {
  await page.goto('/');

  if (await page.getByRole('button', { name: 'Jetzt anmelden' }).isVisible()) {
    return;
  }

  await page.getByRole('button', { name: 'Dokumente' }).click();

  await expect(page.getByRole('heading', { name: 'Dokument erfassen' })).toBeVisible();
  await expect(page.getByText('Datei hochladen')).toBeVisible();
  await expect(page.getByPlaceholder('Dokument')).toHaveCount(0);
  await expect(page.getByPlaceholder('Kategorie')).toHaveCount(0);
  await expect(page.getByPlaceholder('Status')).toHaveCount(0);
  await expect(page.getByPlaceholder('Link zum Dokument (optional)')).toHaveCount(0);

  const uploadCardBox = await page.locator('form.document-form-panel').boundingBox();
  const visibleDocumentsCardBox = await page.locator('.document-module-layout > .panel').nth(1).boundingBox();

  expect(uploadCardBox).not.toBeNull();
  expect(visibleDocumentsCardBox).not.toBeNull();
  expect(uploadCardBox!.height).toBeLessThanOrEqual(260);
  expect(visibleDocumentsCardBox!.y - (uploadCardBox!.y + uploadCardBox!.height)).toBeLessThanOrEqual(4);
});

test('keeps the document edit dialog free of horizontal scrolling for long names', async ({ page }) => {
  await page.goto('/');

  if (await page.getByRole('button', { name: 'Jetzt anmelden' }).isVisible()) {
    return;
  }

  await page.getByRole('button', { name: 'Dokumente' }).click();
  await page.locator('input[type="file"][name="file"]').setInputFiles({
    name: 'zertifikat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
  });
  await page.getByRole('button', { name: 'Dokument speichern' }).click();
  await page.getByRole('button', { name: 'Dokument zertifikat bearbeiten' }).click();

  const longName = 'certificate_of_completion_react_certificate_of_completion_react';

  await page.getByLabel('Dokumentname bearbeiten').fill(longName);
  await expect(page.getByRole('heading', { name: longName })).toBeVisible();
  await expect(
    page.getByText('Datei-Uploads behalten ihren Storage-Link. Nur die Metadaten werden geändert.'),
  ).toHaveCount(0);

  const dialogHasHorizontalOverflow = await page.locator('.modal-card').evaluate((element) => {
    return element.scrollWidth > element.clientWidth;
  });

  expect(dialogHasHorizontalOverflow).toBe(false);
});

test('lets the user complete the password reset flow and sign in afterwards', async ({ page }) => {
  await mockSupabaseAuth(page);

  await page.goto(
    '/auth/reset-password#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXJlY292ZXJ5IiwiZW1haWwiOiJhbGV4QGV4YW1wbGUuY29tIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature&refresh_token=refresh-token-recovery&expires_in=3600&token_type=bearer&type=recovery',
  );

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await expect(page.getByPlaceholder('Neues Passwort')).toBeVisible();
  await expect(page.getByPlaceholder('Passwort wiederholen')).toBeVisible();

  await page.getByPlaceholder('Neues Passwort').fill('supersecret2');
  await page.getByPlaceholder('Passwort wiederholen').fill('supersecret2');
  await page.getByRole('button', { name: 'Passwort speichern' }).click();

  await expect(page.getByText('Passwort erfolgreich aktualisiert.')).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();

  await page.getByPlaceholder('E-Mail').fill('alex@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret2');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await expect(page.getByText('Familie: Familie Test', { exact: true }).first()).toBeVisible();
});

test('lets the user request a password reset email from the sign-in screen', async ({ page }) => {
  await mockSupabasePasswordRecovery(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();

  await page.getByPlaceholder('E-Mail').fill('alex@example.com');
  await page.getByRole('button', { name: 'Passwort vergessen?' }).click();
  await expect(page.getByRole('button', { name: 'Reset-Link senden' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset-Link senden' }).click();

  const resetToast = page.getByText('Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.');

  await expect(resetToast).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hinweis schliessen' })).toBeVisible();
  await page.getByRole('button', { name: 'Hinweis schliessen' }).click();
  await expect(resetToast).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();
});

test('reveals the auth password field with the eye button', async ({ page }) => {
  await mockSupabaseAuth(page);

  await page.goto('/');

  const passwordInput = page.getByPlaceholder('Passwort');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await expect(passwordInput).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: 'Passwort anzeigen' }).click();
  await expect(passwordInput).toHaveAttribute('type', 'text');

  await page.getByRole('button', { name: 'Passwort verbergen' }).click();
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

test('keeps auth screens usable on mobile widths', async ({ page }) => {
  await mockSupabaseAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');

  const authCard = page.locator('.auth-card').first();
  const authCopy = page.locator('.auth-copy').first();
  const authPanel = page.locator('.auth-panel').first();

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();

  const assertMobileLayout = async () => {
    const [cardBox, copyBox, panelBox, widths] = await Promise.all([
      authCard.boundingBox(),
      authCopy.boundingBox(),
      authPanel.boundingBox(),
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    ]);

    expect(cardBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(panelBox).not.toBeNull();

    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
    expect(Math.abs((copyBox as NonNullable<typeof copyBox>).x - (panelBox as NonNullable<typeof panelBox>).x)).toBeLessThanOrEqual(2);
    expect((panelBox as NonNullable<typeof panelBox>).y).toBeGreaterThan((copyBox as NonNullable<typeof copyBox>).y + 40);
    expect((cardBox as NonNullable<typeof cardBox>).width).toBeLessThanOrEqual(widths.clientWidth);
  };

  await assertMobileLayout();

  await page.getByRole('button', { name: 'Registrieren' }).click();
  await expect(page.getByPlaceholder('Anzeigename')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Konto anlegen' })).toBeVisible();
  await assertMobileLayout();

  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.getByRole('button', { name: 'Passwort vergessen?' }).click();
  await expect(page.getByRole('button', { name: 'Reset-Link senden' })).toBeVisible();
  await assertMobileLayout();
});

test('asks for confirmation before deleting the account and lets the user cancel', async ({ page }) => {
  await mockSupabaseAuth(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();

  await page.getByPlaceholder('E-Mail').fill('alex@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret2');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();

  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await page.getByRole('button', { name: 'Account löschen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[role="dialog"]').getByText('Account löschen', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Bist du sicher?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ja, Account löschen' })).toBeVisible();

  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account löschen' })).toBeVisible();
});

test('lets a familyuser owner invite members but hides configuration controls', async ({ page }) => {
  await mockSupabaseAuth(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();

  await page.getByPlaceholder('E-Mail').fill('alex@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret2');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByText('Familie: Familie Test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen' }).click();

  await expect(page.getByRole('heading', { name: 'Familienmitglieder' })).toBeVisible();
  await expect(page.getByText('Familiengründer').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Familie fuer Einladung' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Einladung senden' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Einladung für open@example.com zurückziehen' })).toBeVisible();
  await page.getByRole('button', { name: 'Einladung für open@example.com zurückziehen' }).click();
  await expect(page.getByText('Einladung wurde zurückgezogen.')).toBeVisible();
  await expect(page.getByText('open@example.com')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Konfiguration' })).toHaveCount(0);
});

test('keeps family settings cards usable on mobile widths', async ({ page }) => {
  await mockSupabaseRegistrationControls(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await page.getByPlaceholder('E-Mail').fill('admin@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  const mobileModuleSwitch = page.getByRole('combobox', { name: 'Bereich wechseln' });
  const mobileTopbar = page.locator('.mobile-topbar');

  await expect(mobileModuleSwitch).toBeVisible();
  await expect(mobileTopbar).toBeVisible();

  const topbarStart = await mobileTopbar.boundingBox();

  expect(topbarStart).not.toBeNull();
  await mobileModuleSwitch.selectOption('family');

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));

  const topbarAfterScroll = await mobileTopbar.boundingBox();

  expect(topbarAfterScroll).not.toBeNull();
  expect(Math.abs((topbarAfterScroll?.y ?? 0) - (topbarStart?.y ?? 0))).toBeLessThanOrEqual(8);

  await expect(page.getByRole('heading', { name: 'Familienmitglieder' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alle Familien' })).toBeVisible();
  await expect(page.locator('.mobile-account-card .family-permission-note')).toBeHidden();

  const firstMemberCopy = page.locator('.role-layout .document-list').first().locator('li').first().locator('.family-entry-copy');
  const firstMemberBadges = page.locator('.role-layout .document-list').first().locator('li').first().locator('.family-status-badges');
  const familyButtons = page.locator('.family-directory-button');
  const openInvitesHeading = page.getByRole('heading', { name: 'Offene Einladungen' });
  const openInvitesChip = openInvitesHeading.locator('..').locator('.chip');
  const allFamiliesHeading = page.getByRole('heading', { name: 'Alle Familien' });
  const allFamiliesChip = allFamiliesHeading.locator('..').locator('.chip');

  const [memberCopyBox, memberBadgesBox, firstFamilyButtonBox, secondFamilyButtonBox, openInvitesHeadingBox, openInvitesChipBox, allFamiliesHeadingBox, allFamiliesChipBox, widths] = await Promise.all([
    firstMemberCopy.boundingBox(),
    firstMemberBadges.boundingBox(),
    familyButtons.nth(0).boundingBox(),
    familyButtons.nth(1).boundingBox(),
    openInvitesHeading.boundingBox(),
    openInvitesChip.boundingBox(),
    allFamiliesHeading.boundingBox(),
    allFamiliesChip.boundingBox(),
    page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
  ]);

  expect(memberCopyBox).not.toBeNull();
  expect(memberBadgesBox).not.toBeNull();
  expect(firstFamilyButtonBox).not.toBeNull();
  expect(secondFamilyButtonBox).not.toBeNull();
  expect(openInvitesHeadingBox).not.toBeNull();
  expect(openInvitesChipBox).not.toBeNull();
  expect(allFamiliesHeadingBox).not.toBeNull();
  expect(allFamiliesChipBox).not.toBeNull();

  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
  expect((memberBadgesBox as NonNullable<typeof memberBadgesBox>).y).toBeGreaterThan(
    (memberCopyBox as NonNullable<typeof memberCopyBox>).y + (memberCopyBox as NonNullable<typeof memberCopyBox>).height - 2,
  );
  expect((secondFamilyButtonBox as NonNullable<typeof secondFamilyButtonBox>).y).toBeGreaterThan(
    (firstFamilyButtonBox as NonNullable<typeof firstFamilyButtonBox>).y +
      (firstFamilyButtonBox as NonNullable<typeof firstFamilyButtonBox>).height - 2,
  );
  expect((firstFamilyButtonBox as NonNullable<typeof firstFamilyButtonBox>).width).toBeLessThan(widths.clientWidth * 0.7);
  expect((firstFamilyButtonBox as NonNullable<typeof firstFamilyButtonBox>).width).toBeGreaterThan(120);
  expect(Math.abs((openInvitesChipBox as NonNullable<typeof openInvitesChipBox>).y - (openInvitesHeadingBox as NonNullable<typeof openInvitesHeadingBox>).y)).toBeLessThanOrEqual(8);
  expect(Math.abs((allFamiliesChipBox as NonNullable<typeof allFamiliesChipBox>).y - (allFamiliesHeadingBox as NonNullable<typeof allFamiliesHeadingBox>).y)).toBeLessThanOrEqual(8);
});

test('lets admins switch registration to invite-only and back again', async ({ page }) => {
  const registrationState = await mockSupabaseRegistrationControls(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await page.getByPlaceholder('E-Mail').fill('admin@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByText('Familie: Familie Test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen' }).click();

  await expect(page.getByRole('heading', { name: 'Alle Familien' })).toBeVisible();
  await page.getByRole('button', { name: /Familie Abendrot/i }).click();
  await expect(page.getByText('lea@example.com')).toBeVisible();
  await page.getByRole('combobox', { name: 'Familie fuer Einladung' }).selectOption('family-2');
  await expect(page.getByRole('combobox', { name: 'Familie fuer Einladung' })).toHaveValue('family-2');
  await page.getByPlaceholder('E-Mail').fill('branch@example.com');
  await page.getByRole('combobox', { name: 'Rolle fuer Einladung' }).selectOption('familyuser');
  await page.getByRole('button', { name: 'Einladung senden' }).click();
  await expect.poll(() => registrationState.lastCreatedInvite?.family_id ?? null).toBe('family-2');
  await expect(page.getByText('branch@example.com')).toHaveCount(0);

  const registrationToggle = page.getByRole('checkbox', { name: 'Freie Registrierung erlauben' });

  await expect(registrationToggle).toBeChecked();
  await registrationToggle.click();
  await expect(registrationToggle).not.toBeChecked();
  await expect(page.getByText('Freie Registrierung wurde deaktiviert.')).toBeVisible();
  await expect(page.getByText('Neue Nutzer koennen sich aktuell nur per Einladung registrieren.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();

  await page.getByRole('button', { name: 'Registrieren' }).click();
  await expect(
    page.getByText('Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Neue Konten sind nur per Einladung moeglich.'),
  ).toBeVisible();
  await page.getByPlaceholder('Anzeigename').fill('Outsider');
  await page.getByPlaceholder('E-Mail').fill('outsider@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();

  await expect(
    page.getByText('Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Bitte lass dir eine Einladung schicken.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.getByPlaceholder('E-Mail').fill('admin@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByText('Familie: Familie Test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await registrationToggle.click();
  await expect(registrationToggle).toBeChecked();
  await expect(page.getByText('Freie Registrierung wurde aktiviert.')).toBeVisible();
  await expect(page.getByText('Neue Nutzer koennen sich aktuell auch ohne Einladung registrieren.')).toBeVisible();

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();

  await page.getByRole('button', { name: 'Registrieren' }).click();
  await page.getByPlaceholder('Anzeigename').fill('Outsider');
  await page.getByPlaceholder('E-Mail').fill('outsider@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Konto anlegen' }).click();

  await expect(
    page.getByText('Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.'),
  ).toBeVisible();
});

test('lets admins delete members and whole families from the all-families card', async ({ page }) => {
  await mockSupabaseRegistrationControls(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' })).toBeVisible();
  await page.getByPlaceholder('E-Mail').fill('admin@example.com');
  await page.getByPlaceholder('Passwort').fill('supersecret');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  await expect(page.getByText('Familie: Familie Test', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Einstellungen' }).click();

  await page.getByRole('button', { name: /Familie Abendrot/i }).click();
  await expect(page.getByText('tom.abendrot@example.com')).toBeVisible();

  await page.getByRole('button', { name: 'Mitglied tom.abendrot@example.com aus Familie Abendrot löschen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Tom Abendrot wird aus Familie Abendrot entfernt/i)).toBeVisible();
  await page.getByRole('button', { name: 'Mitglied endgültig löschen' }).click();

  await expect(page.getByText('Tom Abendrot wurde inklusive Konto gelöscht.')).toBeVisible();
  await expect(page.getByText('tom.abendrot@example.com')).toHaveCount(0);

  await page.getByRole('button', { name: /Familie Abendrot/i }).click();
  await page.getByRole('button', { name: 'Familie Familie Abendrot löschen' }).click();
  await expect(page.getByText(/Familie Abendrot mit 1 Mitgliedern/i)).toBeVisible();
  await page.getByRole('button', { name: 'Familie endgültig löschen' }).click();

  await expect(page.getByText('Die Familie Familie Abendrot wurde gelöscht.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Familie Abendrot/i })).toHaveCount(0);
});