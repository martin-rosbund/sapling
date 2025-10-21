// Styles
import '@mdi/font/css/materialdesignicons.css'
import { VDateInput } from 'vuetify/labs/VDateInput'
import 'vuetify/styles'

// Vuetify
import { createVuetify } from 'vuetify'
 
// Import all components and directives
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    ...components,
    VDateInput
  },
  directives,
  theme: {
    defaultTheme: 'dark' // <-- This line enables dark mode
  },
  icons: {
    defaultSet: 'mdi', // set material design icons to default
  },
});