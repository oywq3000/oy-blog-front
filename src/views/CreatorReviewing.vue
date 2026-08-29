<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getMyArticles, deleteArticle, publishArticle } from '../api/article';
import type { ArticleInfo, CreatorArticleStatus } from '../api/article';
import { useCreatorStore } from '../store/creator';
import { useToast } from '../composables/useToast';
import { verdictFeedback } from '../utils/reviewStatus';
import CreatorArticleTable from '../components/CreatorArticleTable.vue';
import CreatorPagination from '../components/CreatorPagination.vue';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const { refreshDraftCount } = useCreatorStore();

const status = ref<CreatorArticleStatus>('ai_reviewing');
const articles = ref<ArticleInfo[]>([]);
const currentPage = ref(1);
const totalPages = ref(0);
const isLoading = ref(false);

const tabs: { value: CreatorArticleStatus; label: string }[] = [
  { value: 'ai_reviewing', label: t('creator.reviewingAi') },
  { value: 'pending_review', label: t('creator.reviewingManual') },
  { value: 'rejected', label: t('creator.reviewingRejected') },
];

async function load(pageNum: number) {
  isLoading.value = true;
  try {
    const res = await getMyArticles({ status: status.value, pageNum, pageSize: 10 });
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

watch(status, () => { currentPage.value = 1; load(1); });

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

const handlePublish = async (id: string) => {
  // 已驳回文章"重新发布"：走 publish 接口重新触发审核
  try {
    const res = await publishArticle({ id, title: '', contentMd: '', contentHtml: '' });
    if (res.isSuccess) {
      const fb = verdictFeedback(res.data?.verdict ?? '', res.data?.reason);
      toast.addToast(fb.text, fb.tone === 'success' ? 'success' : fb.tone === 'error' ? 'error' : 'info');
      refreshDraftCount();
      await load(currentPage.value);
    }
  } catch { /* 拦截器已提示 */ }
};
</script>

<template>
  <div class="reviewing-page">
    <div class="sub-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['sub-tab', { 'sub-tab--active': status === tab.value }]"
        @click="status = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>
    <CreatorArticleTable
      :articles="articles"
      status="reviewing"
      :is-loading="isLoading"
      @edit="handleEdit"
      @delete="handleDelete"
      @publish="handlePublish"
    />
    <CreatorPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="load"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.sub-tab {
  padding: 8px 16px;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: none;
  cursor: pointer;
  color: $color-text-secondary;

  &--active {
    color: $color-accent-primary;
    border-color: $color-accent-primary;
  }
}
</style>
