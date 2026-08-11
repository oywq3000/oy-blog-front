<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCreatorList } from '../composables/useCreatorList';
import CreatorArticleTable from '../components/CreatorArticleTable.vue';
import CreatorPagination from '../components/CreatorPagination.vue';

const router = useRouter();
const { articles, currentPage, totalPages, isLoading, load, removeArticle } = useCreatorList('published');

onMounted(() => {
  load(1);
});

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
