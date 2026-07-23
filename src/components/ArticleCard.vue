<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AvatarGenerator from './AvatarGenerator.vue';

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

const { t, d } = useI18n();

const formattedDate = computed(() => {
  try {
    return d(new Date(props.date), 'short');
  } catch {
    return props.date;
  }
});

const showCover = computed(() => !!props.image);

function formatCount(n: number | undefined): string {
  if (n == null) return '0';
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(n);
}
</script>

<template>
  <article class="article-row">
    <!-- Main text content -->
    <div class="article-main">
      <!-- Title row: title left, date right -->
      <div class="article-title-row">
        <router-link :to="{ name: 'article-detail', params: { id } }" class="article-title-link">
          <h3 class="article-title">{{ title }}</h3>
        </router-link>
        <span class="article-date article-date--top">{{ formattedDate }}</span>
      </div>

      <!-- Summary -->
      <p class="article-summary">{{ summary }}</p>

      <!-- Bottom meta row -->
      <div class="article-meta">
        <div class="article-stats">
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
          <span v-if="favorites != null" class="stat-item" title="收藏">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>{{ formatCount(favorites) }}</span>
          </span>
          <span v-if="readingTimeMinutes" class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{{ readingTimeMinutes }} min read</span>
          </span>
        </div>

        <div class="article-footer-right">
          <div v-if="authorName" class="article-author">
            <AvatarGenerator v-if="!authorAvatar" :username="authorName" :size="22" />
            <img v-else :src="authorAvatar" :alt="authorName" class="author-avatar" />
            <span class="author-name">{{ authorName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Optional cover image -->
    <div v-if="showCover" class="article-cover">
      <router-link :to="{ name: 'article-detail', params: { id } }">
        <img :src="image" loading="lazy" :alt="title" decoding="async" />
      </router-link>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.article-row {
  display: flex;
  gap: $spacing-xl;
  padding: $spacing-lg 0;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.2s ease;
  border-radius: 8px;
  padding: $spacing-lg;

  &:hover {
    background: var(--color-bg-secondary);
  }

  @media (max-width: $breakpoint-mobile) {
    flex-direction: column-reverse;
    gap: $spacing-md;
    padding: $spacing-md;
  }
}

.article-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

// Title row: title left, date right
.article-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-md;
}

// Tags (hidden, kept for future use)

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 2px;
}

.article-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent-primary);
  background: rgba(var(--color-accent-primary-rgb), 0.08);
  border-radius: 4px;
  font-family: $font-family-code;
}

// Title
.article-title-link {
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
  display: inline;
  background: linear-gradient(currentColor, currentColor) no-repeat 0 100%;
  background-size: 0 2px;
  transition: background-size 0.3s ease;

  .article-title-link:hover & {
    background-size: 100% 2px;
    color: var(--color-accent-primary);
  }
}

// Summary
.article-summary {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.65;
  margin: 0;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// Bottom meta — stats left, author right, same row
.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  margin-top: auto;
  flex-wrap: nowrap;
}

.article-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;

  .stat-icon {
    width: 15px;
    height: 15px;
    opacity: 0.6;
  }
}

.article-footer-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.article-date {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  font-family: $font-family-code;
  white-space: nowrap;

  &--top {
    flex-shrink: 0;
    margin-left: auto;
  }
}

.article-author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  .author-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border);
  }

  .author-name {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
}

// Cover image
.article-cover {
  flex-shrink: 0;
  width: 200px;
  height: 130px;
  border-radius: 10px;
  overflow: hidden;

  @media (max-width: $breakpoint-tablet) {
    width: 160px;
    height: 110px;
  }

  @media (max-width: $breakpoint-mobile) {
    width: 100%;
    height: 180px;
  }

  a {
    display: block;
    width: 100%;
    height: 100%;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  &:hover img {
    transform: scale(1.06);
  }
}
</style>
