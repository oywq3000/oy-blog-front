<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCreatorList } from '../composables/useCreatorList';
import CreatorArticleTable from '../components/CreatorArticleTable.vue';
import CreatorPagination from '../components/CreatorPagination.vue';
import { useCreatorStore } from '../store/creator';

const router = useRouter();
const { refreshDraftCount } = useCreatorStore();
const { articles, currentPage, totalPages, isLoading, load, removeArticle, publishDraft } = useCreatorList('draft');

onMounted(() => {
  load(1);
});

const handleEdit = (id: string) => {
  router.push(`/creator/articles/${id}/edit`);
};

const handleDelete = async (id: string) => {
  if (!window.confirm('确定要删除这篇草稿吗？删除后无法恢复。')) return;
  await removeArticle(id);
};

const handlePublish = async (id: string) => {
  if (!window.confirm('确定要发布这篇草稿吗？')) return;
  const ok = await publishDraft(id);
  if (ok) {
    refreshDraftCount();
  }
};

const handlePageChange = (page: number) => {
  load(page);
};
</script>

<template>
  <div class="drafts-page">
    <CreatorArticleTable
      :articles="articles"
      status="draft"
      :is-loading="isLoading"
      @edit="handleEdit"
      @delete="handleDelete"
      @publish="handlePublish"
    />
    <CreatorPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="handlePageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.drafts-page {
  // Additional styling if needed
}
</style>
