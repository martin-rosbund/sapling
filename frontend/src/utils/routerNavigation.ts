import type { RouteLocationRaw, Router } from 'vue-router'
import { isNavigationFailure } from 'vue-router'

let pendingTargetPath: string | null = null
let pendingNavigation: Promise<boolean> | null = null

const routeLoadErrorMessages = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'outdated optimize dep',
]

export function isRecoverableRouteLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '')

  const normalizedMessage = message.toLowerCase()
  return routeLoadErrorMessages.some((fragment) => normalizedMessage.includes(fragment))
}

function recoverFromRouteLoadError(targetHref: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const targetUrl = new URL(targetHref, window.location.href)
  if (targetUrl.href === window.location.href) {
    window.location.reload()
    return true
  }

  window.location.assign(targetUrl.href)
  return true
}

/**
 * Serializes app-internal route changes so repeated clicks and async guards do
 * not leave callers guessing whether a navigation actually completed.
 */
export async function pushAppRoute(router: Router, target: RouteLocationRaw): Promise<boolean> {
  const resolvedTarget = router.resolve(target)
  const targetPath = resolvedTarget.fullPath

  if (router.currentRoute.value.fullPath === targetPath) {
    return false
  }

  if (pendingNavigation && pendingTargetPath === targetPath) {
    return pendingNavigation
  }

  if (pendingNavigation) {
    await pendingNavigation

    if (router.currentRoute.value.fullPath === targetPath) {
      return false
    }
  }

  const navigation = router
    .push(resolvedTarget)
    .then(() => router.currentRoute.value.fullPath === targetPath)
    .catch((error: unknown) => {
      if (isNavigationFailure(error)) {
        return false
      }

      if (isRecoverableRouteLoadError(error) && recoverFromRouteLoadError(resolvedTarget.href)) {
        return false
      }

      throw error
    })
    .finally(() => {
      if (pendingNavigation === navigation) {
        pendingNavigation = null
        pendingTargetPath = null
      }
    })

  pendingTargetPath = targetPath
  pendingNavigation = navigation

  return navigation
}
