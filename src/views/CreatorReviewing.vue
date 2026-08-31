<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getMyArticles, deleteArticle } from '../api/article';
import type { ArticleInfo, CreatorArticleStatus } from '../api/article';
import CreatorArticleTable from '../components/CreatorArticleTable.vue';
import CreatorPagination from '../components/CreatorPagination.vue';
import FilterDropdown from '../components/FilterDropdown.vue';

const router = useRouter();
const { t } = useI18n();

const filter = ref<CreatorArticleStatus>('all');
const articles = ref<ArticleInfo[]>([]);
const currentPage = ref(1);
const totalPages = ref(0);
const isLoading = ref(false);

const filterOptions: { value: CreatorArticleStatus; label: string }[] = [
  { value: 'all', label: t('creator.reviewingAll') },
  { value: 'ai_reviewing', label: t('creator.reviewingAi') },
  { value: 'pending_review', label: t('creator.reviewingManual') },
  { value: 'rejected', label: t('creator.reviewingRejected') },
];

async function load(pageNum: number) {
  isLoading.value = true;
  try {
    const res = await getMyArticles({ status: filter.value, pageNum, pageSize: 10 });
    if (res.isSuccess && res.data) {
      articles.value = res.data.data;
      totalPages.value = res.data.totalPages;
      currentPage.value = res.data.currentPage;
    }
  } catch {
    // 拦截器已提示
  } finally {
    isLoading.value = false;
  }
}

watch(filter, () => { currentPage.value = 1; load(1); });

// 15 秒轮询：审核结果异步落库，前端定时刷新状态（仅停留在本页时）
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { load(1); timer = setInterval(() => load(currentPage.value), 15000); });
onUnmounted(() => { if (timer) clearInterval(timer); });

const handleEdit = (id: string) => router.push(`/creator/articles/${id}/edit`);

const handleDelete = async (id: string) => {
  if (!window.confirm('确定要删除这篇文章吗？删除后无法恢复。')) return;
  try {
    const res = await deleteArticle(id);
    if (res.isSuccess) await load(currentPage.value);
  } catch { /* 拦截器已提示 */ }
};
</script>

<template>
  <div class="reviewing-page">
    <CreatorArticleTable
      :articles="articles"
      status="reviewing"
      :is-loading="isLoading"
      @edit="handleEdit"
      @delete="handleDelete"
    >
      <template #statusFilter>
        <FilterDropdown v-model="filter" :options="filterOptions" compact />
      </template>
    </CreatorArticleTable>
    <CreatorPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="load"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
</style>
