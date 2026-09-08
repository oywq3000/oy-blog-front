<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ArticleCard from '../components/ArticleCard.vue';
import CreatorPagination from '../components/CreatorPagination.vue';
import { getSeriesDetail, type SeriesDetail } from '../api/article';

const { t } = useI18n();
const route = useRoute();
const detail = ref<SeriesDetail | null>(null);
const isLoading = ref(false);
const pageNum = ref(1);
const pageSize = 10;

async function load() {
  isLoading.value = true;
  try {
    const res = await getSeriesDetail(route.params.id as string, pageNum.value, pageSize);
    detail.value = res.data; // request 返回完整 ResultObject 信封，取 .data
  } finally {
    isLoading.value = false;
  }
}

function onPageChange(p: number) {
  pageNum.value = p;
  load();
  window.scrollTo(0, 0);
}

// ArticleCard 声明了有限 props（image/authorName 等），ArticleInfo 字段名不同（coverUrl），
// 这里显式挑选干净子集传给卡片，避免未声明属性落根节点：
function cardData(a: SeriesDetail['articles'][number]) {
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    publishAt: a.publishAt,
    tags: a.tags,
    image: a.coverUrl,
    authorName: a.authorName,
    authorAvatar: a.authorAvatar,
    authorId: a.authorId,
    viewCount: a.viewCount,
    likeCount: a.likeCount,
    favorites: a.favorites,
    readingTimeMinutes: a.readingTimeMinutes,
  };
}

watch(
  () => route.params.id,
  () => {
    pageNum.value = 1;
    load();
  },
);
onMounted(load);
</script>

<template>
  <div v-if="detail" class="column-detail">
    <header class="column-header">
      <img v-if="detail.coverUrl" :src="detail.coverUrl" class="column-cover" alt="" />
      <div v-else class="column-cover column-cover--placeholder" />
      <div class="column-meta">
        <h1 class="column-name">{{ detail.name }}</h1>
        <p v-if="detail.description" class="column-desc">{{ detail.description }}</p>
      </div>
    </header>
    <p v-if="isLoading" class="empty">{{ t('common.loading') }}</p>
    <template v-else-if="detail.articles.length">
      <ArticleCard v-for="a in detail.articles" :key="a.id" v-bind="cardData(a)" />
      <CreatorPagination
        :current-page="detail.pageNum"
        :total-pages="detail.totalPages"
        @page-change="onPageChange"
      />
    </template>
    <p v-else class="empty">{{ t('editor.columnEmpty') }}</p>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.column-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 100px $spacing-lg $spacing-xxl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.column-header {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  padding: $spacing-lg;
  background: $color-bg-secondary;
  border: 1px solid rgba($color-border, 0.5);
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;

  @media (max-width: $breakpoint-mobile) {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
  }
}

.column-cover {
  flex: 0 0 200px;
  height: 140px;
  border-radius: $radius-md;
  object-fit: cover;
  background: var(--color-bg-secondary);

  @media (max-width: $breakpoint-mobile) {
    flex: none;
    width: 100%;
    height: 160px;
  }
}

.column-cover--placeholder {
  background: linear-gradient(
    135deg,
    rgba(var(--color-accent-primary-rgb), 0.25),
    rgba(var(--color-accent-secondary-rgb), 0.25)
  );
}

.column-meta {
  min-width: 0;
}

.column-name {
  margin: 0 0 $spacing-sm;
  font-size: 1.75rem;
  line-height: 1.3;
  color: $color-text-primary;
}

.column-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.empty {
  margin: 0;
  padding: $spacing-xl 0;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
