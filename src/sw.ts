/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: { title?: string; body?: string; icon?: string; url?: string }
  try {
    payload = event.data.json() as typeof payload
  } catch {
    payload = { title: 'Goals Sync', body: event.data.text() }
  }
  const title = payload.title ?? 'Goals Sync'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: payload.icon,
    badge: payload.icon,
    data: { url: payload.url ?? '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
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
