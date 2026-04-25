const rawConfiguredAppUrl = import.meta.env.VITE_APP_URL?.trim()

const normalizedConfiguredAppUrl = rawConfiguredAppUrl
  ? rawConfiguredAppUrl.replace(/\/$/, '')
  : ''

export const appBaseUrl =
  normalizedConfiguredAppUrl || window.location.origin

export const resetPasswordUrl = `${appBaseUrl}/reset-password`
