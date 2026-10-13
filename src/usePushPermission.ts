import { useEffect, useState } from 'react'
import { getPushPermission, type PushPermissionState } from './pushNotifications'

/**
 * Notification.permission isn't reactive, and users often change it in
 * system settings while the app is in the background.
 */
export function usePushPermission(): PushPermissionState {
  const [permission, setPermission] = useState<PushPermissionState>(getPushPermission)

  useEffect(() => {
    const refresh = () => setPermission(getPushPermission())
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', refresh)

    let status: PermissionStatus | null = null
    let cancelled = false
    void navigator.permissions
      ?.query({ name: 'notifications' })
      .then((result) => {
        if (cancelled) return
        status = result
        status.addEventListener('change', refresh)
      })
      .catch(() => {})

    // Catches changes made through Chrome's quiet prompt while the page stays visible.
    const pollId = window.setInterval(refresh, 2_000)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', refresh)
      status?.removeEventListener('change', refresh)
      window.clearInterval(pollId)
    }
  }, [])

  return permission
}
