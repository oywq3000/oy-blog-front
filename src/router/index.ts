import { createRouter, createWebHistory } from 'vue-router';
import { useAppStore } from '../store/app';
import { useUserStore } from '../store/user';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/article/:id',
      name: 'article-detail',
      component: () => import('../views/ArticleDetail.vue'),
      props: true
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchPage.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/UserProfile.vue')
    },
    // Legacy redirect
    {
      path: '/editor',
      redirect: '/creator/articles/new'
    },
    // Creator center (with sidebar layout)
    {
      path: '/creator',
      name: 'creator',
      component: () => import('../views/CreatorCenter.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/creator/published'
        },
        {
          path: 'published',
          name: 'creator-published',
          component: () => import('../views/CreatorPublished.vue')
        },
        {
          path: 'drafts',
          name: 'creator-drafts',
          component: () => import('../views/CreatorDrafts.vue')
        },
      ]
    },
    // Editor routes — top level (no sidebar, full-screen editor)
    {
      path: '/creator/articles/new',
      name: 'creator-article-new',
      component: () => import('../views/ArticleEditor.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/creator/articles/:id/edit',
      name: 'creator-article-edit',
      component: () => import('../views/ArticleEditor.vue'),
      props: true,
      meta: { requiresAuth: true }
    },
    {
      path: '/email/verify',
      name: 'email-verify',
      component: () => import('../views/EmailVerification.vue')
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../views/PrivacyPolicy.vue')
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('../views/TermsOfService.vue')
    },
    {
      path: '/security',
      name: 'security',
      component: () => import('../views/SecurityPolicy.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue')
    }
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

let loadStartTime = 0;

router.beforeEach((to, from, next) => {
  const { startLoading } = useAppStore();

  // Skip loading overlay for internal creator tab switches (published ↔ drafts)
  const isCreatorTab = (path: string) => path.startsWith('/creator/') && !path.startsWith('/creator/articles/');
  if (!isCreatorTab(from.path) || !isCreatorTab(to.path)) {
    loadStartTime = Date.now();
    startLoading();
  }

  // Auth guard for routes that require authentication
  if (to.meta.requiresAuth && !useUserStore().isLoggedIn.value) {
    next({ path: '/' });
    return;
  }

  next();
});

router.afterEach((to, from) => {
  const isCreatorTab = (path: string) => path.startsWith('/creator/') && !path.startsWith('/creator/articles/');
  if (isCreatorTab(from.path) && isCreatorTab(to.path)) return;

  const { stopLoading } = useAppStore();
  const MIN_LOADING_TIME = 600;
  const elapsed = Date.now() - loadStartTime;
  const remaining = MIN_LOADING_TIME - elapsed;

  stopLoading(remaining > 0 ? remaining : 0);
});

export default router;
