
// Import Vue Router and view components
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import AccountView from '@/views/AccountView.vue'
import { BACKEND_URL } from '@/constants/project.constants'


/**
 * Vue Router instance for application navigation.
 * Defines all main routes and their associated components.
 */
const router = createRouter({
  // Use HTML5 history mode
  history: createWebHistory(import.meta.env.BASE_URL),
  // Route definitions
  routes: [
    // Home page
    { path: '/', name: 'home', component: HomeView },
    // Login page
    { path: '/login', name: 'login', component: LoginView },
    // Account page
    { path: '/account', name: 'account', component: AccountView },
    // Calendar view (lazy loaded)
    { path: '/calendar', name: 'calendar', component: () => import('@/views/EventView.vue') },
    // Ticket view (lazy loaded)
    { path: '/ticket', name: 'ticket', component: () => import('@/views/TicketView.vue') },
    // Note view (lazy loaded)
    { path: '/note', name: 'note', component: () => import('@/views/NoteView.vue') },
    // Right view (lazy loaded)
    { path: '/right', name: 'right', component: () => import('@/views/RightView.vue') },
    // Dynamic entity view (lazy loaded)
    { path: '/entity/:entity', name: 'entity', component: () => import('@/views/EntityView.vue') },
    // Catch-all for 404 errors (lazy loaded)
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/ErrorView.vue') }
  ],
})


/**
 * Global navigation guard for authentication.
 * Checks if the user is authenticated before allowing access to protected routes.
 * Redirects to login if not authenticated.
 */
router.beforeEach(async (to, from, next) => {
  // Allow access to login page without authentication
  if (to.name === 'login') {
    return next();
  }

  try {
    // Check authentication status via backend
    const res = await fetch(BACKEND_URL +'auth/isAuthenticated', {
      credentials: 'include',
    });
    const data = await res.json();
    if (data.authenticated) {
      next();
    } else {
      next({ name: 'login' });
    }
  } catch {
    // On error, redirect to login
    next({ name: 'login' });
  }
});


// Export the router instance
export default router
