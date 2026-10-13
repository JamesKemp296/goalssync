import { supabase } from './supabase'
import {
  waitForServiceWorkerRegistration,
  withTimeout,
} from './serviceWorkerRegistration'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''

const PERMISSION_SLOW_MS = 5_000
const PERMISSION_GIVE_UP_MS = 20_000
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

export type DevicePlatform = 'android' | 'ios' | 'other'

export function getDevicePlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  // iPadOS reports itself as a Mac but has touch support.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  return 'other'
}

export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Where to go to turn notifications back on, in plain words for this device. */
export function notificationSettingsHint(): string {
  const platform = getDevicePlatform()
  if (platform === 'android') {
    return isInstalledApp()
      ? 'Open your phone’s Settings → Apps → Goals Sync → Notifications and turn them on.'
      : 'In Chrome, tap ⋮ → Settings → Site settings → Notifications and allow this site.'
  }
  if (platform === 'ios') {
    return 'Open your iPhone’s Settings → Notifications → Goals Sync and turn on Allow Notifications.'
  }
  return 'Allow notifications for this site in your browser settings.'
}

export type PushPermissionErrorReason = 'unsupported' | 'blocked' | 'no-answer'

export class PushPermissionError extends Error {
  readonly reason: PushPermissionErrorReason

  constructor(reason: PushPermissionErrorReason, message: string) {
    super(message)
    this.name = 'PushPermissionError'
    this.reason = reason
  }
}

export function unsupportedMessage(): string {
  if (getDevicePlatform() === 'ios' && !isInstalledApp()) {
    return 'On iPhone, add Goals Sync to your Home Screen first, then turn notifications on from there.'
  }
  return 'This browser can’t show notifications.'
}

/**
 * Chrome on Android sometimes never shows the permission popup (its "quieter
 * notifications" mode, or inside an installed app) and leaves
 * Notification.requestPermission() pending forever. Polling
 * Notification.permission covers the user allowing via the quiet UI or
 * system settings instead.
 */
function waitForPermissionAnswer(
  onSlow: (() => void) | undefined,
): Promise<NotificationPermission | 'no-answer'> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: NotificationPermission | 'no-answer') => {
      if (settled) return
      settled = true
      window.clearTimeout(slowId)
      window.clearTimeout(giveUpId)
      window.clearInterval(pollId)
      resolve(value)
    }

    const slowId = window.setTimeout(() => onSlow?.(), PERMISSION_SLOW_MS)
    const giveUpId = window.setTimeout(() => finish('no-answer'), PERMISSION_GIVE_UP_MS)
    const pollId = window.setInterval(() => {
      if (Notification.permission !== 'default') finish(Notification.permission)
    }, 500)

    try {
      const request = Notification.requestPermission()
      // Very old implementations return undefined and only use a callback.
      if (request && typeof request.then === 'function') {
        void request.then(finish, () => finish(Notification.permission))
      }
    } catch {
      finish(Notification.permission)
    }
  })
}

/** Call from a click/tap handler, before any other awaits. */
export async function requestPushPermission(options?: {
  onSlow?: () => void
}): Promise<void> {
  if (!isPushSupported()) {
    throw new PushPermissionError('unsupported', unsupportedMessage())
  }
  if (Notification.permission === 'granted') return
  if (Notification.permission === 'denied') {
    throw new PushPermissionError(
      'blocked',
      `Notifications are turned off for Goals Sync. ${notificationSettingsHint()}`,
    )
  }

  const answer = await waitForPermissionAnswer(options?.onSlow)

  if (answer === 'granted') return
  if (answer === 'denied') {
    throw new PushPermissionError(
      'blocked',
      `Notifications are turned off for Goals Sync. ${notificationSettingsHint()}`,
    )
  }
  throw new PushPermissionError(
    'no-answer',
    `Your phone didn’t show the permission popup. ${notificationSettingsHint()} We’ll finish setting this up when you come back.`,
  )
}

function formatSubscribeError(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.'
  const name = error.name
  if (name === 'NotAllowedError') {
    return `Your phone blocked notifications. ${notificationSettingsHint()}`
  }
  if (name === 'AbortError') {
    return 'That didn’t go through. Please try again.'
  }
  if (name === 'InvalidStateError') {
    return 'The app is still getting ready. Close it fully, open it again, and try once more.'
  }
  return error.message || 'Something went wrong. Please try again.'
}

export async function ensurePushSubscription(userId: string): Promise<void> {
  if (!supabase) throw new Error('Notifications aren’t available right now.')
  if (!isPushSupported()) throw new Error(unsupportedMessage())
  if (!isVapidConfigured()) {
    throw new Error('Notifications aren’t available right now.')
  }
  if (Notification.permission !== 'granted') {
    throw new Error(`Notifications aren’t allowed yet. ${notificationSettingsHint()}`)
  }

  const registration = await withTimeout(
    waitForServiceWorkerRegistration(),
    SUBSCRIBE_TIMEOUT_MS,
    'The app is still getting ready. Close it fully, open it again, and try once more.',
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
        'That took too long. Check your connection and try again.',
      )
    } catch (error) {
      throw new Error(formatSubscribeError(error))
    }
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Something went wrong setting up notifications. Please try again.')
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

export type PushSendResult = {
  id: string
  device: string
  success: boolean
  statusCode: number | null
  error: string | null
}

export async function sendTestPush(type: TestPushType): Promise<{
  delivered: number
  title: string
  body: string
  /** Per-device outcome. Includes devices that failed even when others succeeded. */
  results: PushSendResult[]
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
    results?: PushSendResult[]
  } | null

  if (result?.error) throw new Error(result.error)
  if (!result?.delivered) {
    throw new Error('Push delivery failed')
  }

  return {
    delivered: result.delivered,
    title: result.title ?? 'Test push',
    body: result.body ?? '',
    results: result.results ?? [],
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
