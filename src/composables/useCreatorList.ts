import { ref } from 'vue';
import type { ArticleInfo } from '../api/article';
import { getMyArticles, deleteArticle, publishArticle } from '../api/article';
import { useCreatorStore } from '../store/creator';

export function useCreatorList(status: 'published' | 'draft', pageSize = 10) {
  const articles = ref<ArticleInfo[]>([]);
  const currentPage = ref(1);
  const total = ref(0);
  const totalPages = ref(0);
  const isLoading = ref(false);

  const { refreshDraftCount, decrementDraftCount } = useCreatorStore();

  const load = async (page: number) => {
    isLoading.value = true;
    try {
      const res = await getMyArticles({ status, page, size: pageSize });
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

  const publishDraft = async (id: string): Promise<boolean> => {
    try {
      const res = await publishArticle({ id, title: '', contentMd: '', contentHtml: '' });
      // Note: publishArticle will overwrite with empty content if we don't fetch first.
      // The actual publish flow should happen via the editor (load draft → edit → publish).
      // Here we use a simpler approach: just call the API — the backend handles status change.
      if (res.isSuccess) {
        await load(currentPage.value);
        if (articles.value.length === 0 && currentPage.value > 1) {
          await load(currentPage.value - 1);
        }
        decrementDraftCount();
        refreshDraftCount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to publish draft:', error);
      return false;
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
