<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const visible = ref(false);
let ticking = false;

const onScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      visible.value = window.scrollY > 400;
      ticking = false;
    });
    ticking = true;
  }
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <transition name="back-to-top">
    <button
      v-if="visible"
      class="back-to-top glass-panel"
      @click="scrollToTop"
      aria-label="Back to top"
      title="Back to top"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 19V5M12 5L5 12M12 5L19 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </transition>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 900;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid $color-border;
  background: $color-card-bg;
  color: $color-text-primary;
  box-shadow: $shadow-card;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: translateY(-4px) scale(1.05);
    border-color: $color-accent-primary;
    color: $color-accent-primary;
    box-shadow: 0 8px 25px rgba(var(--color-accent-primary-rgb), 0.25);
  }

  &:active {
    transform: translateY(0) scale(0.95);
  }

  @media (max-width: $breakpoint-mobile) {
    bottom: 20px;
    right: 16px;
    width: 44px;
    height: 44px;
  }
}

.back-to-top-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.back-to-top-leave-active {
  transition: all 0.2s ease-in;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}
</style>
