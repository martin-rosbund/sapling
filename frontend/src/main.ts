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
import 'vuetify/styles';
// Import Axios for HTTP requests
import axios from 'axios';
// Import the i18n instance for internationalization
import { i18n } from './i18n'
// Import Pinia for state management
import { createPinia } from 'pinia'
// Import the tilt directive
import { vTilt } from './directives/tilt'

// Create a Pinia instance
const pinia = createPinia()

// Set the default base URL for Axios from environment variables
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_API;
// Enable sending credentials (cookies) with requests
axios.defaults.withCredentials = true;

// Load custom web fonts
loadFonts()

// Create the Vue application, register plugins, and mount it to the DOM
createApp(App)
  .use(router)
  .use(vuetify)
  .use(i18n)
  .use(pinia)
  .directive('tilt', vTilt)
  .mount('#app')
