<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AvatarGenerator from './AvatarGenerator.vue';
import TagBadge from './TagBadge.vue';

const props = defineProps<{
  id: number | string;
  title: string;
  summary: string;
  date: string;
  tags?: string[];
  image?: string;
  authorName?: string;
  authorAvatar?: string;
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  readingTimeMinutes?: number;
}>();

const router = useRouter();
const { t } = useI18n();

function goToArticle() {
  router.push({ name: 'article-detail', params: { id: props.id } });
}

const showCover = computed(() => !!props.image);

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
  <article class="featured-card" :class="{ 'has-cover': showCover }" @click="goToArticle">
    <div class="featured-card__content">
      <!-- 作者行 -->
      <div class="featured-card__author">
        <AvatarGenerator v-if="!authorAvatar" :username="authorName || t('home.title')" :size="26" />
        <img v-else :src="authorAvatar" :alt="authorName || ''" class="featured-card__author-avatar" />
        <span class="featured-card__author-name">{{ authorName }}</span>
        <span class="featured-card__date">{{ formatDate(date) }}</span>
      </div>

      <!-- 标题 -->
      <h3 class="featured-card__title">{{ title }}</h3>

      <!-- 摘要 -->
      <p class="featured-card__summary">{{ summary }}</p>

      <!-- 统计 + 标签 -->
      <div class="featured-card__meta">
        <div class="featured-card__stats">
          <span v-if="viewCount != null" class="stat-item" :title="t('articleDetail.views')">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{{ formatCount(viewCount) }}</span>
          </span>
          <span v-if="likeCount != null" class="stat-item" :title="t('articleDetail.likes')">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ formatCount(likeCount) }}</span>
          </span>
          <span v-if="readingTimeMinutes" class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{{ readingTimeMinutes }} min read</span>
          </span>
        </div>

        <div v-if="tags && tags.length" class="featured-card__tags" @click.stop>
          <TagBadge v-for="tag in tags.slice(0, 4)" :key="tag" :label="tag" size="sm" />
        </div>
      </div>

      <!-- 阅读全文 -->
      <router-link
        class="featured-card__read"
        :to="{ name: 'article-detail', params: { id } }"
        @click.stop
      >
        {{ t('home.readFull') }}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </router-link>
    </div>

    <!-- 封面 -->
    <div v-if="showCover" class="featured-card__cover">
      <img :src="image" :alt="title" loading="lazy" decoding="async" />
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.featured-card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: $spacing-lg;
  padding: $spacing-lg;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: $radius-lg;
  cursor: pointer;
  overflow: hidden;
  transition: $transition-smooth;

  // 顶部渐变发丝线
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: $gradient-primary;
    opacity: 0.8;
  }

  &:hover {
    box-shadow: var(--color-card-hover-shadow);
    transform: translateY(-4px);
  }

  &.has-cover {
    @media (max-width: $breakpoint-tablet) {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: $breakpoint-tablet) {
    grid-template-columns: 1fr;
  }
}

.featured-card__content {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-width: 0;
}

// ---- 作者行 ----
.featured-card__author {
  display: flex;
  align-items: center;
  gap: 8px;

  .featured-card__author-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border);
  }

  .featured-card__author-name {
    font-size: 0.85rem;
    color: $color-text-secondary;
    font-weight: 500;
  }

  .featured-card__date {
    font-size: 0.8rem;
    color: $color-text-secondary;
    font-family: $font-family-code;
    margin-inline-start: auto;
  }
}

// ---- 标题 ----
.featured-card__title {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  color: $color-text-primary;
  margin: 0;
  line-height: 1.35;
  letter-spacing: -0.5px;

  .featured-card:hover & {
    background: linear-gradient(currentColor, currentColor) no-repeat 0 100%;
    background-size: 100% 2px;
    color: var(--color-accent-primary);
  }
}

// ---- 摘要 ----
.featured-card__summary {
  font-size: 0.95rem;
  color: $color-text-secondary;
  line-height: 1.7;
  margin: 0;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// ---- 统计 + 标签 ----
.featured-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  flex-wrap: wrap;
  margin-top: $spacing-xs;
}

.featured-card__stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.featured-card__tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: $color-text-secondary;
  white-space: nowrap;

  .stat-icon {
    width: 15px;
    height: 15px;
    opacity: 0.6;
  }
}

// ---- 阅读全文 ----
.featured-card__read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-top: $spacing-sm;
  color: var(--color-accent-primary);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  background: linear-gradient(currentColor, currentColor) no-repeat 0 100%;
  background-size: 0 2px;
  transition: background-size 0.3s ease;

  &:hover {
    background-size: 100% 2px;
  }
}

// ---- 封面 ----
.featured-card__cover {
  border-radius: $radius-md;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  align-self: center;
  background: var(--color-bg-secondary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .featured-card:hover & img {
    transform: scale(1.05);
  }
}
</style>
