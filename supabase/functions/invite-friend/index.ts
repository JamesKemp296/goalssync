// Supabase Edge Function: invite-friend
// Deploy with:
//   supabase functions deploy invite-friend --no-verify-jwt=false
// Required secrets (configure once via Supabase dashboard or CLI):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//   - SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   - APP_URL (for example: https://www.goalssync.com)
// Body: { email: string, redirectTo?: string }

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json(401, { error: 'Missing authorization' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) {
    return json(500, { error: 'Edge function is missing required secrets' })
  }

  // Verify the requester
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json(401, { error: 'Unauthorized' })
  const me = userData.user

  let body: { email?: unknown; redirectTo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }
  const rawEmail = typeof body.email === 'string' ? body.email : ''
  const email = rawEmail.trim().toLowerCase()
  const configuredAppUrl =
    Deno.env.get('APP_URL')?.trim().replace(/\/$/, '') ?? ''
  const fallbackRedirectTo = configuredAppUrl
    ? `${configuredAppUrl}/reset-password`
    : undefined
  const redirectTo =
    typeof body.redirectTo === 'string' && body.redirectTo.trim().length > 0
      ? body.redirectTo
      : fallbackRedirectTo

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Valid email required' })
  }
  if (me.email && me.email.toLowerCase() === email) {
    return json(400, { error: "You can't add yourself" })
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Already a registered user? Just become friends, no email needed.
  const { data: existing, error: existingErr } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingErr) {
    return json(500, { error: existingErr.message })
  }

  if (existing?.id) {
    if (existing.id === me.id) {
      return json(400, { error: "You can't add yourself" })
    }
    const [a, b] =
      me.id < existing.id ? [me.id, existing.id] : [existing.id, me.id]
    const { error: friendErr } = await admin
      .from('friendships')
      .upsert(
        { user_a_id: a, user_b_id: b },
        { onConflict: 'user_a_id,user_b_id' },
      )
    if (friendErr) return json(500, { error: friendErr.message })
    return json(200, { status: 'friended' })
  }

  // Record invite (RLS bypassed via service role; trigger will pick this up at signup)
  const { error: inviteRecordErr } = await admin
    .from('invites')
    .upsert({ email, invited_by: me.id }, { onConflict: 'email,invited_by' })
  if (inviteRecordErr) return json(500, { error: inviteRecordErr.message })

  // Send Supabase invite email
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  )

  if (inviteErr) {
    // Common case: user was previously invited and Supabase rejects re-invite.
    return json(400, { error: inviteErr.message })
  }

  return json(200, { status: 'invited' })
})
