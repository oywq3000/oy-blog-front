<script setup lang="ts">
defineProps<{
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  'page-change': [page: number];
}>();
</script>

<template>
  <div class="pagination" v-if="totalPages > 1">
    <button
      class="pagination__btn"
      :disabled="currentPage <= 1"
      @click="emit('page-change', currentPage - 1)"
    >
      ← {{ $t('creator.prev') }}
    </button>

    <span class="pagination__info">
      {{ currentPage }} / {{ totalPages }}
    </span>

    <button
      class="pagination__btn"
      :disabled="currentPage >= totalPages"
      @click="emit('page-change', currentPage + 1)"
    >
      {{ $t('creator.next') }} →
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;
  padding: $spacing-md 0;
  margin-top: $spacing-md;
}

.pagination__btn {
  padding: 8px 16px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-bg-secondary;
  color: $color-text-primary;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: $color-accent-primary;
    color: #fff;
    border-color: $color-accent-primary;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pagination__info {
  font-size: 0.9rem;
  color: $color-text-secondary;
  min-width: 60px;
  text-align: center;
}
</style>
