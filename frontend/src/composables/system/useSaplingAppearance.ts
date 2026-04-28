import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import saplingTiltBaseHref from '@/assets/styles/SaplingTiltBase.css?url'
import saplingTiltDarkHref from '@/assets/styles/SaplingTiltDark.css?url'
import saplingTiltLightHref from '@/assets/styles/SaplingTiltLight.css?url'
import CookieService from '@/services/cookie.service'

type SaplingThemeName = 'light' | 'dark'

const SAPLING_THEME_COOKIE = 'theme'
const SAPLING_GLASS_COOKIE = 'sapling-glass'
const SAPLING_TILT_COOKIE = 'sapling-tilt'
const SAPLING_THEME_LINK_ATTRIBUTE = 'data-sapling-theme'

const glassEnabled = ref(true)
const tiltEnabled = ref(true)
const appearanceInitialized = ref(false)

let themeWatcherBound = false

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

function loadThemeStyles(themeName: SaplingThemeName) {
  const themeVariantHref = themeName === 'dark' ? saplingTiltDarkHref : saplingTiltLightHref

  document.querySelectorAll(`link[${SAPLING_THEME_LINK_ATTRIBUTE}]`).forEach((element) => {
    element.remove()
  })

  const stylesheets = [
    { key: 'base', href: saplingTiltBaseHref },
    { key: 'variant', href: themeVariantHref },
  ]

  stylesheets.forEach(({ key, href }) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.setAttribute(SAPLING_THEME_LINK_ATTRIBUTE, key)
    link.href = href
    document.head.appendChild(link)
  })
}

function dispatchAppearanceChange(themeName: SaplingThemeName) {
  window.dispatchEvent(
    new CustomEvent('sapling:appearance-change', {
      detail: {
        theme: themeName,
        glassEnabled: glassEnabled.value,
        tiltEnabled: tiltEnabled.value,
      },
    }),
  )
}

function applyAppearanceAttributes(themeName: SaplingThemeName) {
  const root = document.documentElement
  root.dataset.saplingTheme = themeName
  root.dataset.saplingGlass = glassEnabled.value ? 'on' : 'off'
  root.dataset.saplingTilt = tiltEnabled.value ? 'on' : 'off'
  root.style.colorScheme = themeName

  dispatchAppearanceChange(themeName)
}

export function useSaplingAppearance() {
  const theme = useTheme()

  if (!appearanceInitialized.value) {
    const savedTheme = normalizeThemeName(CookieService.get(SAPLING_THEME_COOKIE))
    if (savedTheme && savedTheme !== getCurrentThemeName(theme.global.current.value.dark)) {
      theme.change(savedTheme)
    }

    glassEnabled.value = parseAppearanceToggle(CookieService.get(SAPLING_GLASS_COOKIE), true)
    tiltEnabled.value = parseAppearanceToggle(CookieService.get(SAPLING_TILT_COOKIE), true)

    const initialThemeName = getCurrentThemeName(theme.global.current.value.dark)
    loadThemeStyles(initialThemeName)
    applyAppearanceAttributes(initialThemeName)
    appearanceInitialized.value = true
  }

  if (!themeWatcherBound) {
    watch(
      () => theme.global.name.value,
      () => {
        const nextThemeName = getCurrentThemeName(theme.global.current.value.dark)
        CookieService.set(SAPLING_THEME_COOKIE, nextThemeName)
        loadThemeStyles(nextThemeName)
        applyAppearanceAttributes(nextThemeName)
      },
      { immediate: true },
    )

    themeWatcherBound = true
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
    setTheme,
    toggleTheme,
    setGlassEnabled,
    toggleGlass,
    setTiltEnabled,
    toggleTilt,
  }
}
