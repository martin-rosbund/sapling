import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import 'vuetify/styles';
import axios from 'axios';
import { i18n } from './i18n'

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_API;
axios.defaults.withCredentials = true;

loadFonts()

createApp(App)
  .use(router)
  .use(vuetify)
  .use(i18n)
  .mount('#app')
