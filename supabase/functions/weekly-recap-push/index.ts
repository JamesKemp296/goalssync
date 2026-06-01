// Supabase Edge Function: weekly-recap-push
// Deploy: npm run deploy:function:weekly-recap-push
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
//           VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_URL

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import {
  buildWeeklyRecapMessage,
  pushIconUrl,
  type WeeklyRecapRow,
} from '../_shared/weeklyRecapMessage.ts'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const NOTIFICATION_TYPE = 'weekly_recap'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

function isAuthorized(req: Request, cronSecret: string | null): boolean {
  if (!cronSecret) return false
  return req.headers.get('x-cron-secret') === cronSecret
}

function localMondayPeriodKey(timezone: string, now = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

function isMondaySevenAmWindow(timezone: string, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '-1')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '-1')

  return weekday === 'Mon' && hour === 7 && minute >= 0 && minute < 15
}

type EligibleUser = {
  id: string
  email: string
  first_name: string | null
  timezone: string
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

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const cronSecret = Deno.env.get('CRON_SECRET')
  const appUrl =
    Deno.env.get('APP_URL')?.trim().replace(/\/$/, '') ??
    'https://www.goalssync.com'

  if (!url || !serviceKey) {
    return json(500, { error: 'Missing Supabase configuration' })
  }
  if (!isAuthorized(req, cronSecret ?? null)) {
    return json(401, { error: 'Unauthorized' })
  }
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json(500, { error: 'Missing VAPID configuration' })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date()
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString()

  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id, email, first_name, timezone, push_enabled')
    .eq('push_enabled', true)

  if (profilesErr) return json(500, { error: profilesErr.message })

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const profile of (profiles ?? []) as (EligibleUser & {
    push_enabled: boolean
  })[]) {
    const timezone = profile.timezone || 'UTC'
    if (!isMondaySevenAmWindow(timezone, now)) {
      skipped += 1
      continue
    }

    const periodKey = localMondayPeriodKey(timezone, now)

    const { data: existingLog } = await admin
      .from('notification_log')
      .select('id')
      .eq('user_id', profile.id)
      .eq('notification_type', NOTIFICATION_TYPE)
      .eq('period_key', periodKey)
      .maybeSingle()

    if (existingLog) {
      skipped += 1
      continue
    }

    const { data: weeklyLists } = await admin
      .from('lists')
      .select('id')
      .eq('user_id', profile.id)
      .eq('time_frame', 'weekly')
      .limit(1)

    if (!weeklyLists?.length) {
      skipped += 1
      continue
    }

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', profile.id)

    if (!subs?.length) {
      skipped += 1
      continue
    }

    const { data: historyRows, error: historyErr } = await admin
      .from('list_period_history')
      .select(
        'completed_count, total_count, completed_all, period_end, lists(title)',
      )
      .eq('user_id', profile.id)
      .eq('time_frame', 'weekly')
      .gte('period_end', eightHoursAgo)
      .lte('period_end', now.toISOString())

    if (historyErr) {
      errors += 1
      continue
    }

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

    const message = buildWeeklyRecapMessage(recapRows)
    if (!message) {
      skipped += 1
      continue
    }

    const icon = pushIconUrl(appUrl, profile.first_name, profile.email)
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      icon,
      url: '/home',
    })

    let delivered = false

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        )
        delivered = true
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

    if (!delivered) {
      skipped += 1
      continue
    }

    const { error: logErr } = await admin.from('notification_log').insert({
      user_id: profile.id,
      notification_type: NOTIFICATION_TYPE,
      period_key: periodKey,
    })

    if (logErr) {
      errors += 1
      continue
    }

    sent += 1
  }

  return json(200, { sent, skipped, errors })
})
