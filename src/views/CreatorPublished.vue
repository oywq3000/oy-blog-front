<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCreatorList } from '../composables/useCreatorList';
import CreatorArticleTable from '../components/CreatorArticleTable.vue';
import CreatorPagination from '../components/CreatorPagination.vue';

const router = useRouter();
const { articles, currentPage, totalPages, isLoading, load, removeArticle } = useCreatorList('published');

onMounted(() => {
  load(1);
});

// 有"编辑审核中"的文章时才轮询（旧版展示中，等待审核结果替换生效）
const hasReviewingEdit = computed(() => articles.value.some(a => a.reviewStatus === 'ai_reviewing'));
let timer: ReturnType<typeof setInterval> | null = null;
watch(hasReviewingEdit, (on) => {
  if (timer) { clearInterval(timer); timer = null; }
  if (on) {
    timer = setInterval(() => load(currentPage.value), 15000);
  }
});
onUnmounted(() => { if (timer) clearInterval(timer); });

const handleEdit = (id: string) => {
  router.push(`/creator/articles/${id}/edit`);
};

const handleDelete = async (id: string) => {
  if (!window.confirm('确定要删除这篇文章吗？删除后无法恢复。')) return;
  await removeArticle(id);
};

const handlePageChange = (page: number) => {
  load(page);
};
</script>

<template>
  <div class="published-page">
    <CreatorArticleTable
      :articles="articles"
      status="published"
      :is-loading="isLoading"
      @edit="handleEdit"
      @delete="handleDelete"
    />
    <CreatorPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="handlePageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.published-page {
  // Additional styling if needed
}
</style>
