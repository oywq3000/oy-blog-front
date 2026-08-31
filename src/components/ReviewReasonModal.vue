<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import type { ArticleInfo } from '../api/article';
import { reviewStatusMeta } from '../utils/reviewStatus';

const props = defineProps<{
  /** 要展示审核信息的文章；null 表示关闭 */
  article: ArticleInfo | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const meta = computed(() => {
  if (!props.article) return null;
  return reviewStatusMeta(props.article.reviewStatus, props.article.status);
});

const close = () => emit('close');

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.article) close();
};

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div v-if="article" class="review-modal-overlay" @click.self="close">
      <div
        class="review-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('creator.reviewReasonTitle')"
      >
        <div class="review-modal__header">
          <h3 class="review-modal__title">{{ $t('creator.reviewReasonTitle') }}</h3>
          <button type="button" class="review-modal__close" @click="close">✕</button>
        </div>

        <div class="review-modal__body">
          <div class="review-modal__row">
            <span v-if="meta" :class="['status-badge', `status-badge--${meta.tone}`]">
              {{ meta.label }}
            </span>
            <span class="review-modal__article-title">{{ article.title }}</span>
          </div>

          <div class="review-modal__reason">
            <div class="review-modal__reason-label">{{ $t('creator.reviewReason') }}</div>
            <p class="review-modal__reason-text">
              {{ article.reviewReason || $t('creator.noReviewReason') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.review-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.review-modal {
  background: $color-bg-primary;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: $color-text-primary;
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: $color-text-secondary;
    font-size: 18px;
    cursor: pointer;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: $color-bg-secondary;
      color: $color-text-primary;
    }
  }

  &__body {
    padding: 20px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__article-title {
    font-size: 14px;
    font-weight: 600;
    color: $color-text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__reason {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__reason-label {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-secondary;
  }

  &__reason-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: $color-text-primary;
    background: $color-bg-secondary;
    border-radius: $radius-md;
    padding: 12px 14px;
    word-break: break-word;
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge--info {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}

.status-badge--warning {
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
}

.status-badge--danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
</style>
