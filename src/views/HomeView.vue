<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import PopularArticleCard from '../components/PopularArticleCard.vue';
import HeroSection from '../components/HeroSection.vue';
import FeaturedCard from '../components/FeaturedCard.vue';
import TagCloud from '../components/TagCloud.vue';
import { useAppStore } from '../store/app';
import { getPublishedArticles, getUserStats, type ArticleInfo, type UserArticleStats } from '../api/article';
import { OWNER_USER_ID } from '../config/site';

const { t } = useI18n();
const { stopLoading } = useAppStore();
const isFetching = ref(true);

const showContent = computed(() => !isFetching.value);

interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  image: string;
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  readingTimeMinutes?: number;
  authorName?: string;
  authorAvatar?: string;
}

const rawArticles = ref<ArticleInfo[]>([]);
const articles = ref<ArticleItem[]>([]);
const serverStats = ref<UserArticleStats | null>(null);

// ---- 统计条：配置了 OWNER_USER_ID 则优先后端统计，字段缺失时逐项回退到列表聚合 ----
interface HomeStats {
  articleCount: number;
  views: number;
  likes: number;
  tags: number;
}

function aggregateFromList(list: ArticleInfo[]): HomeStats {
  let views = 0;
  let likes = 0;
  const tagSet = new Set<string>();
  for (const a of list) {
    views += a.viewCount ?? 0;
    likes += a.likeCount ?? 0;
    (a.tags ?? []).forEach((tag) => tagSet.add(tag));
  }
  return { articleCount: list.length, views, likes, tags: tagSet.size };
}

const stats = computed<HomeStats | null>(() => {
  if (isFetching.value) return null;
  const agg = aggregateFromList(rawArticles.value);
  if (OWNER_USER_ID.trim() && serverStats.value) {
    return {
      articleCount: serverStats.value.articleCount ?? agg.articleCount,
      views: serverStats.value.viewCount ?? agg.views,
      likes: serverStats.value.likeCount ?? agg.likes,
      // 后端统计无标签数，始终用列表聚合
      tags: agg.tags,
    };
  }
  return agg;
});

// ---- 时间线：按发布年份过滤（后端暂未返回分类，用年份替代）----
const selectedYear = ref<number | ''>('');
const years = computed(() => {
  const set = new Set<number>();
  for (const a of rawArticles.value) {
    const y = new Date(a.publishAt || a.createdAt).getFullYear();
    if (!Number.isNaN(y)) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
});

const filteredArticles = computed(() => {
  if (selectedYear.value === '') return articles.value;
  return articles.value.filter((a) => new Date(a.date).getFullYear() === selectedYear.value);
});

// ---- 最热门：按浏览量降序（同量级按点赞），取前 8；零新请求，从已拉取列表派生 ----
const POPULAR_LIMIT = 8;
const popularArticles = computed(() =>
  [...articles.value]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0) || (b.likeCount ?? 0) - (a.likeCount ?? 0))
    .slice(0, POPULAR_LIMIT)
);

// ---- 精选：置顶优先、日期降序后的第一篇；无文章则为 null（隐藏板块）----
const featured = computed(() => articles.value[0] ?? null);

const observeElements = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  setTimeout(() => {
    const elements = document.querySelectorAll('.fade-in-up');
    if (elements.length > 0) {
      elements.forEach((el) => observer.observe(el));
    }
  }, 100);
};

onMounted(async () => {
  const articlesPromise = getPublishedArticles();
  // 未配置 OWNER_USER_ID 时不发起统计请求
  const statsPromise = OWNER_USER_ID.trim() ? getUserStats(OWNER_USER_ID) : null;

  const [articlesRes, statsRes] = await Promise.allSettled(
    statsPromise ? [articlesPromise, statsPromise] : [articlesPromise]
  );

  if (articlesRes.status === 'fulfilled' && articlesRes.value.isSuccess && articlesRes.value.data) {
    const fetched = articlesRes.value.data;
    rawArticles.value = fetched;

    // Map all articles with full data
    articles.value = fetched.map((a) => {
      return {
        id: a.id,
        title: a.title,
        summary: a.summary,
        date: a.publishAt || a.createdAt,
        tags: a.tags || [],
        image: a.coverUrl || '',
        viewCount: a.viewCount,
        likeCount: a.likeCount,
        favorites: a.favorites,
        readingTimeMinutes: a.readingTimeMinutes,
        authorName: a.authorName,
        authorAvatar: a.authorAvatar,
      };
    });

    // Sort: pinned articles first, then by publish date descending
    articles.value.sort((a, b) => {
      const aIsTop = fetched.find((fa) => fa.id === a.id)?.isTop;
      const bIsTop = fetched.find((fa) => fa.id === b.id)?.isTop;
      if (aIsTop && !bIsTop) return -1;
      if (!aIsTop && bIsTop) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  if (statsRes && statsRes.status === 'fulfilled' && statsRes.value.isSuccess && statsRes.value.data) {
    serverStats.value = statsRes.value.data;
  }

  isFetching.value = false;
  await nextTick();
  // Home 页掌控 loader：内容渲染完毕后关闭（App.vue 保留 5s 兜底）
  stopLoading();
});

watch(showContent, (val) => {
  if (val) {
    nextTick(() => {
      observeElements();
    });
  }
});
</script>

<template>
  <div>
    <!-- 首屏 Hero -->
    <HeroSection :stats="stats" />

    <div class="container home-body">
      <!-- 置顶精选大卡 -->
      <section v-if="showContent && featured" class="featured-section fade-in-up">
        <h2 class="section-title fade-in-up">
          <span class="text-gradient">{{ t('home.featured') }}</span>
        </h2>
        <FeaturedCard v-bind="featured" />
      </section>
      <section v-else-if="!showContent" class="featured-section" aria-hidden="true">
        <div class="featured-skeleton"></div>
      </section>

      <!-- 热门标签云（自取数） -->
      <TagCloud />

      <!-- 双窗格：最新文章 + 最热门文章，两列独立滚动（桌面） -->
      <div class="columns-wrap" id="articles-section">
        <!-- 左窗格：最新文章 -->
        <section class="article-pane" aria-label="最新文章">
          <header class="pane-header">
            <h2 class="pane-title">
              <span class="text-gradient">{{ t('home.latestArticles') }}</span>
            </h2>

            <!-- 年份筛选 -->
            <div v-if="showContent && years.length > 1" class="year-filter" role="group" :aria-label="t('home.years')">
              <button
                class="year-chip"
                :class="{ 'year-chip--active': selectedYear === '' }"
                type="button"
                @click="selectedYear = ''"
              >{{ t('home.allYears') }}</button>
              <button
                v-for="y in years"
                :key="y"
                class="year-chip"
                :class="{ 'year-chip--active': selectedYear === y }"
                type="button"
                @click="selectedYear = y"
              >{{ y }}</button>
            </div>
          </header>

          <div v-if="showContent && filteredArticles.length" class="articles-list">
            <div v-for="article in filteredArticles" :key="article.id" class="fade-in-up">
              <ArticleCard v-bind="article" />
            </div>
          </div>
          <div v-else-if="showContent" class="empty-state">{{ t('home.noArticles') }}</div>
          <!-- Skeleton List -->
          <div v-else class="articles-list" aria-hidden="true">
            <div v-for="i in 5" :key="i" class="skeleton-row">
              <div class="skeleton-line skeleton-line--short"></div>
              <div class="skeleton-line skeleton-line--long"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
            </div>
          </div>
        </section>

        <!-- 右窗格：最热门 -->
        <section class="article-pane" aria-label="最热门文章">
          <header class="pane-header">
            <h2 class="pane-title">
              <span class="text-gradient">{{ t('home.popularArticles') }}</span>
            </h2>
          </header>

          <div v-if="showContent && popularArticles.length" class="popular-list">
            <PopularArticleCard
              v-for="(article, i) in popularArticles"
              :key="article.id"
              :rank="i + 1"
              :id="article.id"
              :title="article.title"
              :date="article.date"
              :view-count="article.viewCount"
              class="fade-in-up"
            />
          </div>
          <div v-else-if="showContent" class="empty-state">{{ t('home.noArticles') }}</div>
          <!-- Skeleton List -->
          <div v-else class="articles-list" aria-hidden="true">
            <div v-for="i in 5" :key="i" class="skeleton-row skeleton-row--compact">
              <div class="skeleton-line skeleton-line--long"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.home-body {
  padding-top: $spacing-xxl;
  padding-bottom: $spacing-xxl;
}

// Skeleton Styles
.skeleton-row {
  padding: $spacing-lg;
  margin-bottom: 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.08);
  animation: pulse 1.5s infinite ease-in-out;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.06);
  }

  &--short { width: 30%; }
  &--long  { width: 70%; }
  &--medium { width: 50%; }
}

.featured-skeleton {
  height: 240px;
  border-radius: $radius-lg;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}

.featured-section {
  margin-bottom: $spacing-xxl;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: $spacing-lg;
  padding-bottom: $spacing-sm;
  border-bottom: 1px dashed $color-border;
  font-weight: 800;
  letter-spacing: -1px;

  @media (max-width: $breakpoint-mobile) {
    font-size: 1.6rem;
  }

  span {
    font-weight: 300;
  }
}

// ---- 双窗格：最新文章 + 最热门，两列独立滚动（桌面）----
.columns-wrap {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: $spacing-lg;
  height: calc(100dvh - 104px);
  position: sticky;
  top: 72px;
  scroll-margin-top: 72px;

  @media (max-width: $breakpoint-desktop) {
    grid-template-columns: 1fr;
    height: auto;
    position: static;
  }
}

.article-pane {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg $spacing-lg;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;

  // Webkit 细滚动条
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: $radius-full;

    &:hover {
      background: var(--color-text-tertiary);
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  @media (max-width: $breakpoint-desktop) {
    overflow-y: visible;
    padding: $spacing-md;
  }
}

// 窗格头部：列表内部滚动时保持可见
.pane-header {
  position: sticky;
  top: -$spacing-md; // 抵消窗格顶部 padding
  z-index: 5;
  background: var(--color-card-bg);
  padding: $spacing-md 0 $spacing-sm;
  margin: 0 0 $spacing-sm;
  border-bottom: 1px dashed $color-border;

  @media (max-width: $breakpoint-desktop) {
    position: static;
  }
}

.pane-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
}

.articles-list {
  display: flex;
  flex-direction: column;
}

.popular-list {
  display: flex;
  flex-direction: column;
}

.skeleton-row--compact {
  gap: 8px;
  padding: $spacing-sm $spacing-sm;
}

// ---- 年份筛选 ----
.year-filter {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  justify-content: center;
  margin-bottom: $spacing-lg;

  @media (max-width: $breakpoint-mobile) {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: $spacing-xs;
  }
}

.year-chip {
  padding: 6px 18px;
  border-radius: $radius-full;
  border: 1px solid var(--color-border);
  background: transparent;
  color: $color-text-secondary;
  font-weight: 600;
  font-size: 0.9rem;
  transition: $transition-base;

  &:hover {
    border-color: $color-accent-primary;
    color: $color-text-primary;
  }

  &--active {
    background: var(--color-accent-primary);
    color: #fff;
    border-color: transparent;

    :global(.dark) & {
      color: #09090b;
    }

    &:hover {
      color: #fff;

      :global(.dark) & {
        color: #09090b;
      }
    }
  }
}

.empty-state {
  text-align: center;
  padding: $spacing-xl 0;
  color: $color-text-secondary;
}
</style>
