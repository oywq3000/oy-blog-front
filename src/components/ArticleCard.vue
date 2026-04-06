<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  id: number | string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  image: string;
}>();

const { t, d } = useI18n();
</script>

<template>
  <div class="card-container">
    <div class="card">
      <div class="card__image-wrapper">
        <img 
          :src="image || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080&auto=format&fit=crop'" 
          loading="lazy" 
          class="card__image" 
          alt="Article thumbnail"
          decoding="async"
        />
        <div class="card__overlay"></div>
      </div>
      <div class="card__content">
        <div class="card__meta">
          <span class="date">{{ d(new Date(date), 'short') }}</span>
          <div class="tags">
            <span v-for="tag in tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
        </div>
        <router-link :to="{ name: 'article-detail', params: { id } }" class="card__link">
          <h3 class="card__title">{{ title }}</h3>
        </router-link>
        <p class="card__summary">{{ summary }}</p>
        <router-link :to="{ name: 'article-detail', params: { id } }" class="card__btn">
          {{ t('common.readMore') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.card__link {
  text-decoration: none;
  color: inherit;
  display: block;
}


.card-container {
  width: 100%;
  height: 100%;
  /* min-height removed to allow flex/grid control, but set a reasonable default for the card itself */
  position: relative;
  z-index: 1;
}

.card {
  width: 100%;
  height: 380px; /* Fixed height for consistency */
  position: relative; /* For absolute positioning of content */
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--color-card-hover-shadow);
    border-color: rgba($color-accent-primary, 0.5);

    .card__image {
      transform: scale(1.08);
    }

    .card__title {
      color: $color-accent-primary;
    }
    
    .card__overlay {
      opacity: 0.9; /* Darken slightly on hover */
    }
  }

  &__image-wrapper {
    height: 100%; /* Full height */
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom, 
      transparent 0%, 
      rgba(0, 0, 0, 0.2) 40%, 
      rgba(0, 0, 0, 0.95) 100%
    );
    transition: opacity 0.3s ease;
    opacity: 0.8;
  }

  &__content {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: $spacing-lg;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7); /* Always light */
    font-family: $font-family-code;

    .tags {
      display: flex;
      gap: 6px;
    }

    .tag {
      color: #fff;
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 8px;
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }
  }

  &__title {
    font-size: 1.3rem;
    margin-bottom: $spacing-xs;
    color: #ffffff; /* Always white */
    font-weight: 700;
    line-height: 1.3;
    transition: color 0.3s;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__summary {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8); /* Light grey */
    line-height: 1.5;
    margin-bottom: $spacing-md;
    
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Limit to 2 lines to save space */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__btn {
    align-self: flex-start;
    background: transparent;
    color: $color-accent-primary; /* Accent color for button */
    border: none;
    padding: 0;
    font-family: $font-family-code;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: gap 0.3s;
    text-decoration: none;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);

    &::after {
      content: '→';
      font-size: 1.2rem;
      color: $color-accent-primary;
      transition: transform 0.3s;
    }

    // RTL Support for arrow
    :global([dir="rtl"]) &::after {
      transform: scaleX(-1);
    }

    &:hover {
      color: $color-accent-primary;
      gap: 16px;
    }
  }
}
</style>
