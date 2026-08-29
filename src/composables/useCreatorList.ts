import { ref } from 'vue';
import type { ArticleInfo, CreatorArticleStatus } from '../api/article';
import { getMyArticles, deleteArticle, publishArticle } from '../api/article';
import { useCreatorStore } from '../store/creator';

export function useCreatorList(status: CreatorArticleStatus, pageSize = 10) {
  const articles = ref<ArticleInfo[]>([]);
  const currentPage = ref(1);
  const total = ref(0);
  const totalPages = ref(0);
  const isLoading = ref(false);

  const { refreshDraftCount, decrementDraftCount } = useCreatorStore();

  const load = async (pageNum: number) => {
    isLoading.value = true;
    try {
      const res = await getMyArticles({ status, pageNum,pageSize: pageSize });
      if (res.isSuccess && res.data) {
        articles.value = res.data.data;
        total.value = res.data.total;
        currentPage.value = res.data.currentPage;
        totalPages.value = res.data.totalPages;
      }
    } catch (error) {
      console.error(`Failed to load ${status} articles:`, error);
    } finally {
      isLoading.value = false;
    }
  };

  const removeArticle = async (id: string): Promise<boolean> => {
    try {
      const res = await deleteArticle(id);
      if (res.isSuccess) {
        await load(currentPage.value);
        // If page became empty (except page 1), go back one page
        if (articles.value.length === 0 && currentPage.value > 1) {
          await load(currentPage.value - 1);
        }
        refreshDraftCount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete article:', error);
      return false;
    }
  };

  // 发布草稿：返回 ok 与后端 verdict（ai_reviewing/approved/rejected 等），供调用方提示
  const publishDraft = async (id: string, isDraft: boolean): Promise<{ ok: boolean; verdict?: string; reason?: string }> => {
    try {
      const res = await publishArticle({ id, title: '', contentMd: '', contentHtml: '' });
      if (res.isSuccess) {
        await load(currentPage.value);
        if (articles.value.length === 0 && currentPage.value > 1) {
          await load(currentPage.value - 1);
        }
        if (isDraft) {
          decrementDraftCount();
        }
        refreshDraftCount();
        return { ok: true, verdict: res.data?.verdict, reason: res.data?.reason };
      }
      return { ok: false };
    } catch (error) {
      console.error('Failed to publish draft:', error);
      return { ok: false };
    }
  };

  return {
    articles,
    currentPage,
    total,
    totalPages,
    isLoading,
    load,
    removeArticle,
    publishDraft,
  };
}
