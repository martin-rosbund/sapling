import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import 'vuetify/styles';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3000/api';
axios.defaults.withCredentials = true;

loadFonts()

createApp(App)
  .use(router)
  .use(vuetify)
  .mount('#app')
