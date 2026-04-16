import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
//import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  function manualChunks(id: string) {
    const normalizedId = id.replace(/\\/g, '/');
    const vuetifyMatch = normalizedId.match(/\/vuetify\/lib\/(components|composables|directives|iconsets|labs|locale|styles|util)\//);
    const monacoEditorMatch = normalizedId.match(/\/monaco-editor\/esm\/vs\/editor\/(browser|common|contrib|internal|standalone)\//);
    const monacoBaseMatch = normalizedId.match(/\/monaco-editor\/esm\/vs\/base\/(browser|common|parts)\//);

    if (!normalizedId.includes('/node_modules/')) {
      return undefined;
    }

    if (normalizedId.includes('/monaco-editor-vue3/')) {
      return 'vendor-monaco-wrapper';
    }

    if (monacoEditorMatch) {
      return `vendor-monaco-editor-${monacoEditorMatch[1]}`;
    }

    if (normalizedId.includes('/monaco-editor/esm/vs/platform/')) {
      return 'vendor-monaco-platform';
    }

    if (monacoBaseMatch) {
      return `vendor-monaco-base-${monacoBaseMatch[1]}`;
    }

    if (normalizedId.includes('/monaco-editor/')) {
      return 'vendor-monaco-misc';
    }

    if (normalizedId.includes('/@mdi/font/')) {
      return 'vendor-vuetify-icons';
    }

    if (normalizedId.includes('/vuetify/')) {
      return vuetifyMatch ? `vendor-vuetify-${vuetifyMatch[1]}` : 'vendor-vuetify-core';
    }

    if (
      normalizedId.includes('/@vue/')
      || normalizedId.includes('/vue/')
      || normalizedId.includes('/vue-router/')
      || normalizedId.includes('/pinia/')
      || normalizedId.includes('/vue-i18n/')
    ) {
      return 'vendor-vue';
    }

    if (
      normalizedId.includes('/axios/')
      || normalizedId.includes('/dompurify/')
      || normalizedId.includes('/libphonenumber-js/')
      || normalizedId.includes('/postal-mime/')
      || normalizedId.includes('/webfontloader/')
    ) {
      return 'vendor-utils';
    }

    if (normalizedId.includes('/vue-markdown-render/')) {
      return 'vendor-content';
    }

    return undefined;
  }

  return {
    plugins: [
      vue(),
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
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
