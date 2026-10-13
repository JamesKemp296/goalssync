import webpush from 'npm:web-push@3'

export type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string | null
}

export type PushSendResult = {
  id: string
  device: string
  success: boolean
  statusCode: number | null
  error: string | null
}

/** Best-effort device label parsed from a stored User-Agent string. */
export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent ?? ''
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/macintosh/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows'
  return 'Unknown device'
}

function extractErrorDetail(err: unknown): { statusCode: number | null; message: string } {
  if (err && typeof err === 'object') {
    const withDetails = err as { statusCode?: number; body?: string; message?: string }
    const statusCode =
      typeof withDetails.statusCode === 'number' ? withDetails.statusCode : null
    const bodySnippet =
      typeof withDetails.body === 'string' && withDetails.body.trim().length > 0
        ? withDetails.body.trim().slice(0, 300)
        : null
    const message = bodySnippet ?? withDetails.message ?? 'Push send failed'
    return { statusCode, message: statusCode ? `${statusCode}: ${message}` : message }
  }
  return { statusCode: null, message: 'Push send failed' }
}

/**
 * Sends a push payload to every subscription, recording a per-subscription
 * success/failure result. Stale subscriptions (404/410) are deleted; other
 * failures are persisted on the row via last_error / last_error_at so they
 * are visible even outside of a manual test push (e.g. cron sends where the
 * caller only checks "did anything get delivered").
 */
export async function sendPushToSubscriptions(
  // deno-lint-ignore no-explicit-any
  admin: any,
  subs: PushSubscriptionRow[],
  payload: string,
): Promise<{ delivered: number; results: PushSendResult[] }> {
  const results: PushSendResult[] = []
  let delivered = 0

  for (const sub of subs) {
    const device = deviceLabelFromUserAgent(sub.user_agent)
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      )
      delivered += 1
      results.push({ id: sub.id, device, success: true, statusCode: null, error: null })
      await admin
        .from('push_subscriptions')
        .update({ last_error: null, last_error_at: null, last_success_at: new Date().toISOString() })
        .eq('id', sub.id)
    } catch (err: unknown) {
      const { statusCode, message } = extractErrorDetail(err)
      results.push({ id: sub.id, device, success: false, statusCode, error: message })

      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        await admin
          .from('push_subscriptions')
          .update({ last_error: message, last_error_at: new Date().toISOString() })
          .eq('id', sub.id)
      }
    }
  }

  return { delivered, results }
}
