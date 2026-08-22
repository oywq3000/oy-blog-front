<script setup lang="ts">
import { watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import NavBar from './components/NavBar.vue';
import Footer from './components/Footer.vue';
import BackToTop from './components/BackToTop.vue';
import InteractiveBackground from './components/InteractiveBackground.vue';
import SvgSprite from './components/SvgSprite.vue';
import JavaHelloLoader from './components/JavaHelloLoader.vue';
import Toast from './components/Toast.vue';
import CookieNotice from './components/CookieNotice.vue';
import { useUserStore } from './store/user';
import { useAppStore } from './store/app';
import { useTheme } from './composables/useTheme';
import { shouldShowFooter } from './utils/pageChrome';

import { useRoute } from 'vue-router';

const { locale } = useI18n();
const { fetchUserInfo } = useUserStore();
const { isLoading, startLoading, stopLoading } = useAppStore();
const { initTheme } = useTheme();
const route = useRoute();

// Chat pages are fullscreen app pages with internal scrolling — no footer
const showFooter = computed(() => shouldShowFooter(route.name));

// Start loading immediately on app initialization
startLoading();

onMounted(async () => {
  // Initialize theme immediately
  initTheme();

  // Fetch user info (background)
  await fetchUserInfo();

  // Home 页自行调用 stopLoading()（数据渲染完毕后，见 HomeView onMounted）；
  // 这里保留 5s 兜底，防止取数挂起导致加载层不消失
  if (route.name !== 'home') {
    stopLoading(800);
  } else {
    setTimeout(() => {
      if (isLoading.value) stopLoading();
    }, 5000);
  }
});

watch(locale, (newLocale) => {
  localStorage.setItem('locale', newLocale);
  document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = newLocale;
}, { immediate: true });
</script>

<template>
  <div class="app-layout">
    <InteractiveBackground />
    <div class="app-content">
      <SvgSprite />
      <Toast />
      <CookieNotice />
      <transition name="fade">
        <JavaHelloLoader v-if="isLoading" />
      </transition>
      <NavBar />
      <router-view v-slot="{ Component, route: r }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="r.path.startsWith('/creator/') && !r.path.startsWith('/creator/articles/') ? '/creator' : r.path" />
        </transition>
      </router-view>
      <Footer v-if="showFooter" />
      <BackToTop />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './styles/variables' as *;

.app-layout {
  position: relative; /* Create stacking context for InteractiveBackground */
  min-height: 100vh;
}

.app-content {
  position: relative;
  z-index: 1; /* Ensure content sits above the background */
}

:deep(.md-editor-preview) {
  .md-editor-code {
    .md-editor-code-head {
      .md-editor-code-flag {
        span {
          margin-top: unset !important;
        }
      }
    }
  }
}
</style>
