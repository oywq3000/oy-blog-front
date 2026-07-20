<script setup lang="ts">
import { useI18n } from 'vue-i18n';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

defineProps<{
  items: BreadcrumbItem[];
}>();

const { t } = useI18n();
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb__list">
      <li class="breadcrumb__item">
        <router-link to="/" class="breadcrumb__link breadcrumb__link--home">
          {{ t('nav.home') }}
        </router-link>
      </li>
      <li
        v-for="(item, index) in items"
        :key="index"
        class="breadcrumb__item"
      >
        <span class="breadcrumb__separator" aria-hidden="true">/</span>
        <router-link
          v-if="item.to"
          :to="item.to"
          class="breadcrumb__link"
        >
          {{ item.label }}
        </router-link>
        <span v-else class="breadcrumb__current" aria-current="page">
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.breadcrumb {
  margin-bottom: $spacing-md;
  padding-top: $spacing-md;

  &__list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__item {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
  }

  &__separator {
    margin: 0 8px;
    color: $color-text-tertiary;
    user-select: none;
  }

  &__link {
    color: $color-text-secondary;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: $color-accent-primary;
    }

    &--home {
      font-weight: 500;
    }
  }

  &__current {
    color: $color-text-primary;
    font-weight: 600;
  }
}
</style>
