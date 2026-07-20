<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="not-found">
    <div class="container not-found__content">
      <div class="not-found__code">404</div>
      <h1 class="not-found__title">{{ t('common.notFound') || 'Page Not Found' }}</h1>
      <p class="not-found__desc">
        {{ t('common.notFoundDesc') || 'The page you are looking for doesn\'t exist or has been moved.' }}
      </p>
      <div class="not-found__actions">
        <button class="btn-primary" @click="goHome">
          {{ t('common.backHome') || 'Back to Home' }}
        </button>
        <button class="btn-secondary" @click="router.back()">
          {{ t('common.goBack') || 'Go Back' }}
        </button>
      </div>

      <!-- Decorative elements -->
      <div class="not-found__glow"></div>
      <div class="not-found__particles">
        <span v-for="i in 6" :key="i" class="particle" :style="{
          '--delay': `${i * 0.3}s`,
          '--x': `${Math.random() * 100}%`,
          '--y': `${Math.random() * 100}%`,
        }"></span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 120px 0 60px;

  &__content {
    text-align: center;
    position: relative;
    z-index: 2;
    animation: fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &__code {
    font-size: clamp(6rem, 15vw, 12rem);
    font-weight: 900;
    line-height: 1;
    background: $gradient-primary;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -4px;
    margin-bottom: $spacing-md;
    animation: pulse-glow 3s ease-in-out infinite;
  }

  &__title {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: $spacing-md;
  }

  &__desc {
    font-size: 1.1rem;
    color: $color-text-secondary;
    max-width: 480px;
    margin: 0 auto $spacing-xl;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
    justify-content: center;
    flex-wrap: wrap;

    button {
      padding: 0.75rem 2rem;
      font-size: 1rem;
    }
  }

  &__glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(var(--color-accent-primary-rgb), 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
    animation: glow-pulse 4s ease-in-out infinite;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
}

@media (max-width: $breakpoint-mobile) {
  .not-found {
    padding: 100px 0 40px;

    &__actions {
      flex-direction: column;
      align-items: center;
    }
  }
}
</style>
