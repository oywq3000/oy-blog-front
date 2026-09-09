<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import PopularArticleCard from '../components/PopularArticleCard.vue';
import HeroSection from '../components/HeroSection.vue';
import TagCloud from '../components/TagCloud.vue';
import ColumnRail from '../components/ColumnRail.vue';
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

// ---- 最新文章：混合无限滚动（IO 自动加载 + 按钮兜底），追加模式 ----
interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  publishAt: string;
  tags: string[];
  image: string;
  viewCount?: number;
  likeCount?: number;
  favorites?: number;
  readingTimeMinutes?: number;
  authorName?: string;
  authorAvatar?: string;
}

const mapArticle = (a: ArticleInfo): ArticleItem => {
  const publishedAt = a.publishAt || a.createdAt;
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    date: publishedAt,
    publishAt: publishedAt,
    tags: a.tags || [],
    image: a.coverUrl || '',
    viewCount: a.viewCount,
    likeCount: a.likeCount,
    favorites: a.favorites,
    readingTimeMinutes: a.readingTimeMinutes,
    authorName: a.authorName,
    authorAvatar: a.authorAvatar,
  };
};

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

const loadingMore = ref(false); // 加载互斥锁（同时兼 UI 状态）
const loadError = ref(false);   // 仅"加载更多"失败置位；首屏失败不触及
const hasMore = computed(() => latestPage.value < latestTotalPages.value);
const sentinelEl = ref<HTMLElement | null>(null);
let sentinelObserver: IntersectionObserver | null = null;

// 触底加载下一页：双守卫防竞态（loading 互斥 + 页码守卫）
const loadNextPage = async () => {
  if (loadingMore.value || !hasMore.value) return;

  const next = latestPage.value + 1;
  loadingMore.value = true;
  loadError.value = false;
  try {
    const res = await getPublishedArticles(next, LATEST_PAGE_SIZE);
    if (res.isSuccess && res.data) {
      // 追加，非整页替换
      latestArticles.value = [...latestArticles.value, ...res.data.data.map(mapArticle)];
      latestPage.value = res.data.currentPage ?? next;
      latestTotalPages.value = res.data.totalPages ?? 1;
      await nextTick();
      observeElements(); // 观察新追加的 fade-in-up 卡片
    } else {
      loadError.value = true;
    }
  } catch {
    loadError.value = true;
  } finally {
    loadingMore.value = false;
  }
};

// ---- 无限滚动哨兵：默认 root=视口，桌面（窗格内滚）与移动（页面滚）统一覆盖 ----
const onSentinelIntersect = (entries: IntersectionObserverEntry[]) => {
  if (loadError.value) return; // 失败后只允许手动重试
  if (entries.some((e) => e.isIntersecting)) loadNextPage();
};

const connectSentinel = () => {
  disconnectSentinel();
  const el = sentinelEl.value;
  if (!el) return;
  sentinelObserver = new IntersectionObserver(onSentinelIntersect, {
    rootMargin: '0px 0px 80px 0px', // 提前 80px 触发，更顺滑
  });
  sentinelObserver.observe(el);
};

const disconnectSentinel = () => {
  sentinelObserver?.disconnect();
  sentinelObserver = null;
};

// 哨兵随 v-if 状态机出现/消失，模板 ref 变化即重连/断开（模板 ref 必须 post flush）
watch(sentinelEl, (el) => {
  if (el) connectSentinel();
  else disconnectSentinel();
}, { flush: 'post' });

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

// 惰性单例：加载更多追加的新卡片也要入场动画，且不重复 observe 已 visible 节点
let fadeObserver: IntersectionObserver | null = null;
const observeElements = () => {
  if (!fadeObserver) {
    fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  }

  setTimeout(() => {
    const elements = document.querySelectorAll('.fade-in-up:not(.visible)');
    if (elements.length > 0) {
      elements.forEach((el) => fadeObserver!.observe(el));
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

onUnmounted(() => {
  disconnectSentinel();
  fadeObserver?.disconnect();
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

          <!-- 触底：无限滚动哨兵（自动加载）+ 手动按钮兜底（追加模式） -->
          <div v-if="showContent && latestArticles.length" class="load-more" aria-live="polite">
            <template v-if="!loadingMore && !loadError && hasMore">
              <div ref="sentinelEl" class="load-more__sentinel" aria-hidden="true"></div>
              <button class="load-more-btn" type="button" @click="loadNextPage">{{ t('home.loadMore') }}</button>
            </template>
            <div v-else-if="loadingMore" class="load-more__loading" role="status">
              <span class="load-more-spinner" aria-hidden="true"></span>
              <span>{{ t('home.loadingMore') }}</span>
            </div>
            <button v-else-if="loadError" class="load-more-btn load-more__retry" type="button" @click="loadNextPage">{{ t('home.loadMoreFailed') }}</button>
            <div v-else class="load-more__end">{{ t('home.loadedAll') }}</div>
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

      <!-- 页尾：随机专栏横滑区（ColumnRail 自拉数据、无内容不渲染；见 .columns-wrap 样式注释，
           为何它的 sticky 已移除——否则吸顶作用域延伸到页底会把本区块盖住滚不到） -->
      <ColumnRail />
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
  // 高度 = 视口 − 顶部偏移 72px（导航栏 + 呼吸），窗格在内部独立滚动
  height: calc(100dvh - 72px);
  // 注意：原 position: sticky / top: 72px 已移除——吸顶约束随父容器延伸，页尾新增
  // 区块（ColumnRail）后吸顶作用域会一路盖到页底，使该区块永远滚不到
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

// ---- 触底加载区：哨兵 + 加载更多按钮/加载中/重试/已加载全部 ----
.load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding-top: $spacing-lg;
  margin-top: $spacing-lg;
  border-top: 1px solid var(--color-border);
  color: $color-text-secondary;
  font-size: 0.9rem;
}

.load-more__sentinel {
  // 必须非零尺寸：0 尺寸元素永远不 intersect，无限滚动无法触发
  height: 1px;
  width: 100%;
}

.load-more__loading {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.load-more-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent-primary);
  border-radius: 50%;
  animation: load-more-spin 0.7s linear infinite;
}

.load-more-btn {
  padding: 0.4rem 1.2rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  border-radius: $radius-md;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
  }
}

@keyframes load-more-spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: $spacing-xl 0;
  color: $color-text-secondary;
}
</style>
