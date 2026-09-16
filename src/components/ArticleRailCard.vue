<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { useRouter } from 'vue-router';
import IconUser from './icons/IconUser.vue';
import TagBadge from './TagBadge.vue';

const props = withDefaults(
  defineProps<{
    id: number | string;
    title: string;
    summary?: string;
    image?: string;
    tags?: string[];
    /** 无封面角标胶囊内的图标（如趋势的 trending-up 徽标） */
    artIcon?: Component;
    /** 无封面角标胶囊内的小字标签（如「趋势」「猜你喜欢」） */
    artLabel?: string;
    authorName?: string;
    authorAvatar?: string;
    authorId?: number | string;
    viewCount?: number;
    likeCount?: number;
    readingTimeMinutes?: number;
    /** sm：趋势卡；lg：猜你喜欢卡 */
    size?: 'sm' | 'lg';
  }>(),
  { size: 'sm' }
);

const router = useRouter();

// 有封面：整卡即封面大图，仅底部叠加最小信息（标题 + 浏览/点赞）
// 无封面：整卡渐变底，信息全部直接写在渐变上 —— 两态共用卡高（min-height），高度一致
const showCover = computed(() => !!props.image);
const hasAuthor = computed(() => !!props.authorName);
const hasMeta = computed(
  () =>
    hasAuthor.value ||
    props.viewCount != null ||
    props.likeCount != null ||
    props.readingTimeMinutes != null
);

function goToArticle() {
  router.push({ name: 'article-detail', params: { id: props.id } });
}

function formatCount(n: number | undefined): string {
  if (n == null) return '0';
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(n);
}
</script>

<template>
  <article
    class="rail-card"
    :class="[`rail-card--${size}`, showCover ? 'rail-card--cover' : 'rail-card--flat']"
    @click="goToArticle"
  >
    <!-- 有封面：整卡即封面大图，底部信息带只放必要信息（标题 + 浏览/点赞） -->
    <template v-if="showCover">
      <img class="rail-card__cover" :src="image" :alt="title" loading="lazy" decoding="async" />
      <div class="rail-card__cover-scrim" aria-hidden="true"></div>
      <div class="rail-card__overlay">
        <h3 class="rail-card__title">{{ title }}</h3>
        <div class="rail-card__cover-stats">
          <span v-if="viewCount != null" class="rail-card__cover-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {{ formatCount(viewCount) }}
          </span>
          <span v-if="likeCount != null" class="rail-card__cover-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {{ formatCount(likeCount) }}
          </span>
        </div>
      </div>
    </template>

    <!-- 无封面：整卡渐变底，角标 + 标题/摘要/标签/作者/数据直接写在渐变上 -->
    <div v-else class="rail-card__flat">
      <span v-if="artIcon || artLabel" class="rail-card__art-pill">
        <component :is="artIcon" v-if="artIcon" class="rail-card__art-icon" />
        <span v-if="artLabel" class="rail-card__art-label">{{ artLabel }}</span>
      </span>

      <h3 class="rail-card__title">{{ title }}</h3>

      <p v-if="summary" class="rail-card__summary">{{ summary }}</p>

      <div v-if="tags && tags.length" class="rail-card__tags" @click.stop>
        <TagBadge
          v-for="tag in tags.slice(0, 3)"
          :key="tag"
          :label="tag"
          size="sm"
          variant="text"
        />
      </div>

      <div v-if="hasMeta" class="rail-card__meta">
        <span v-if="hasAuthor" class="rail-card__author">
          <router-link
            v-if="authorId"
            class="rail-card__author-link"
            :to="{ name: 'user-profile', params: { id: authorId } }"
            :aria-label="authorName"
            @click.stop
          >
            <img
              v-if="authorAvatar"
              class="rail-card__author-avatar"
              :src="authorAvatar"
              :alt="authorName"
            />
            <IconUser v-else :size="14" />
            <span class="rail-card__author-name">{{ authorName }}</span>
          </router-link>
          <template v-else>
            <img
              v-if="authorAvatar"
              class="rail-card__author-avatar"
              :src="authorAvatar"
              :alt="authorName"
            />
            <IconUser v-else :size="14" />
            <span class="rail-card__author-name">{{ authorName }}</span>
          </template>
        </span>

        <span class="rail-card__stats">
          <span v-if="viewCount != null" class="rail-card__stat">
            <svg class="rail-card__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {{ formatCount(viewCount) }}
          </span>
          <span v-if="likeCount != null" class="rail-card__stat">
            <svg class="rail-card__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {{ formatCount(likeCount) }}
          </span>
          <span v-if="readingTimeMinutes" class="rail-card__stat">
            <svg class="rail-card__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {{ readingTimeMinutes }}
          </span>
        </span>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

// 竖版整卡：有封面 = 封面大图 + 底部最小信息带；无封面 = 渐变底 + 信息上叠。
// 两种状态共用同一 min-height，保证轨道内卡高一致（不再有「被压成一半」的矮条感）。
.rail-card {
  position: relative;
  flex: 0 0 270px;
  min-height: 230px;
  display: flex;
  flex-direction: column;
  border-radius: $radius-lg;
  overflow: hidden;
  scroll-snap-align: start;
  text-decoration: none;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: $transition-base;

  &--lg {
    flex-basis: 300px;
    min-height: 270px;
  }

  @media (max-width: $breakpoint-mobile) {
    flex-basis: 230px;
    min-height: 200px;

    &--lg {
      flex-basis: 260px;
      min-height: 240px;
    }
  }

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--color-accent-primary-rgb), 0.35);
    box-shadow: var(--color-card-hover-shadow);
  }
}

// ---- 有封面：整卡即封面图，底部信息带在最上层 ----
.rail-card--cover {
  background: var(--color-bg-secondary);

  .rail-card__cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  &:hover .rail-card__cover {
    transform: scale(1.06);
  }

  .rail-card__cover-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.66), transparent 55%);
    pointer-events: none;
  }

  .rail-card__overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 28px 14px 14px;
    color: #fff;
  }

  .rail-card__title {
    color: #fff;
  }

  .rail-card__cover-stats {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }

  .rail-card__cover-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    opacity: 0.92;
    white-space: nowrap;
    font-family: $font-family-code;

    svg {
      width: 14px;
      height: 14px;
    }
  }
}

// ---- 无封面：整卡渐变底，信息直接写在渐变上 ----
.rail-card--flat {
  background:
    radial-gradient(120% 130% at 85% 0%, rgba(var(--color-accent-primary-rgb), 0.2), transparent 55%),
    linear-gradient(180deg, rgba(var(--color-accent-primary-rgb), 0.07), transparent 45%),
    var(--color-card-bg);
}

.rail-card__flat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 14px;
}

// 左上角小胶囊角标：图标 + 短文案，不抢下方信息
.rail-card__art-pill {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: $radius-full;
  background: rgba(var(--color-accent-primary-rgb), 0.12);
  border: 1px solid rgba(var(--color-accent-primary-rgb), 0.28);
  backdrop-filter: blur(4px);
}

.rail-card__art-icon {
  font-size: 0.8rem;
  color: var(--color-accent-primary);
}

.rail-card__art-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-accent-primary);
  white-space: nowrap;
}

.rail-card__title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rail-card__summary {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rail-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

// 元信息行（作者/浏览/点赞/时长）用 margin-top:auto 始终钉在卡片底部：
// 否则「有标签的卡」底部、「没标签的卡」顶部，作者位置随内容漂移不统一
.rail-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.rail-card__author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.rail-card__author-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  text-decoration: none;
  min-width: 0;

  &:hover .rail-card__author-name {
    color: var(--color-accent-primary);
  }
}

.rail-card__author-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.rail-card__author-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-card__stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.rail-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  font-family: $font-family-code;
}

.rail-card__stat-icon {
  width: 13px;
  height: 13px;
  opacity: 0.7;
}
</style>