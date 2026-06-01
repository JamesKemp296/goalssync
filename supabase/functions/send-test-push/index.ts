// Supabase Edge Function: send-test-push
// Deploy: npm run deploy:function:send-test-push
// Developer-only: sends an immediate push to the caller's subscriptions.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import {
  buildWeeklyRecapMessage,
  pushIconUrl,
  type WeeklyRecapRow,
} from '../_shared/weeklyRecapMessage.ts'

const DEVELOPER_EMAIL = 'jamesdanielkemp@gmail.com'

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

type HistoryRow = {
  completed_count: number
  total_count: number
  completed_all: boolean
  period_end: string
  lists: { title: string } | { title: string }[] | null
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
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const appUrl =
    Deno.env.get('APP_URL')?.trim().replace(/\/$/, '') ??
    'https://www.goalssync.com'

  if (!url || !anonKey || !serviceKey) {
    return json(500, { error: 'Missing Supabase configuration' })
  }
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json(500, { error: 'Missing VAPID configuration' })
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json(401, { error: 'Unauthorized' })

  const email = userData.user.email?.toLowerCase() ?? ''
  if (email !== DEVELOPER_EMAIL) return json(403, { error: 'Forbidden' })

  const userId = userData.user.id
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await admin
    .from('profiles')
    .select('first_name, email')
    .eq('id', userId)
    .maybeSingle()

  const { data: subs, error: subsErr } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (subsErr) return json(500, { error: subsErr.message })
  if (!subs?.length) {
    return json(400, {
      error: 'No push subscription. Enable weekly recap notifications first.',
    })
  }

  const { data: latestPeriod } = await admin
    .from('list_period_history')
    .select('period_end')
    .eq('user_id', userId)
    .eq('time_frame', 'weekly')
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  let message = {
    title: 'Test push',
    body: 'Goals Sync notifications are working.',
  }

  if (latestPeriod?.period_end) {
    const { data: historyRows } = await admin
      .from('list_period_history')
      .select(
        'completed_count, total_count, completed_all, period_end, lists(title)',
      )
      .eq('user_id', userId)
      .eq('time_frame', 'weekly')
      .eq('period_end', latestPeriod.period_end)

    const recapRows: WeeklyRecapRow[] = ((historyRows ?? []) as HistoryRow[]).map(
      (row) => {
        const list = Array.isArray(row.lists) ? row.lists[0] : row.lists
        return {
          listTitle: list?.title ?? 'Weekly list',
          completed_count: row.completed_count,
          total_count: row.total_count,
          completed_all: row.completed_all,
        }
      },
    )

    const recap = buildWeeklyRecapMessage(recapRows)
    if (recap) message = recap
  }

  const firstName =
    typeof profile?.first_name === 'string' ? profile.first_name : null
  const profileEmail = profile?.email ?? email
  const icon = pushIconUrl(appUrl, firstName, profileEmail)
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon,
    url: '/home',
  })

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  let delivered = 0
  let errors = 0

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      )
      delivered += 1
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? Number((err as { statusCode: number }).statusCode)
          : 0
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        errors += 1
      }
    }
  }

  if (delivered === 0) {
    return json(500, { error: 'Push delivery failed', errors })
  }

  return json(200, {
    delivered,
    errors,
    title: message.title,
    body: message.body,
  })
})
