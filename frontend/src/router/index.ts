// Import Vue Router and view components
import { createRouter, createWebHistory } from 'vue-router'
import SaplingAuthLayout from '@/layouts/SaplingAuthLayout.vue'
import SaplingPublicLayout from '@/layouts/SaplingPublicLayout.vue'
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
    {
      path: '/login',
      component: SaplingPublicLayout,
      children: [{ path: '', name: 'login', component: () => import('@/views/LoginView.vue') }],
    },
    {
      path: '/',
      component: SaplingAuthLayout,
      children: [
        // Home page
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
        // Calendar view (lazy loaded)
        { path: 'event', name: 'calendar', component: () => import('@/views/EventView.vue') },
        // Note view (lazy loaded)
        { path: 'note', name: 'note', component: () => import('@/views/NoteView.vue') },
        // Playground view (lazy loaded)
        {
          path: 'playground',
          name: 'playground',
          component: () => import('@/views/PlaygroundView.vue'),
        },
        // System view (lazy loaded)
        { path: 'system', name: 'system', component: () => import('@/views/SystemView.vue') },
        // Issue view (lazy loaded)
        { path: 'issue', name: 'issue', component: () => import('@/views/IssueView.vue') },
        // Right view (lazy loaded)
        {
          path: 'permission',
          name: 'right',
          component: () => import('@/views/PermissionView.vue'),
        },
        // Dynamic entity view (lazy loaded)
        { path: 'table/:entity', name: 'table', component: () => import('@/views/TableView.vue') },
        // Record-centric timeline view (lazy loaded)
        {
          path: 'timeline/:entity/:handle',
          name: 'timeline',
          component: () => import('@/views/TimelineView.vue'),
        },
        // Dynamic entity view (lazy loaded)
        {
          path: 'partner/:entity',
          name: 'partner',
          component: () => import('@/views/PartnerView.vue'),
        },
        // Dynamic entity view (lazy loaded)
        { path: 'file/:entity', name: 'file', component: () => import('@/views/FileView.vue') },
        // Catch-all for 404 errors (lazy loaded)
        {
          path: ':pathMatch(.*)*',
          name: 'NotFound',
          component: () => import('@/views/ErrorView.vue'),
        },
      ],
    },
  ],
})

/**
 * Global navigation guard for authentication.
 * Checks if the user is authenticated before allowing access to protected routes.
 * Redirects to login if not authenticated.
 */
// Removed deprecated navigation guard
router.beforeEach(async (to) => {
  // Allow access to login page without authentication
  if (to.name === 'login') {
    return true
  }

  try {
    // Check authentication status via backend
    const res = await fetch(BACKEND_URL + 'auth/isAuthenticated', {
      credentials: 'include',
    })
    const data = await res.json()
    if (data.authenticated) {
      return true
    } else {
      return { name: 'login' }
    }
  } catch {
    // On error, redirect to login
    return { name: 'login' }
  }
})

// Export the router instance
export default router
