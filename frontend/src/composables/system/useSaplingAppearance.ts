import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import CookieService from '@/services/cookie.service'

type SaplingThemeName = 'light' | 'dark'
type SaplingPerformanceMode = 'full' | 'reduced'

const SAPLING_THEME_COOKIE = 'theme'
const SAPLING_GLASS_COOKIE = 'glass'
const SAPLING_TILT_COOKIE = 'tilt'

const glassEnabled = ref(true)
const tiltEnabled = ref(true)
const performanceMode = ref<SaplingPerformanceMode>('full')
const appearanceInitialized = ref(false)

let themeWatcherBound = false
let performanceWatchersBound = false

type NavigatorConnection = {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getNavigatorConnection(): NavigatorConnection | null {
  if (typeof navigator === 'undefined') {
    return null
  }

  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection
  return connection ?? null
}

function normalizeThemeName(value?: string | null): SaplingThemeName | null {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return null
}

function parseAppearanceToggle(value: string | null, fallback: boolean): boolean {
  if (value == null) {
    return fallback
  }

  return !['0', 'false', 'off', 'no'].includes(value.toLowerCase())
}

function getCurrentThemeName(isDarkTheme: boolean): SaplingThemeName {
  return isDarkTheme ? 'dark' : 'light'
}

function detectPerformanceMode(): SaplingPerformanceMode {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'full'
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
  }

  const deviceMemory = navigatorWithHints.deviceMemory
  const hardwareConcurrency = navigatorWithHints.hardwareConcurrency
  const connection = getNavigatorConnection()
  const saveData = connection?.saveData === true
  const effectiveType = connection?.effectiveType?.toLowerCase()
  const slowConnection =
    effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g'

  if (prefersReducedMotion || saveData || slowConnection) {
    return 'reduced'
  }

  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 2) {
    return 'reduced'
  }

  if (
    typeof hardwareConcurrency === 'number' &&
    hardwareConcurrency > 0 &&
    hardwareConcurrency <= 2
  ) {
    return 'reduced'
  }

  return 'full'
}

function dispatchAppearanceChange(themeName: SaplingThemeName) {
  window.dispatchEvent(
    new CustomEvent('sapling:appearance-change', {
      detail: {
        theme: themeName,
        glassEnabled: glassEnabled.value,
        tiltEnabled: tiltEnabled.value,
        performanceMode: performanceMode.value,
      },
    }),
  )
}

function applyAppearanceAttributes(themeName: SaplingThemeName) {
  const root = document.documentElement
  root.dataset.saplingTheme = themeName
  root.dataset.saplingGlass = glassEnabled.value ? 'on' : 'off'
  root.dataset.saplingTilt = tiltEnabled.value ? 'on' : 'off'
  root.dataset.saplingPerformance = performanceMode.value
  root.style.colorScheme = themeName

  dispatchAppearanceChange(themeName)
}

export function useSaplingAppearance() {
  const theme = useTheme()

  const syncPerformanceMode = () => {
    performanceMode.value = detectPerformanceMode()

    if (appearanceInitialized.value) {
      applyAppearanceAttributes(getCurrentThemeName(theme.global.current.value.dark))
    }
  }

  if (!appearanceInitialized.value) {
    const savedTheme = normalizeThemeName(CookieService.get(SAPLING_THEME_COOKIE))
    if (savedTheme && savedTheme !== getCurrentThemeName(theme.global.current.value.dark)) {
      theme.change(savedTheme)
    }

    glassEnabled.value = parseAppearanceToggle(CookieService.get(SAPLING_GLASS_COOKIE), true)
    tiltEnabled.value = parseAppearanceToggle(CookieService.get(SAPLING_TILT_COOKIE), true)
    performanceMode.value = detectPerformanceMode()

    const initialThemeName = getCurrentThemeName(theme.global.current.value.dark)
    applyAppearanceAttributes(initialThemeName)
    appearanceInitialized.value = true
  }

  if (!themeWatcherBound) {
    watch(
      () => theme.global.name.value,
      () => {
        const nextThemeName = getCurrentThemeName(theme.global.current.value.dark)
        CookieService.set(SAPLING_THEME_COOKIE, nextThemeName)
        applyAppearanceAttributes(nextThemeName)
      },
      { immediate: true },
    )

    themeWatcherBound = true
  }

  if (!performanceWatchersBound && typeof window !== 'undefined') {
    if (typeof window.matchMedia === 'function') {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handleReducedMotionChange = () => syncPerformanceMode()

      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
      } else if (typeof reducedMotionQuery.addListener === 'function') {
        reducedMotionQuery.addListener(handleReducedMotionChange)
      }
    }

    const connection = getNavigatorConnection()
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', syncPerformanceMode)
    }

    performanceWatchersBound = true
  }

  const isDarkTheme = computed(() => theme.global.current.value.dark)
  const currentTheme = computed<SaplingThemeName>(() =>
    getCurrentThemeName(theme.global.current.value.dark),
  )

  function setTheme(themeName: SaplingThemeName) {
    if (currentTheme.value === themeName) {
      return
    }

    theme.change(themeName)
  }

  function toggleTheme() {
    setTheme(isDarkTheme.value ? 'light' : 'dark')
  }

  function setGlassEnabled(value: boolean) {
    if (glassEnabled.value === value) {
      return
    }

    glassEnabled.value = value
    CookieService.set(SAPLING_GLASS_COOKIE, value ? 'on' : 'off')
    applyAppearanceAttributes(currentTheme.value)
  }

  function toggleGlass() {
    setGlassEnabled(!glassEnabled.value)
  }

  function setTiltEnabled(value: boolean) {
    if (tiltEnabled.value === value) {
      return
    }

    tiltEnabled.value = value
    CookieService.set(SAPLING_TILT_COOKIE, value ? 'on' : 'off')
    applyAppearanceAttributes(currentTheme.value)
  }

  function toggleTilt() {
    setTiltEnabled(!tiltEnabled.value)
  }

  return {
    currentTheme,
    isDarkTheme,
    isGlassEnabled: computed(() => glassEnabled.value),
    isTiltEnabled: computed(() => tiltEnabled.value),
    performanceMode: computed(() => performanceMode.value),
    setTheme,
    toggleTheme,
    setGlassEnabled,
    toggleGlass,
    setTiltEnabled,
    toggleTilt,
  }
}
