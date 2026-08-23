<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import PopularArticleCard from '../components/PopularArticleCard.vue';
import HeroSection from '../components/HeroSection.vue';
import TagCloud from '../components/TagCloud.vue';
import { useAppStore } from '../store/app';
import {
  getPublishedArticles,
  getHotArticles,
  getGlobalStats,
  type ArticleInfo,
  type GlobalArticleStats,
} from '../api/article';

const { t } = useI18n();
const { stopLoading } = useAppStore();
const isFetching = ref(true);

const showContent = computed(() => !isFetching.value);

// ---- 最新文章：服务端分页（pageNum/pageSize），直接渲染返回页，不做本地切片 ----
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

const mapArticle = (a: ArticleInfo): ArticleItem => ({
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
});

const LATEST_PAGE_SIZE = 10;
const latestPage = ref(1);
const latestTotalPages = ref(1);
const latestArticles = ref<ArticleItem[]>([]);

const fetchLatest = async (pageNum: number) => {
  const res = await getPublishedArticles(pageNum, LATEST_PAGE_SIZE);
  if (res.isSuccess && res.data) {
    latestArticles.value = res.data.data.map(mapArticle);
    latestPage.value = res.data.currentPage ?? pageNum;
    latestTotalPages.value = res.data.totalPages ?? 1;
  }
};

// ---- 最热门：后端热度权重排序，仅取第 1 页前 8 条，不做本地排序 ----
const HOT_LIMIT = 8;
const hotArticles = ref<ArticleItem[]>([]);

const fetchHot = async () => {
  const res = await getHotArticles(1, HOT_LIMIT);
  if (res.isSuccess && res.data) {
    hotArticles.value = res.data.data.map(mapArticle);
  }
};

// ---- 统计条：全局统计接口直出，不做客户端聚合 ----
const globalStats = ref<GlobalArticleStats | null>(null);

const stats = computed<{ articleCount: number; views: number; likes: number; tags: number } | null>(() => {
  if (isFetching.value) return null;
  const s = globalStats.value;
  return s
    ? { articleCount: s.articleCount, views: s.viewCount, likes: s.likeCount, tags: s.tagCount }
    : { articleCount: 0, views: 0, likes: 0, tags: 0 };
});

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
  // 三接口并行拉取，任一失败不影响其他（失败方显示空态/0 统计）
  const [, , statsRes] = await Promise.allSettled([
    fetchLatest(1),
    fetchHot(),
    getGlobalStats(),
  ]);

  if (statsRes.status === 'fulfilled' && statsRes.value.isSuccess && statsRes.value.data) {
    globalStats.value = statsRes.value.data;
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
      <!-- <section v-if="showContent && featured" class="featured-section fade-in-up">
        <h2 class="section-title fade-in-up">
          <span class="text-gradient">{{ t('home.featured') }}</span>
        </h2>
        <FeaturedCard v-bind="featured" />
      </section>
      <section v-else-if="!showContent" class="featured-section" aria-hidden="true">
        <div class="featured-skeleton"></div>
      </section> -->

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
          </header>

          <div v-if="showContent && latestArticles.length" class="articles-list">
            <div v-for="article in latestArticles" :key="article.id" class="fade-in-up">
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

          <!-- 服务端分页：直接切换请求页码，前端不做本地切片 -->
          <div v-if="showContent && latestTotalPages > 1" class="pagination">
            <button class="page-btn" type="button" :disabled="latestPage <= 1" @click="fetchLatest(latestPage - 1)">&lt;</button>
            <span class="page-info">{{ latestPage }} / {{ latestTotalPages }}</span>
            <button class="page-btn" type="button" :disabled="latestPage >= latestTotalPages" @click="fetchLatest(latestPage + 1)">&gt;</button>
          </div>
        </section>
        <!-- 右窗格：最热门 -->
        <section class="article-pane" aria-label="最热门文章">
          <header class="pane-header">
            <h2 class="pane-title">
              <span class="text-gradient">{{ t('home.popularArticles') }}</span>
            </h2>
          </header>
          <div v-if="showContent && hotArticles.length" class="popular-list">
            <PopularArticleCard
              v-for="(article, i) in hotArticles"
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
  // 关键：让行填满容器高度，否则子项落在 auto 行、高度由内容决定，容器变高时窗格不跟随
  grid-template-rows: minmax(0, 1fr);
  gap: $spacing-lg;
  // 高度 = 视口 − 顶部 sticky 偏移 72px（导航栏 + 呼吸）
  height: calc(100dvh - 72px);
  position: sticky;
  top: 72px;
  scroll-margin-top: 72px;

  @media (max-width: $breakpoint-desktop) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
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
  gap: $spacing-sm;
}

.popular-list {
  display: flex;
  flex-direction: column;
}

.skeleton-row--compact {
  gap: 8px;
  padding: $spacing-sm $spacing-sm;
}

// ---- 服务端分页控件（与 SearchPage 一致）----
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-md;
  padding-top: $spacing-lg;
  border-top: 1px solid var(--color-border);
  margin-top: $spacing-lg;

  .page-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    border-radius: 8px;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: $transition-base;

    &:hover:not(:disabled) {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .page-info {
    font-family: $font-family-code;
    font-size: 0.9rem;
    color: $color-text-secondary;
  }
}

.empty-state {
  text-align: center;
  padding: $spacing-xl 0;
  color: $color-text-secondary;
}
</style>
