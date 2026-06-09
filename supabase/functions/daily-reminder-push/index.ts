// Supabase Edge Function: daily-reminder-push
// Deploy: npm run deploy:function:daily-reminder-push
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
//           VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_URL, CRON_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import {
  buildDailyReminderMessage,
  type DailyReminderRow,
} from '../_shared/dailyReminderMessage.ts'
import { pushIconUrl } from '../_shared/weeklyRecapMessage.ts'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const NOTIFICATION_TYPE = 'daily_reminder'

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

function localDatePeriodKey(timezone: string, now = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

function isTenPmWindow(timezone: string, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '-1')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '-1')

  return hour === 22 && minute >= 0 && minute < 15
}

type EligibleUser = {
  id: string
  email: string
  first_name: string | null
  timezone: string
  daily_reminder_enabled: boolean
}

type DailyListRow = {
  id: number
  title: string
  todos: { is_complete: boolean }[] | null
}

function toReminderRows(lists: DailyListRow[]): DailyReminderRow[] {
  return lists
    .map((list) => {
      const todos = list.todos ?? []
      const total_count = todos.length
      const completed_count = todos.filter((t) => t.is_complete).length
      return {
        listTitle: list.title?.trim() || 'Daily list',
        completed_count,
        total_count,
      }
    })
    .filter((row) => row.total_count > 0 && row.completed_count < row.total_count)
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

  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id, email, first_name, timezone, daily_reminder_enabled')
    .eq('daily_reminder_enabled', true)

  if (profilesErr) return json(500, { error: profilesErr.message })

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const profile of (profiles ?? []) as EligibleUser[]) {
    const timezone = profile.timezone || 'UTC'
    if (!isTenPmWindow(timezone, now)) {
      skipped += 1
      continue
    }

    const periodKey = localDatePeriodKey(timezone, now)

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

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', profile.id)

    if (!subs?.length) {
      skipped += 1
      continue
    }

    const { data: dailyLists, error: listsErr } = await admin
      .from('lists')
      .select('id, title, todos(is_complete)')
      .eq('user_id', profile.id)
      .eq('time_frame', 'daily')

    if (listsErr) {
      errors += 1
      continue
    }

    const reminderRows = toReminderRows((dailyLists ?? []) as DailyListRow[])
    const message = buildDailyReminderMessage(reminderRows)
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
