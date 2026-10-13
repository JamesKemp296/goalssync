import { registerSW } from 'virtual:pwa-register'

const SERVICE_WORKER_TIMEOUT_MS = 20_000

let initPromise: Promise<ServiceWorkerRegistration> | null = null

export function initServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          'The app is still getting ready. Close it fully, open it again, and try once more.',
        ),
      )
    }, SERVICE_WORKER_TIMEOUT_MS)

    const finish = (registration: ServiceWorkerRegistration) => {
      window.clearTimeout(timeoutId)
      resolve(registration)
    }

    const fail = (error: unknown) => {
      window.clearTimeout(timeoutId)
      reject(
        error instanceof Error
          ? error
          : new Error('Something went wrong loading the app. Close it, open it again, and try once more.'),
      )
    }

    registerSW({
      immediate: true,
      onRegistered(registration) {
        if (!registration) {
          fail(new Error('Something went wrong loading the app. Close it, open it again, and try once more.'))
          return
        }
        if (registration.active) {
          finish(registration)
          return
        }
        void navigator.serviceWorker.ready.then(finish).catch(fail)
      },
      onRegisterError(error) {
        fail(error)
      },
    })
  })

  return initPromise
}

export async function waitForServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing?.active) return existing
  return initServiceWorkerRegistration()
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}
