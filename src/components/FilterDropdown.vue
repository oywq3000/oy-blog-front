<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

export interface FilterOption {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: FilterOption[];
    placeholder?: string;
    compact?: boolean;
  }>(),
  { placeholder: '', compact: false }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'change': [value: string];
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  const hit = props.options.find((o) => o.value === props.modelValue);
  return hit ? hit.label : props.placeholder;
});

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const select = (value: string) => {
  emit('update:modelValue', value);
  emit('change', value);
  isOpen.value = false;
  triggerRef.value?.focus();
};

const handleClickOutside = (event: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
    triggerRef.value?.focus();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="filter-dropdown" ref="rootRef">
    <button
      ref="triggerRef"
      type="button"
      class="filter-dropdown__trigger"
      :class="[
        'filter-dropdown__trigger',
        { 'filter-dropdown__trigger--open': isOpen, 'filter-dropdown__trigger--compact': compact },
      ]"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggleOpen"
    >
      <span class="filter-dropdown__label">{{ selectedLabel }}</span>
      <span class="filter-dropdown__arrow" :class="{ 'filter-dropdown__arrow--up': isOpen }">▼</span>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="filter-dropdown__menu" role="listbox">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="filter-dropdown__item"
          :class="{ 'filter-dropdown__item--selected': option.value === modelValue }"
          role="option"
          :aria-selected="option.value === modelValue"
          @click="select(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.filter-dropdown {
  position: relative;

  &__trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: none;
    cursor: pointer;
    color: $color-text-secondary;
    font-family: $font-family-main;
    font-size: 0.9rem;
    transition: all 0.2s;

    &:hover,
    &--open {
      color: $color-accent-primary;
      border-color: $color-accent-primary;
    }

    &--compact {
      padding: 4px 10px;
      font-size: 0.8rem;
    }
  }

  &__arrow {
    font-size: 0.7rem;
    transition: transform 0.3s;

    &--up {
      transform: rotate(180deg);
    }
  }

  &__menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 160px;
    background: $color-bg-secondary;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    padding: 6px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 100;
  }

  &__item {
    background: transparent;
    border: none;
    color: $color-text-secondary;
    padding: 8px 12px;
    text-align: left;
    border-radius: $radius-sm;
    cursor: pointer;
    transition: all 0.2s;
    font-family: $font-family-main;
    font-size: 0.9rem;

    &:hover {
      background: rgba($color-accent-primary, 0.1);
      color: $color-accent-primary;
    }

    &--selected {
      color: $color-accent-primary;
      background: rgba($color-accent-primary, 0.08);
    }
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
