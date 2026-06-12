import { supabase } from './supabase'
import {
  waitForServiceWorkerRegistration,
  withTimeout,
} from './serviceWorkerRegistration'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''

const PERMISSION_TIMEOUT_MS = 60_000
const SUBSCRIBE_TIMEOUT_MS = 30_000

export type NotificationPrefs = {
  weeklyRecap: boolean
  dailyReminder: boolean
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false
  return (
    'PushManager' in window ||
    'pushManager' in ServiceWorkerRegistration.prototype
  )
}

export function isVapidConfigured(): boolean {
  return vapidPublicKey.length > 0
}

export type PushPermissionState = NotificationPermission | 'unsupported'

export function getPushPermission(): PushPermissionState {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** Call as the first await from a click/tap handler (required on Android). */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') {
    throw new Error(
      'Notifications are blocked. Enable them for this app in Android Settings.',
    )
  }

  const permission = await withTimeout(
    Notification.requestPermission(),
    PERMISSION_TIMEOUT_MS,
    'Permission request timed out. Try again and allow notifications when prompted.',
  )

  if (permission === 'denied') {
    throw new Error(
      'Notifications were blocked. Enable them for this app in Android Settings.',
    )
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted')
  }
  return permission
}

function formatSubscribeError(error: unknown): string {
  if (!(error instanceof Error)) return 'Push subscription failed'
  const name = error.name
  if (name === 'NotAllowedError') {
    return 'Push subscription was blocked. Check notification permissions.'
  }
  if (name === 'AbortError') {
    return 'Push subscription was cancelled. Try again.'
  }
  if (name === 'InvalidStateError') {
    return 'Service worker is not active. Close the app from recents and reopen it.'
  }
  return error.message || 'Push subscription failed'
}

export async function ensurePushSubscription(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!isPushSupported()) throw new Error('Push notifications are not supported')
  if (!isVapidConfigured()) {
    throw new Error('Push notifications are not configured on this server')
  }
  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission was not granted')
  }

  const registration = await withTimeout(
    waitForServiceWorkerRegistration(),
    SUBSCRIBE_TIMEOUT_MS,
    'Service worker is not ready. Close the app from recents and reopen it.',
  )

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        }),
        SUBSCRIBE_TIMEOUT_MS,
        'Push subscription timed out. Check your connection and try again.',
      )
    } catch (error) {
      throw new Error(formatSubscribeError(error))
    }
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid push subscription')
  }

  const { error: subError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'user_id,endpoint' },
  )
  if (subError) throw new Error(subError.message)
}

async function releasePushSubscription(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  if (isPushSupported()) {
    try {
      const registration = await waitForServiceWorkerRegistration()
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
      } else {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      }
    } catch {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  }
}

async function hasAnyNotificationEnabled(userId: string): Promise<boolean> {
  const prefs = await fetchNotificationPrefs(userId)
  return prefs.weeklyRecap || prefs.dailyReminder
}

export async function setWeeklyRecapEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  if (enabled) {
    await ensurePushSubscription(userId)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: enabled })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)

  if (!enabled && !(await hasAnyNotificationEnabled(userId))) {
    await releasePushSubscription(userId)
  }
}

export async function setDailyReminderEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  if (enabled) {
    await ensurePushSubscription(userId)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ daily_reminder_enabled: enabled })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)

  if (!enabled && !(await hasAnyNotificationEnabled(userId))) {
    await releasePushSubscription(userId)
  }
}

export type TestPushType = 'weekly_recap' | 'daily_reminder'

export async function sendTestPush(type: TestPushType): Promise<{
  delivered: number
  title: string
  body: string
}> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.functions.invoke('send-test-push', {
    method: 'POST',
    body: { type },
  })

  if (error) {
    const ctx = error as { context?: Response }
    if (ctx.context) {
      try {
        const payload = (await ctx.context.json()) as { error?: string }
        if (payload.error) throw new Error(payload.error)
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== error.message) {
          throw parseErr
        }
      }
    }
    throw new Error(error.message)
  }

  const result = data as {
    delivered?: number
    title?: string
    body?: string
    error?: string
  } | null

  if (result?.error) throw new Error(result.error)
  if (!result?.delivered) {
    throw new Error('Push delivery failed')
  }

  return {
    delivered: result.delivered,
    title: result.title ?? 'Test push',
    body: result.body ?? '',
  }
}

export async function fetchNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  if (!supabase) return { weeklyRecap: false, dailyReminder: false }
  const { data, error } = await supabase
    .from('profiles')
    .select('push_enabled, daily_reminder_enabled')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const row = data as {
    push_enabled?: boolean
    daily_reminder_enabled?: boolean
  } | null
  return {
    weeklyRecap: Boolean(row?.push_enabled),
    dailyReminder: Boolean(row?.daily_reminder_enabled),
  }
}
