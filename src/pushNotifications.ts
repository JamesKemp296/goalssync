import { supabase } from './supabase'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''

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
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
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

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.ready
  return registration
}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!isPushSupported()) throw new Error('Push notifications are not supported')
  if (!isVapidConfigured()) {
    throw new Error('Push notifications are not configured on this server')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
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

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: true })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
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

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ push_enabled: false })
    .eq('id', userId)
  if (profileError) throw new Error(profileError.message)
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

export async function fetchPushEnabled(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase
    .from('profiles')
    .select('push_enabled')
    .eq('id', userId)
    .maybeSingle()
  return Boolean((data as { push_enabled?: boolean } | null)?.push_enabled)
}
