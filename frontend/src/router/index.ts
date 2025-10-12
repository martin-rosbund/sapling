import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import AccountView from '@/views/AccountView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/account', name: 'account', component: AccountView },
    { path: '/entity/:entity', name: 'entity', component: () => import('@/views/EntityView.vue') },
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
