import { reactive, computed } from 'vue';
import { getMyArticles } from '../api/article';

const state = reactive({
  draftCount: 0,
});

export const useCreatorStore = () => {
  const refreshDraftCount = async () => {
    try {
      const res = await getMyArticles({ status: 'draft', page: 1, size: 1 });
      if (res.isSuccess && res.data) {
        state.draftCount = res.data.total;
      }
    } catch (error) {
      console.error('Failed to fetch draft count:', error);
    }
  };

  const decrementDraftCount = () => {
    if (state.draftCount > 0) {
      state.draftCount--;
    }
  };

  const draftCount = computed(() => state.draftCount);

  return {
    state,
    draftCount,
    refreshDraftCount,
    decrementDraftCount,
  };
};
