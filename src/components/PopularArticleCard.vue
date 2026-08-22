<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = defineProps<{
  /** 排行名次（从 1 开始） */
  rank: number;
  id: string | number;
  title: string;
  date: string;
  viewCount?: number;
}>();

const router = useRouter();

function goToArticle() {
  router.push({ name: 'article-detail', params: { id: props.id } });
}

function formatCount(n: number | undefined): string {
  if (n == null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function formatDate(d: string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<template>
  <article class="popular-card" @click="goToArticle">
    <!-- 名次徽章：前三名渐变强调 -->
    <span class="popular-card__rank" :class="{ 'popular-card__rank--top': rank <= 3 }">
      {{ String(rank).padStart(2, '0') }}
    </span>

    <div class="popular-card__body">
      <h4 class="popular-card__title">{{ title }}</h4>
      <div class="popular-card__meta">
        <span class="popular-card__views">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {{ formatCount(viewCount) }}
        </span>
        <span class="popular-card__date">{{ formatDate(date) }}</span>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.popular-card {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-sm;
  border-radius: $radius-md;
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    background: var(--color-bg-secondary);

    .popular-card__title {
      color: var(--color-accent-primary);
    }
  }
}

.popular-card__rank {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  font-size: 0.85rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: $color-text-secondary;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  margin-top: 2px;

  &--top {
    background: var(--color-accent-primary);
    color: #fff;
    border-color: transparent;
    box-shadow: $shadow-glow;

    // 暗色主题下强调色为浅色（#818cf8），改用深色文字保证对比度
    :global(.dark) & {
      color: #09090b;
    }
  }
}

.popular-card__body {
  flex: 1;
  min-width: 0;
}

.popular-card__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: $color-text-primary;
  margin: 0 0 4px;
  line-height: 1.5;
  transition: color 0.2s ease;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.popular-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.popular-card__views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: $color-text-secondary;

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }
}

.popular-card__date {
  font-size: 0.75rem;
  color: $color-text-secondary;
  font-family: $font-family-code;
  white-space: nowrap;
}
</style>
