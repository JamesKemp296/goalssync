/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// `vibrate` is supported by Chrome/Android but missing from lib.dom's
// NotificationOptions typings.
type AndroidNotificationOptions = NotificationOptions & { vibrate?: number[] }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// On Android, users rarely fully close Chrome, so a previously-installed SW
// can keep running (and keep whatever push bug it shipped with) for days.
// Take over immediately so fixes actually apply on the next push.
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload: { title?: string; body?: string; icon?: string; url?: string } = {}
      try {
        if (event.data) {
          try {
            payload = event.data.json() as typeof payload
          } catch {
            payload = { title: 'Goals Sync', body: event.data.text() }
          }
        }
        const title = payload.title ?? 'Goals Sync'
        const options: AndroidNotificationOptions = {
          body: payload.body ?? '',
          icon: payload.icon ?? '/icons/ace.png',
          badge: payload.icon ?? '/icons/ace.png',
          // Android ignores `icon`/`badge` fetch failures silently but ignores
          // the whole notification if `vibrate` isn't a plain number array.
          vibrate: [100, 50, 100],
          data: { url: payload.url ?? '/home' },
        }
        await self.registration.showNotification(title, options)
      } catch (err) {
        // Without this, a throw here (e.g. bad payload) means the push is
        // silently dropped with nothing shown and nothing logged anywhere
        // the developer can see.
        console.error('[sw] push handling failed', err)
        await self.registration.showNotification('Goals Sync', {
          body: 'You have a new notification.',
        })
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath =
    typeof event.notification.data?.url === 'string'
      ? event.notification.data.url
      : '/home'
  const targetUrl = new URL(targetPath, self.location.origin).href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      }),
  )
})

export {}
