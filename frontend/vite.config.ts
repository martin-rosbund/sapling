import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
//import vueDevTools from 'vite-plugin-vue-devtools'

const vuetifyComponentImports = [
  'VAlert',
  'VApp',
  'VAppBar',
  'VAutocomplete',
  'VAvatar',
  'VBadge',
  'VBanner',
  'VBottomNavigation',
  'VBottomSheet',
  'VBreadcrumbs',
  'VBtn',
  'VBtnGroup',
  'VBtnToggle',
  'VCalendar',
  'VCard',
  'VCarousel',
  'VCheckbox',
  'VChip',
  'VChipGroup',
  'VCode',
  'VColorPicker',
  'VCombobox',
  'VConfirmEdit',
  'VCounter',
  'VDataIterator',
  'VDataTable',
  'VDatePicker',
  'VDefaultsProvider',
  'VDialog',
  'VDivider',
  'VEmptyState',
  'VExpansionPanel',
  'VFab',
  'VField',
  'VFileInput',
  'VFooter',
  'VForm',
  'VGrid',
  'VHotkey',
  'VHover',
  'VIcon',
  'VImg',
  'VInfiniteScroll',
  'VInput',
  'VItemGroup',
  'VKbd',
  'VLabel',
  'VLayout',
  'VLazy',
  'VList',
  'VLocaleProvider',
  'VMain',
  'VMenu',
  'VMessages',
  'VNavigationDrawer',
  'VNoSsr',
  'VNumberInput',
  'VOtpInput',
  'VOverlay',
  'VPagination',
  'VParallax',
  'VProgressCircular',
  'VProgressLinear',
  'VRadio',
  'VRadioGroup',
  'VRangeSlider',
  'VRating',
  'VResponsive',
  'VSelect',
  'VSelectionControl',
  'VSelectionControlGroup',
  'VSheet',
  'VSkeletonLoader',
  'VSlideGroup',
  'VSlider',
  'VSnackbar',
  'VSnackbarQueue',
  'VSparkline',
  'VSpeedDial',
  'VStepper',
  'VSwitch',
  'VSystemBar',
  'VTable',
  'VTabs',
  'VTextarea',
  'VTextField',
  'VThemeProvider',
  'VTimeline',
  'VTimePicker',
  'VToolbar',
  'VTooltip',
  'VTreeview',
  'VValidation',
  'VVirtualScroll',
  'VWindow',
].map((componentName) => `vuetify/components/${componentName}`)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  function manualChunks(id: string) {
    const normalizedId = id.replace(/\\/g, '/')
    const vuetifyMatch = normalizedId.match(
      /\/vuetify\/lib\/(components|composables|directives|iconsets|labs|locale|styles|util)\//,
    )

    if (!normalizedId.includes('/node_modules/')) {
      return undefined
    }

    if (
      normalizedId.includes('/@codemirror/lang-markdown/') ||
      normalizedId.includes('/@lezer/markdown/') ||
      normalizedId.includes('/@codemirror/lang-html/') ||
      normalizedId.includes('/@codemirror/lang-css/') ||
      normalizedId.includes('/@codemirror/lang-javascript/')
    ) {
      return 'vendor-codemirror-markdown'
    }

    if (
      normalizedId.includes('/@codemirror/lang-json/') ||
      normalizedId.includes('/@lezer/json/')
    ) {
      return 'vendor-codemirror-json'
    }

    if (normalizedId.includes('/@codemirror/') || normalizedId.includes('/@lezer/')) {
      return 'vendor-codemirror-core'
    }

    if (normalizedId.includes('/@mdi/font/')) {
      return 'vendor-vuetify-icons'
    }

    if (normalizedId.includes('/vuetify/')) {
      return vuetifyMatch ? `vendor-vuetify-${vuetifyMatch[1]}` : 'vendor-vuetify-core'
    }

    if (
      normalizedId.includes('/@vue/') ||
      normalizedId.includes('/vue/') ||
      normalizedId.includes('/vue-router/') ||
      normalizedId.includes('/pinia/') ||
      normalizedId.includes('/vue-i18n/')
    ) {
      return 'vendor-vue'
    }

    if (
      normalizedId.includes('/axios/') ||
      normalizedId.includes('/dompurify/') ||
      normalizedId.includes('/libphonenumber-js/') ||
      normalizedId.includes('/postal-mime/') ||
      normalizedId.includes('/webfontloader/')
    ) {
      return 'vendor-utils'
    }

    if (normalizedId.includes('/vue-markdown-render/')) {
      return 'vendor-content'
    }

    return undefined
  }

  return {
    plugins: [
      vue(),
      // Auto-imports Vuetify components/directives on demand for tree-shaking.
      // Default styles handling lets the plugin inject the precompiled
      // 'vuetify/styles' CSS bundle automatically (no sass toolchain required).
      vuetify({ autoImport: true }),
      //vueDevTools(),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      allowedHosts: env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',').map(String) : [],
    },
    optimizeDeps: {
      include: vuetifyComponentImports,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
