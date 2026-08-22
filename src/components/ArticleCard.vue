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
  /** ES 高亮摘要片段（含 <em class="highlight"> 标签） */
  highlightSnippet?: string;
  /** ES 高亮标题片段（含 <em class="highlight"> 标签） */
  highlightTitle?: string;
}>();

const router = useRouter();
const { t } = useI18n();

function goToArticle() {
  router.push({ name: 'article-detail', params: { id: props.id } });
}

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
  <article class="article-row" :class="{ 'has-cover': showCover }" @click="goToArticle">
    <!-- Row 1: Author + date -->
    <div class="article-author-row">
      <div v-if="authorName" class="article-author">
        <AvatarGenerator v-if="!authorAvatar" :username="authorName" :size="22" />
        <img v-else :src="authorAvatar" :alt="authorName" class="author-avatar" />
        <span class="author-name">{{ authorName }}</span>
      </div>
    </div>
    <!-- Row 2: Title -->
    <h3 v-if="highlightTitle" class="article-title" v-html="highlightTitle"></h3>
    <h3 v-else class="article-title">{{ title }}</h3>
    <!-- Row 3: Summary / Highlight Snippet -->
    <p v-if="highlightSnippet" class="article-summary highlight-snippet" v-html="highlightSnippet"></p>
    <p v-else class="article-summary">{{ summary }}</p>
    <!-- Row 4: Stats + Tags -->
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
      <!-- Tags: 最多 3 个，与统计并列；stop 阻止触发卡片跳转 -->
      <div v-if="tags && tags.length" class="article-tags" @click.stop>
        <TagBadge v-for="tag in tags.slice(0, 3)" :key="tag" :label="tag" size="sm" />
      </div>
    </div>
    <!-- Cover: spans rows 2-4 (title → stats) -->
    <div v-if="showCover" class="article-cover">
      <img :src="image" loading="lazy" :alt="title" decoding="async" />
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.article-row {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto 1fr auto;
  min-height: 120px;
  padding: $spacing-sm $spacing-lg;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: $radius-lg;
  cursor: pointer;
  gap: 4px 0;
  position: relative;
  overflow: hidden;
  transition: $transition-base;

  // 左侧渐变条：hover 时展开
  &::before {
    content: '';
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: $gradient-primary;
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover {
    border-color: rgba(var(--color-accent-primary-rgb), 0.35);
    box-shadow: var(--color-card-hover-shadow);
    transform: translateY(-2px);

    &::before {
      transform: scaleY(1);
    }
  }

  // When cover exists, add a second column
  &.has-cover {
    grid-template-columns: 1fr 200px;
    gap: 4px $spacing-xl;

    @media (max-width: $breakpoint-tablet) {
      grid-template-columns: 1fr 150px;
      gap: 4px $spacing-lg;
    }
  }

  @media (max-width: $breakpoint-mobile) {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto;
    min-height: 0;
    padding: $spacing-md;
    gap: 6px;
  }
}

// ---- Row 1: Author + Date ----
.article-author-row {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
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

.article-date {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-family: $font-family-code;
  white-space: nowrap;
  flex-shrink: 0;
}

// ---- Row 2: Title ----
.article-title {
  grid-column: 1;
  grid-row: 2;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
  display: inline;
  width: fit-content;
  min-width: 0;
  background: linear-gradient(currentColor, currentColor) no-repeat 0 100%;
  background-size: 0 2px;
  transition: background-size 0.3s ease;

  .article-row:hover & {
    background-size: 100% 2px;
    color: var(--color-accent-primary);
  }
}

// ---- Row 3: Summary ----
.article-summary {
  grid-column: 1;
  grid-row: 3;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.65;
  margin: 0;
  min-width: 0;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// ---- Row 4: Stats ----
.article-meta {
  grid-column: 1;
  grid-row: 4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  flex-wrap: nowrap;
}

.article-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.article-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;

  .stat-icon {
    width: 15px;
    height: 15px;
    opacity: 0.65;
  }
}

// ---- Cover: spans rows 2–4 ----
.article-cover {
  grid-column: 2;
  grid-row: 2 / 5;
  border-radius: 10px;
  overflow: hidden;
  height: 100%;
  min-height: 100px;

  @media (max-width: $breakpoint-mobile) {
    grid-column: 1 !important;
    grid-row: auto !important;
    width: 100%;
    height: 180px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .article-row:hover & img {
    transform: scale(1.06);
  }
}
</style>

<!-- Non-scoped highlight styles (required for v-html rendered content) -->
<style lang="scss">
em.highlight {
  font-style: normal;
  font-weight: 600;
  color: var(--color-accent-primary, #6366f1);
  background: linear-gradient(180deg, transparent 60%, rgba(99, 102, 241, 0.2) 60%);
  padding: 0 0.1em;
  border-radius: 2px;
}

// Dark mode highlight
:root[class~="dark"] em.highlight,
:root[data-theme="dark"] em.highlight {
  background: linear-gradient(180deg, transparent 60%, rgba(129, 140, 248, 0.35) 60%);
  color: #a5b4fc;
}
</style>
