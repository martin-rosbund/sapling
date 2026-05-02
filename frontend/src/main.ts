// Import the createApp function from Vue
import { createApp } from 'vue'
// Import the root App component
import App from './App.vue'
// Import the router instance
import router from './router'
// Import the Vuetify plugin
import vuetify from './plugins/vuetify'
// Import the font loader utility
import { loadFonts } from './plugins/webfontloader'
// Import Vuetify styles
import 'vuetify/styles'
// Import the global frontend style framework
import './assets/styles/SaplingStyles.css'
// Import the i18n instance for internationalization
import { i18n } from './i18n'
// Import Pinia for state management
import { createPinia } from 'pinia'
// Import the tilt directive
import { vTilt } from './directives/tilt'
import { configureMonacoWorkers } from './plugins/monaco'
import { configureApiClient } from './services/api.client'

// Create a Pinia instance
const pinia = createPinia()

configureApiClient()

// Load custom web fonts
loadFonts()
configureMonacoWorkers()

// Create the Vue application, register plugins, and mount it to the DOM
createApp(App).use(pinia).use(router).use(vuetify).use(i18n).directive('tilt', vTilt).mount('#app')
