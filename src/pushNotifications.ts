import { supabase } from './supabase'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''

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
  // PushManager lives on ServiceWorkerRegistration in some Android PWAs.
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

const SERVICE_WORKER_TIMEOUT_MS = 15_000

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing?.active) return existing

  const ready = navigator.serviceWorker.ready
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          'Service worker is not ready. Close the app completely and open it again, then retry.',
        ),
      )
    }, SERVICE_WORKER_TIMEOUT_MS)
  })

  return Promise.race([ready, timeout])
}

/** Call synchronously from a click/tap handler before other async work (required on Android). */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked in browser settings')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted')
  }
  return permission
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

  const registration = await getServiceWorkerRegistration()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })
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
    const registration = await getServiceWorkerRegistration()
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

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: enabled })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)

  if (enabled) {
    await ensurePushSubscription(userId)
    return
  }

  if (!(await hasAnyNotificationEnabled(userId))) {
    await releasePushSubscription(userId)
  }
}

export async function setDailyReminderEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ daily_reminder_enabled: enabled })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)

  if (enabled) {
    await ensurePushSubscription(userId)
    return
  }

  if (!(await hasAnyNotificationEnabled(userId))) {
    await releasePushSubscription(userId)
  }
}

export async function sendTestPush(): Promise<{
  delivered: number
  title: string
  body: string
}> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.functions.invoke('send-test-push', {
    method: 'POST',
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
  const { data } = await supabase
    .from('profiles')
    .select('push_enabled, daily_reminder_enabled')
    .eq('id', userId)
    .maybeSingle()
  const row = data as {
    push_enabled?: boolean
    daily_reminder_enabled?: boolean
  } | null
  return {
    weeklyRecap: Boolean(row?.push_enabled),
    dailyReminder: Boolean(row?.daily_reminder_enabled),
  }
}
