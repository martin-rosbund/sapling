// Styles
import '@mdi/font/css/materialdesignicons.css'
import { VDateInput } from 'vuetify/labs/VDateInput'
import 'vuetify/styles'
import { de, en } from 'vuetify/locale'

// Vuetify
import { createVuetify } from 'vuetify'

// Components and directives are auto-imported on demand by vite-plugin-vuetify
// (see vite.config.ts). Only labs components must be registered explicitly.
export default createVuetify({
  components: {
    VDateInput,
  },
  theme: {
    defaultTheme: 'dark', // <-- This line enables dark mode
  },
  icons: {
    defaultSet: 'mdi', // set material design icons to default
  },
  locale: {
    locale: 'de', // Standard
    messages: { de, en },
  },
})
