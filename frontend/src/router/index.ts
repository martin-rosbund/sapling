import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import AccountView from '@/views/AccountView.vue'
import RightView from '@/views/RightView.vue'
import EntityView from '@/views/EntityView.vue'
import TranslationView from '@/views/TranslationView.vue'
import NoteView from '@/views/NoteView.vue'
import TicketView from '@/views/TicketView.vue'
import CompanyView from '@/views/CompanyView.vue'
import PersonView from '@/views/PersonView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/account', name: 'account', component: AccountView },
    { path: '/right', name: 'right', component: RightView },
    { path: '/translation', name: 'translation', component: TranslationView },
    { path: '/entity', name: 'entity', component: EntityView },
    { path: '/note', name: 'note', component: NoteView },
    { path: '/ticket', name: 'ticket', component: TicketView },
    { path: '/company', name: 'company', component: CompanyView },
    { path: '/person', name: 'person', component: PersonView },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/ErrorView.vue') }
  ],
})

router.beforeEach(async (to, from, next) => {
  if (to.name === 'login') {
    return next();
  }

  try {
    const res = await fetch(import.meta.env.VITE_BACKEND_URL +'auth/isAuthenticated', {
      credentials: 'include',
    });
    const data = await res.json();
    if (data.authenticated) {
      next();
    } else {
      next({ name: 'login' });
    }
  } catch {
    next({ name: 'login' });
  }
});

export default router
