const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FamilyInviteRow = {
  id: string;
  email: string;
  role: 'admin' | 'familyuser';
  family_id: string;
  created_at: string;
  invited_by_user_id: string;
};

type FamilyRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  display_name: string;
  email: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInviteEmail(params: {
  familyName: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'admin' | 'familyuser';
  appUrl: string;
}) {
  const roleLabel = params.role === 'admin' ? 'Administrator' : 'Familienmitglied';
  const safeFamilyName = escapeHtml(params.familyName);
  const safeInviterName = escapeHtml(params.inviterName);
  const safeInviteeEmail = escapeHtml(params.inviteeEmail);
  const safeRoleLabel = escapeHtml(roleLabel);
  const safeAppUrl = escapeHtml(params.appUrl);

  const subject = `${params.familyName}: Einladung zu Frey Frey`;
  const text = [
    `Hallo,`,
    ``,
    `${params.inviterName} hat dich zur Familie "${params.familyName}" in Frey Frey eingeladen.`,
    `Deine Rolle: ${roleLabel}.`,
    ``,
    `Öffne die App unter ${params.appUrl} und registriere dich oder melde dich mit ${params.inviteeEmail} an.`,
    `Die Einladung wird dann automatisch übernommen.`,
    ``,
    `Falls du bereits ein Konto mit dieser E-Mail-Adresse hast, reicht ein normaler Login.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">Einladung zu Frey Frey</h2>
      <p>Hallo,</p>
      <p><strong>${safeInviterName}</strong> hat dich zur Familie <strong>${safeFamilyName}</strong> eingeladen.</p>
      <p>Deine Rolle: <strong>${safeRoleLabel}</strong>.</p>
      <p>
        Öffne die App unter
        <a href="${safeAppUrl}" style="color: #0f766e;">${safeAppUrl}</a>
        und registriere dich oder melde dich mit <strong>${safeInviteeEmail}</strong> an.
      </p>
      <p>Die Einladung wird dann automatisch übernommen.</p>
      <p style="font-size: 14px; color: #6b7280;">Falls du bereits ein Konto mit dieser E-Mail-Adresse hast, reicht ein normaler Login.</p>
    </div>
  `;

  return { subject, text, html };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FAMILY_INVITE_FROM_EMAIL');

  if (!authorization || !supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Supabase function configuration is incomplete.' });
  }

  if (!resendApiKey || !fromEmail) {
    return jsonResponse(500, {
      error: 'Invite email secrets are missing. Configure RESEND_API_KEY and FAMILY_INVITE_FROM_EMAIL.',
    });
  }

  const payload = await request.json().catch(() => null) as
    | { inviteId?: string; appUrl?: string }
    | null;

  const inviteId = String(payload?.inviteId || '').trim();
  const requestedAppUrl = String(payload?.appUrl || '').trim();

  if (!inviteId) {
    return jsonResponse(400, { error: 'inviteId is required.' });
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { error: 'Unauthorized.' });
  }

  const { data: invite, error: inviteError } = await supabase
    .from('family_invites')
    .select('id, email, role, family_id, created_at, invited_by_user_id')
    .eq('id', inviteId)
    .is('accepted_at', null)
    .single();

  if (inviteError || !invite) {
    return jsonResponse(404, { error: 'Invitation could not be loaded.' });
  }

  if (invite.invited_by_user_id !== user.id) {
    return jsonResponse(403, { error: 'Only the inviter can trigger the invite email.' });
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, name')
    .eq('id', invite.family_id)
    .single();

  if (familyError || !family) {
    return jsonResponse(404, { error: 'Family for invitation was not found.' });
  }

  const { data: inviterProfile, error: inviterError } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single();

  if (inviterError || !inviterProfile) {
    return jsonResponse(404, { error: 'Inviter profile could not be loaded.' });
  }

  const configuredAppUrl = Deno.env.get('INVITE_APP_URL');
  const appUrl = (configuredAppUrl && configuredAppUrl.trim()) || requestedAppUrl;

  if (!appUrl) {
    return jsonResponse(500, {
      error: 'No invitation target URL configured. Set INVITE_APP_URL or send appUrl from the client.',
    });
  }

  const emailContent = buildInviteEmail({
    familyName: (family as FamilyRow).name,
    inviterName: (inviterProfile as ProfileRow).display_name || (inviterProfile as ProfileRow).email,
    inviteeEmail: invite.email,
    role: invite.role,
    appUrl,
  });

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [invite.email],
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      reply_to: (inviterProfile as ProfileRow).email || undefined,
    }),
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.text();

    return jsonResponse(502, {
      error: 'Invite email could not be sent.',
      details: resendError,
    });
  }

  const resendBody = await resendResponse.json().catch(() => null) as { id?: string } | null;

  return jsonResponse(200, {
    success: true,
    messageId: resendBody?.id ?? null,
  });
});